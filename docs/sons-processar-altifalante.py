# Ronron: sons v3 (versões para altifalante de telemóvel) + bip de diagnóstico.
# "atual" = tratamento anterior (harmónicos 150-700 Hz).  "a1" = sopro, "a2" = garganta: o ritmo real do ronronar
# (pulsação ~25 Hz e respiração ~1,3 s, tirados do som original) aplicado a textura 200 Hz-2 kHz, misturado com o original.
import subprocess, re, json, wave, os
import numpy as np

D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
U = '/root/.claude/uploads/ea0f0d6f-e71a-55a2-af33-c4d6be2ce74b/'
SRC = {'0436': U + '58100109-ANMLCat_Cat_purr_ID_0436_BigSoundBank.com.wav',
       '0981': U + 'f8dbe483-ANMLCat_Cat_purring_2_ID_0981_BigSoundBank.com.wav'}
PROC = '../som2/'           # sinal já tratado pela cadeia anterior (proc0436.wav, proc0981.wav)
SR = 48000
rng = np.random.default_rng(7)

def ff(*a):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *a], capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stderr[-1500:])
    return r.stderr
def medir(f):
    e = ff('-i', f, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-')
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]), float(re.findall(r'Peak:\s+(-?[\d.inf]+) dBFS', e)[-1])
def ler(f, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', f] + (['-af', af] if af else []) + ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32).astype(np.float64)
def gravar(f, x):
    w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
def filtrar(x, af):
    gravar('tmp_in.wav', x / max(1e-9, np.abs(x).max()) * .7); return ler('tmp_in.wav', af)
def suave(x, ms):
    k = max(1, int(ms/1000*SR)); return np.convolve(x, np.ones(k)/k, 'same')

orig = {k: ler(f) for k, f in SRC.items()}
grave = {k: ler(f, 'lowpass=f=120:poles=2,lowpass=f=120:poles=2') for k, f in SRC.items()}   # onde vive a pulsação
proc = {k: ler(PROC + f'proc{k}.wav') for k in SRC}

def pulsacao(k, ini, n):
    """Envolvente fina (pulsos ~25 Hz + respiração) a partir do grave do som original."""
    r = suave(np.abs(grave[k][int(ini*SR):int(ini*SR)+n]), 5)
    return r / max(1e-9, np.percentile(r, 99))
def respiracao(k, ini, n):
    o = orig[k][int(ini*SR):int(ini*SR)+n]; e = np.sqrt(suave(o**2, 60)); return e / max(1e-9, np.percentile(e, 98))

# texturas na gama do altifalante
RUIDO = filtrar(rng.standard_normal(SR*12), 'highpass=f=280:poles=2,highpass=f=280:poles=2,lowpass=f=2200:poles=2,lowpass=f=2200:poles=2,'
                'equalizer=f=520:t=q:w=1.6:g=6,equalizer=f=1150:t=q:w=1.8:g=5,equalizer=f=1800:t=q:w=2:g=2')
def nucleo():   # "garganta": cada pulso do ronronar excita ressonâncias a 450, 900 e 1500 Hz
    t = np.arange(int(0.03*SR))/SR
    return 1.0*np.exp(-t/0.010)*np.sin(2*np.pi*450*t) + 0.7*np.exp(-t/0.008)*np.sin(2*np.pi*900*t) + 0.45*np.exp(-t/0.006)*np.sin(2*np.pi*1500*t)
K = nucleo()

def camada_altifalante(k, ini, n, tipo):
    p = pulsacao(k, ini, n)
    if tipo == 'a1':   # sopro: ruído com formantes, aberto e fechado a cada pulso
        s = RUIDO[:n] * np.power(np.clip(p, 0, 1.5), 2.4)   # pulsos bem marcados: abre e fecha a cada batida
    else:              # garganta: um "clique" ressonante em cada pulso, mais um pouco de sopro
        ps = suave(p, 9); pk = (ps > np.roll(ps, 1)) & (ps >= np.roll(ps, -1)) & (ps > 0.12)
        idx = np.flatnonzero(pk); keep = []; last = -10**9
        for i in idx:                                    # pulsos com pelo menos 28 ms entre si (~25-35 Hz)
            if i - last >= int(0.034*SR): keep.append(i); last = i
        imp = np.zeros(n); imp[keep] = p[keep] * (1 + 0.08*rng.standard_normal(len(keep)))
        s = np.convolve(imp, K)[:n] + 0.35 * RUIDO[:n] * np.power(p, 1.3)
    s = s / max(1e-9, np.sqrt(np.mean(s**2)))
    return s * np.clip(respiracao(k, ini, n), 0, 1.2)    # e respira como o original

def fades(s, fin, fout):
    s = s.copy(); a, b = int(fin*SR), int(fout*SR)
    s[:a] *= np.linspace(0, 1, a)**1.5; s[len(s)-b:] *= np.cos(np.linspace(0, np.pi/2, b))**2; return s

CORTES = {'curto': ('0436', 5.22, 0.60, 0.03, 0.22), 'medio': ('0436', 5.22, 1.65, 0.04, 0.45),
          'longo': ('0436', 4.62, 3.20, 0.12, 0.80), 'abrir': ('0436', 6.55, 1.50, 0.05, 0.60)}

def finalizar(nome, x, alvo):
    gravar(f'c_{nome}.wav', x / max(1e-9, np.abs(x).max()) * .5)
    for teto in [-2.0, -2.4, -2.8, -3.2, -3.6]:          # teto do limitador (dBFS); o Ogg acrescenta picos
        g = alvo + 12.0
        for _ in range(8):                               # só o ganho, até chegar ao volume pretendido
            ff('-i', f'c_{nome}.wav', '-af', f'volume={g:.2f}dB,aresample=192000,alimiter=limit={10**(teto/20):.4f}:attack=1.5:release=40:level=disabled,aresample=48000', '-c:a', 'pcm_s16le', f'n_{nome}.wav')
            ff('-i', f'n_{nome}.wav', '-c:a', 'libvorbis', '-q:a', '4', '-ar', '48000', '-ac', '1', f'ronron-{nome}.ogg')
            i2, tp2 = medir(f'ronron-{nome}.ogg')
            if abs(i2 - alvo) < 0.3: break
            g += (alvo - i2)
        if tp2 <= -1.0: break
    return {'LUFS': round(i2, 1), 'dBTP': round(tp2, 1), 'teto': teto, 'KB': round(os.path.getsize(f'ronron-{nome}.ogg')/1024, 1)}

def saturar_comprimir(x):
    gravar('tmp_sc.wav', x / max(1e-9, np.abs(x).max()) * .5)
    return ler('tmp_sc.wav', 'volume=9dB,asoftclip=type=tanh,volume=-6dB,highpass=f=170:poles=2,highpass=f=170:poles=2,equalizer=f=1000:t=q:w=1.2:g=2,'
               'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=250:knee=6:makeup=1')

res = {}
for nome, (k, ini, dur, fin, fout) in CORTES.items():
    n = int(dur*SR)
    base = proc[k][int(ini*SR):int(ini*SR)+n]; base = base / max(1e-9, np.sqrt(np.mean(base**2)))
    # versão "atual": como antes, mas com o novo corte de abrir; respiração reposta
    resp = respiracao(k, ini, n); g = np.clip(resp / max(1e-9, np.median(resp)), .2, 3) ** 0.9
    res[nome] = finalizar(nome, fades(base * g, fin, fout), -12.0)
    for v in ['a1', 'a2']:
        mix = 0.9 * camada_altifalante(k, ini, n, v) + 0.35 * base * g
        res[f'{nome}-{v}'] = finalizar(f'{nome}-{v}', fades(saturar_comprimir(mix), fin, fout), -10.0)

# repouso (loop sem costura de 6,5 s, a partir do #0981)
t0, L, C = 70.0, 6.5, 1.5; Ln, Cn = int(L*SR), int(C*SR)
def loop(x):
    X = x[:Ln+Cn]; Y = X[Cn:Cn+Ln].copy(); r = np.linspace(0, 1, Cn)
    Y[-Cn:] = X[Ln:Ln+Cn]*np.cos(r*np.pi/2) + X[:Cn]*np.sin(r*np.pi/2); return Y
nn = Ln + Cn; b0 = proc['0981'][int(t0*SR):int(t0*SR)+nn]; b0 = b0 / np.sqrt(np.mean(b0**2))
res['repouso'] = finalizar('repouso', loop(b0), -12.0)
for v in ['a1', 'a2']:
    mix = 0.9 * camada_altifalante('0981', t0, nn, v) + 0.35 * b0
    res[f'repouso-{v}'] = finalizar(f'repouso-{v}', loop(saturar_comprimir(mix)), -10.0)

# bip de diagnóstico: 1 kHz, 0,5 s, pico -3 dBFS
t = np.arange(int(0.5*SR))/SR; bip = 10**(-3/20) * np.sin(2*np.pi*1000*t); bip[:480] *= np.linspace(0, 1, 480); bip[-480:] *= np.linspace(1, 0, 480)
gravar('bip.wav', bip); ff('-i', 'bip.wav', '-c:a', 'libvorbis', '-q:a', '6', 'ronron-bip.ogg')
i, tp = medir('ronron-bip.ogg'); res['bip'] = {'LUFS': round(i, 1), 'dBTP': round(tp, 1)}

# medidas: volume na banda que um altifalante de telemóvel dá bem (>500 Hz); ritmo de pulsação e respiração
def lufs_banda(f):
    ff('-i', f, '-af', 'highpass=f=500:poles=2,highpass=f=500:poles=2', '-c:a', 'pcm_s16le', 'tmp_hp.wav'); return round(medir('tmp_hp.wav')[0], 1)
def ritmo(f):
    x = ler(f, 'highpass=f=300:poles=2'); e = suave(np.abs(x), 4); e = e - e.mean()
    E = np.abs(np.fft.rfft(e * np.hanning(len(e)))); fr = np.fft.rfftfreq(len(e), 1/SR)
    m = (fr > 12) & (fr < 45); pulso = float(fr[m][np.argmax(E[m])])
    p = int(0.1*SR); k = len(x)//p; r = np.sqrt((x[:k*p].reshape(k, p)**2).mean(1)) + 1e-9
    return round(pulso, 1), round(float(20*np.log10(np.percentile(r, 90)/np.percentile(r, 10))), 1)
med = {}
for nome in ['abrir', 'curto', 'longo']:
    for suf in ['', '-a1', '-a2']:
        f = f'ronron-{nome}{suf}.ogg'; pul, resp = ritmo(f)
        med[f'{nome}{suf or "-atual"}'] = {'LUFS_acima_500Hz': lufs_banda(f), 'pulsacao_Hz': pul, 'respiracao_dB': resp}
pul, resp = ritmo(SRC['0436']); med['original_0436'] = {'pulsacao_Hz': pul}
med['bip'] = {'LUFS_acima_500Hz': lufs_banda('ronron-bip.ogg')}

# envolventes para a vibração (respiração, passo 20 ms), a partir da versão "atual"
env = {}
for nome in list(CORTES) + ['repouso']:
    x = ler(f'ronron-{nome}.ogg'); p = int(0.02*SR); k = len(x)//p
    e = np.sqrt((x[:k*p].reshape(k, p)**2).mean(1)); e = np.convolve(np.pad(e, (4, 4), mode='edge'), np.ones(9)/9, 'valid')
    lo, hi = np.percentile(e, 10), np.percentile(e, 95); env[nome] = [round(float(v), 2) for v in np.clip((e - lo)/max(1e-9, hi - lo), 0, 1)]
json.dump(env, open('envolventes.json', 'w'))
print(json.dumps({'ficheiros': res, 'medidas': med}, indent=1))
