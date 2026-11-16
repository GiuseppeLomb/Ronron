# Ronron: cadeia de áudio LIMPA (v4). Sem saturação nem harmónicos artificiais.
# Ronronar real -> redução de ruído leve -> EQ suave para altifalante -> compressão moderada -> cortes com fade
# -> -14 LUFS, pico real <= -1 dBTP, zero clipping (limitador só como segurança, ganho de redução medido) -> Ogg Vorbis q5.
import subprocess, re, json, wave, os
import numpy as np

D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
U = '/root/.claude/uploads/ea0f0d6f-e71a-55a2-af33-c4d6be2ce74b/'
SRC = {'0436': U + '58100109-ANMLCat_Cat_purr_ID_0436_BigSoundBank.com.wav',
       '0981': U + 'f8dbe483-ANMLCat_Cat_purring_2_ID_0981_BigSoundBank.com.wav'}
SR, ALVO, TETO = 48000, -14.0, -1.0

EQ = ('highpass=f=60:poles=2,'                    # só o grave que nenhum altifalante de telemóvel reproduz
      'bass=g=-3:f=110:w=0.7,'                    # menos grave, mais margem (suave)
      'equalizer=f=500:t=q:w=1.0:g=2.5,'          # corpo audível no altifalante
      'equalizer=f=1800:t=q:w=1.0:g=3,'           # textura do ronronar
      'lowpass=f=9000:poles=2')
LIMPA = 'aresample=48000,afftdn=nr=8:nf=-48,' + EQ + ',acompressor=threshold=-28dB:ratio=3:attack=3:release=200:knee=8:makeup=1'

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
def gravar(f, x, bits=24):
    if bits == 24:
        ff_in = np.clip(x, -1, 1).astype(np.float32).tobytes()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', f], input=ff_in, check=True)
    else:
        w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1)*32767).astype(np.int16).tobytes()); w.close()

# 1) cadeia limpa sobre os ficheiros inteiros, e uma referência só com filtros lineares (para medir distorção)
for k, f in SRC.items():
    ff('-i', f, '-af', LIMPA, '-ac', '1', '-c:a', 'pcm_f32le', f'limpo{k}.wav')
    ff('-i', f, '-af', 'aresample=48000,' + EQ, '-ac', '1', '-c:a', 'pcm_f32le', f'linear{k}.wav')
limpo = {k: ler(f'limpo{k}.wav') for k in SRC}; linear = {k: ler(f'linear{k}.wav') for k in SRC}

def fades(s, fin, fout):
    s = s.copy(); a, b = int(fin*SR), int(fout*SR)
    s[:a] *= np.linspace(0, 1, a)**1.5; s[len(s)-b:] *= np.cos(np.linspace(0, np.pi/2, b))**2; return s
def cortar(x, ini, dur): return x[int(ini*SR):int(ini*SR)+int(dur*SR)].copy()
CORTES = {'curto': (5.22, 0.60, 0.03, 0.22), 'medio': (5.22, 1.65, 0.04, 0.45),
          'longo': (4.62, 3.20, 0.12, 0.80), 'abrir': (6.55, 1.50, 0.05, 0.60)}
t0, L, C = 70.0, 6.5, 1.5; Ln, Cn = int(L*SR), int(C*SR)
def loop(x):
    X = x[:Ln+Cn]; Y = X[Cn:Cn+Ln].copy(); r = np.linspace(0, 1, Cn)
    Y[-Cn:] = X[Ln:Ln+Cn]*np.cos(r*np.pi/2) + X[:Cn]*np.sin(r*np.pi/2); return Y

clips = {n: fades(cortar(limpo['0436'], a, b), c, d) for n, (a, b, c, d) in CORTES.items()}
refs  = {n: fades(cortar(linear['0436'], a, b), c, d) for n, (a, b, c, d) in CORTES.items()}
clips['repouso'] = loop(limpo['0981'][int(t0*SR):]); refs['repouso'] = loop(linear['0981'][int(t0*SR):])

