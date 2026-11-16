# Tratamento dos ronronares para altifalante de telemóvel.
# 1) limpeza  2) harmónicos do grave (saturação suave com assimetria -> 2.º, 3.º, 4.º... harmónicos audíveis)
# 3) realce 150 Hz-3 kHz  4) compressão  5) cortes com fade  6) -12 LUFS / pico real <= -1 dBTP  7) Ogg Vorbis
import subprocess, re, json, wave, os
import numpy as np

D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
U = '/root/.claude/uploads/ea0f0d6f-e71a-55a2-af33-c4d6be2ce74b/'
SRC = {'0436': U + '58100109-ANMLCat_Cat_purr_ID_0436_BigSoundBank.com.wav',
       '0981': U + 'f8dbe483-ANMLCat_Cat_purring_2_ID_0981_BigSoundBank.com.wav'}
ALVO_LUFS, ALVO_TP = -12.0, -1.0

def ff(*a):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *a], capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stderr[-2000:])
    return r.stderr

def medir(f):
    e = ff('-i', f, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-')
    i = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]); tp = float(re.findall(r'Peak:\s+(-?[\d.inf]+) dBFS', e)[-1])
    return i, tp

# 1-4: cadeia completa sobre o ficheiro inteiro
CADEIA = (
  "[0:a]aresample=48000,afftdn=nr=10:nf=-44,asplit=2[g][m];"
  # banda grave -> saturação com assimetria (dcshift) -> fica só com os harmónicos 150 Hz-2 kHz
  "[g]lowpass=f=140:poles=2,lowpass=f=140:poles=2,volume=16dB,dcshift=shift=0.12,asoftclip=type=tanh,"
  "highpass=f=150:poles=2,highpass=f=150:poles=2,lowpass=f=2200:poles=2[h];"
  # sinal principal: mantém algum grave para auscultadores, tira o sub inútil
  "[m]highpass=f=80:poles=2[p];"
  "[p][h]amix=inputs=2:weights='1 0.7':normalize=0,"
  "equalizer=f=300:t=q:w=0.9:g=4,equalizer=f=1000:t=q:w=1.0:g=3,equalizer=f=2500:t=q:w=1.2:g=2,"
  "lowpass=f=7000:poles=2,"
  "acompressor=threshold=-20dB:ratio=2:attack=12:release=350:knee=6:makeup=1.5[o]")
for k, f in SRC.items():
    ff('-i', f, '-filter_complex', CADEIA, '-map', '[o]', '-ac', '1', '-c:a', 'pcm_f32le', f'proc{k}.wav')

def ler(f):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()
def gravar(f, x, sr=48000):
    x16 = np.clip(x, -1, 1); w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((x16 * 32767).astype(np.int16).tobytes()); w.close()

SR = 48000
a, b = ler('proc0436.wav'), ler('proc0981.wav')
ORIG = ler(SRC['0436'])
def envolvente(x, jan=0.05):
    p = int(jan*SR); k = int(np.ceil(len(x)/p)); xx = np.pad(x, (0, k*p-len(x)))
    e = np.sqrt((xx.reshape(k, p)**2).mean(1)) + 1e-6; e = np.convolve(e, np.ones(3)/3, 'same')
    return np.interp(np.arange(len(x)), np.arange(k)*p + p/2, e)
def corte(x, ini, dur, fin, fout, resp=0.0):
    s = x[int(ini*SR):int((ini+dur)*SR)].copy(); n = len(s)
    if resp:   # ganho = (envolvente original / envolvente tratada)^resp: volta a subir e descer como o gato respira
        o = ORIG[int(ini*SR):int(ini*SR)+n]; g = (envolvente(o)/envolvente(s)) ** resp
        g = np.clip(g / np.median(g), 0.2, 3.0); s *= g
    s[:int(fin*SR)] *= np.linspace(0, 1, int(fin*SR)) ** 1.5
    fo = int(fout*SR); s[n-fo:] *= np.cos(np.linspace(0, np.pi/2, fo)) ** 2
    return s