def finalizar(n, x):
    # ganho para ~-16 LUFS antes do limitador; limitador lento (12 ms de antecipação, 400 ms de recuperação) só nos pulsos mais fortes;
    # teto -1,3 dBFS medido a 192 kHz (pico real); FLAC 16 bits (sem perdas: o codec não acrescenta nada)
    gravar(f'c_{n}.wav', x)
    i0, tp0 = medir(f'c_{n}.wav'); g = -16.0 - i0; teto = -1.3
    ff('-i', f'c_{n}.wav', '-af', f'volume={g:.3f}dB,aresample=192000,alimiter=limit={10**(teto/20):.4f}:attack=12:release=400:level=disabled,aresample=48000:dither_method=triangular',
       '-c:a', 'flac', '-sample_fmt', 's16', f'ronron-{n}.flac')
    reducao = max(0.0, (tp0 + g) - teto)
    y = ler(f'ronron-{n}.flac'); i2, tp2 = medir(f'ronron-{n}.flac'); pico = float(np.abs(y).max())
    return y, {'LUFS': round(i2, 1), 'pico_real_dBTP': round(tp2, 1), 'pico_amostra_dBFS': round(20*np.log10(pico), 1),
               'amostras_em_clipping': int((np.abs(y) >= 0.999).sum()), 'limitador_cortou_no_maximo_dB': round(reducao, 1),
               'KB': round(os.path.getsize(f'ronron-{n}.flac')/1024, 1)}

def alinhar(y, ref):
    m = 1440; n = min(len(y), len(ref)) - m
    c = [float(y[l:l+n] @ ref[:n]) for l in range(0, m)]; l = int(np.argmax(c)); return y[l:l+n], ref[:n], l
def analise(y, ref, orig):
    # distorção não linear acrescentada pelo limitador e pelo Ogg: resíduo face ao som antes deles (alinhado; ganho ótimo por janelas de 100 ms)
    y, ref, atraso = alinhar(y, ref); n = len(y); p = int(0.1*SR); k = n//p; res = 0.0; tot = 0.0
    for j in range(k):
        a, b = y[j*p:(j+1)*p], ref[j*p:(j+1)*p]
        g = float(a @ b / max(1e-12, b @ b)); res += float(((a - g*b)**2).sum()); tot += float((a**2).sum())
    def hf(x):   # energia acima de 4 kHz relativa ao total (a saturação aumenta-a)
        X = np.abs(np.fft.rfft(x))**2; f = np.fft.rfftfreq(len(x), 1/SR); return 10*np.log10(X[f > 4000].sum() / X.sum())
    return {'residuo_nao_linear_dB': round(10*np.log10(max(1e-12, res/tot)), 1), 'energia_>4kHz_dB': round(hf(y), 1), 'original_>4kHz_dB': round(hf(orig[:n]), 1)}

res = {}; ORIG = {n: cortar(ler(SRC['0436']), a, b) for n, (a, b, _, _) in CORTES.items()}
ORIG['repouso'] = ler(SRC['0981'])[int(t0*SR)+Cn:int(t0*SR)+Cn+Ln]
for n, x in clips.items():
    y, r = finalizar(n, x); r.update(analise(y, ler(f'c_{n}.wav'), ORIG[n])); res[n] = r

# comparação com a versão que distorcia (a1, que vinha escolhida por omissão)
A1 = '/home/user/Ronron/app/public/sons/ronron-abrir-a1.ogg'
if os.path.exists(A1):
    ya1 = ler(A1); res['_antes_abrir_a1'] = {'energia_>4kHz_dB': analise(ya1, refs['abrir'], ORIG['abrir'])['energia_>4kHz_dB'],
        'amostras_em_clipping': int((np.abs(ya1) >= 0.999).sum()), 'pico_amostra_dBFS': round(20*np.log10(float(np.abs(ya1).max())), 1)}

# envolventes da respiração para a vibração (passo 20 ms)
env = {}
for n in res:
    if n.startswith('_'): continue
    x = ler(f'ronron-{n}.flac'); p = int(0.02*SR); k = len(x)//p
    e = np.sqrt((x[:k*p].reshape(k, p)**2).mean(1)); e = np.convolve(np.pad(e, (4, 4), mode='edge'), np.ones(9)/9, 'valid')
    lo, hi = np.percentile(e, 10), np.percentile(e, 95); env[n] = [round(float(v), 2) for v in np.clip((e - lo)/max(1e-9, hi - lo), 0, 1)]
json.dump(env, open('envolventes.json', 'w'))
print(json.dumps(res, indent=1, ensure_ascii=False))