CORTES = {
  'curto':  corte(a, 5.22, 0.60, 0.03, 0.22, resp=1.15),
  'medio':  corte(a, 5.22, 1.65, 0.04, 0.45, resp=1.15),
  'longo':  corte(a, 4.62, 3.20, 0.12, 0.80, resp=1.15),
  'abrir':  corte(a, 6.40, 3.10, 0.10, 1.10, resp=1.15),   # abrir a app: ~3 s, encorpado, fade-out longo
}
# loop de repouso (6,5 s, cruzamento de 1,5 s em potência constante)
t, L, C = 70.0, 6.5, 1.5; s0, Ln, Cn = int(t*SR), int(L*SR), int(C*SR)
X = b[s0:s0+Ln+Cn]; Y = X[Cn:Cn+Ln].copy(); r = np.linspace(0, 1, Cn)
Y[-Cn:] = X[Ln:Ln+Cn]*np.cos(r*np.pi/2) + X[0:Cn]*np.sin(r*np.pi/2)
CORTES['repouso'] = Y

res = {}
for n, x in CORTES.items():
    gravar(f'c_{n}.wav', x / max(1e-9, np.abs(x).max()) * 0.5)
    ganho = 0.0
    for _ in range(7):   # ganho -> limitador com sobreamostragem (pico real) -> medir -> ajustar
        ff('-i', f'c_{n}.wav', '-af', f'volume={ganho:.2f}dB,aresample=192000,alimiter=limit=0.80:attack=1.5:release=40:level=disabled:asc=1,aresample=48000',
           '-c:a', 'pcm_s16le', f'n_{n}.wav')
        i, tp = medir(f'n_{n}.wav')
        if abs(i - ALVO_LUFS) < 0.25 and tp <= -1.4: break
        ganho += (ALVO_LUFS - i) * 1.3
    ff('-i', f'n_{n}.wav', '-c:a', 'libvorbis', '-q:a', '4', '-ar', '48000', '-ac', '1', f'ronron-{n}.ogg')
    i2, tp2 = medir(f'ronron-{n}.ogg')
    res[n] = {'LUFS': round(i2, 1), 'pico_real_dBTP': round(tp2, 1), 'dur_s': round(len(x)/SR, 2), 'KB': round(os.path.getsize(f'ronron-{n}.ogg')/1024, 1)}

# energia acima de 150 Hz (o que o altifalante consegue dar), antes e depois
def fracao_audivel(x):
    X = np.abs(np.fft.rfft(x))**2; f = np.fft.rfftfreq(len(x), 1/SR); return float(X[f >= 150].sum() / X.sum())
orig = ler(SRC['0436'])[int(4.62*SR):int(7.82*SR)]
res['_energia_acima_150Hz'] = {'antes': round(fracao_audivel(orig)*100, 1), 'depois_longo': round(fracao_audivel(CORTES['longo'])*100, 1)}

def lufs_altifalante(f, ganho_db=0.0):
    ff('-i', f, '-af', f'volume={ganho_db}dB,highpass=f=150:poles=2,highpass=f=150:poles=2', '-c:a', 'pcm_s16le', 'tmp_hp.wav'); return medir('tmp_hp.wav')[0]
ANT = '/tmp/claude-0/-home-user-Ronron/ea0f0d6f-e71a-55a2-af33-c4d6be2ce74b/scratchpad/som/'
res['_altifalante_LUFS_acima_150Hz'] = {n: {'antes': round(lufs_altifalante(ANT + f'ronron-{n}.ogg', -6.9 if n != 'repouso' else -18.4), 1), 'agora': round(lufs_altifalante(f'ronron-{n}.ogg'), 1)} for n in ['curto', 'medio', 'longo', 'repouso']}
def respiracao_db(x):   # quanto o volume sobe e desce entre respirações (RMS em janelas de 100 ms, percentis 90/10)
    p = int(0.1*SR); k = len(x)//p; e = np.sqrt((x[:k*p].reshape(k, p)**2).mean(1)) + 1e-9
    return round(float(20*np.log10(np.percentile(e, 90)/np.percentile(e, 10))), 1)
res['_respiracao_dB'] = {'original': respiracao_db(orig), 'agora_longo': respiracao_db(ler('ronron-longo.ogg')), 'agora_abrir': respiracao_db(ler('ronron-abrir.ogg'))}
# envolventes para a vibração (passo 20 ms, 0..1), a partir dos ficheiros finais
env = {}
for n in CORTES:
    x = ler(f'ronron-{n}.ogg'); p = int(0.02*SR); k = len(x)//p
    e = np.sqrt((x[:k*p].reshape(k, p)**2).mean(1)); e = np.convolve(e, np.ones(3)/3, 'same')
    e = (e - e.min()) / max(1e-9, e.max() - e.min()); env[n] = [round(float(v), 2) for v in e]
json.dump(env, open('envolventes.json', 'w'))
print(json.dumps(res, indent=1))
