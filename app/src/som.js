// Ronronar em som e vibração, sincronizado com a animação do Ronron.
// No Android: plugin nativo próprio (android/.../RonronPlugin.kt): som pelo canal de multimédia (SoundPool) e vibração
// com amplitude controlada, arrancados na mesma instrução nativa. No browser: Web Audio + navigator.vibrate (só para pré-visualizar).
// Sons: BigSoundBank #0436 "Cat purr" (reações) e #0981 "Cat purring 2" (repouso), CC0. Ver docs/CREDITOS.md.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { RR } from './ronron.js';
import { LS } from './state.js';
import ENV from './envolventes.json';
export { ENV };

export const nativo = Capacitor.isNativePlatform();
export const Ronron = nativo ? registerPlugin('Ronron') : null;
export const PREF = { som: LS.get('som', true), vibracao: LS.get('vibracao', true), variante: LS.get('vib-variante', 'A') };
export function definir(k, v){ PREF[k] = v; LS.set(k === 'variante' ? 'vib-variante' : k, v); if(k === 'som' && !v) pararTudo(); }
// Ganho total = ficheiro (pico real -1,3 dBTP) x volume da app (1.0 Ativo, 0.5 Calmo) x plugin (limitado a 1.0): nunca passa de 1.0.
export const VOLUME_MODO = { ativo: 1, noite: 1, calmo: 0.5 };

// duração (ms), fade-out (ms) e volume de cada som (ficheiros FLAC a ~-16,5 LUFS, pico real -1,3 dBTP).
// Reações a 1.0; o repouso (loop de fundo enquanto dorme, só no modo Ativo) a 35%.
export const SONS = { curto: { dur: 600, saida: 220, vol: 1 }, medio: { dur: 1650, saida: 450, vol: 1 }, longo: { dur: 3200, saida: 800, vol: 1 },
                      abrir: { dur: 1500, saida: 600, vol: 1 }, repouso: { dur: 6500, saida: 0, vol: .35 } };
const nivel = () => RR.mode === 'desligado' ? 'nada' : RR.mode === 'calmo' ? 'calmo' : RR.night ? 'noite' : 'ativo';

// ---------- reações ----------
// 'curto' ~0,6 s (gosto, tocar no Ronron, sair) · 'medio' ~1,6 s · 'longo' ~3,2 s (Quero conhecer) · 'abrir' ~1,5 s (abrir a app)
export function ronronar(tipo = 'curto', { atrasoMs = 0, variante, forcarSom = false } = {}){
  const n = nivel(); if(n === 'nada' && !forcarSom) return;
  const som = PREF.som || forcarSom, vib = PREF.vibracao;   // o mesmo som em Ativo e Calmo; só muda a intensidade
  if(!som && !vib) return;
  pararRepouso();
  const s = SONS[tipo];
  const args = { som: tipo, volume: Math.min(1, s.vol * (VOLUME_MODO[n] ?? 1)), variante: variante || PREF.variante, env: vib ? ENV[tipo] : [],
                 passoMs: 20, intensidade: n === 'calmo' ? .6 : n === 'noite' ? .75 : 1, saidaMs: s.saida };
  const vai = () => {
    if(nativo){
      (som ? Ronron.tocar(args) : Ronron.vibrar(args)).catch(() => {});
    } else { if(som) web.tocar(args.som, args.volume); if(vib) web.vibrar(s.dur); }
  };
  atrasoMs ? setTimeout(vai, atrasoMs) : vai();
}

// ---------- toque único muito leve (passar, desfazer, erro, interruptores) ----------
export function toque(forca = 'leve'){
  if(nivel() === 'nada' || !PREF.vibracao) return;
  if(nativo) Ronron.toque({ forca }).catch(() => {}); else web.toque();
}

// ---------- repouso: loop muito baixo enquanto o Ronron dorme ou espera; máximo 20 s; para à primeira interação ----------
let emRepouso = false, repousoFeito = false;
export function descansar(){
  const n = nivel(); if(!PREF.som || (n !== 'ativo' && n !== 'noite') || emRepouso || repousoFeito || document.hidden) return;
  repousoFeito = true; emRepouso = true;
  const vol = SONS.repouso.vol;
  if(nativo) Ronron.tocar({ som: 'repouso', volume: vol, loop: true, maxMs: 20000, fadeInMs: 1500 }).catch(() => {});
  else web.repouso('repouso', vol);
  setTimeout(() => { emRepouso = false; }, 22500);
}
export function pararRepouso(){
  if(!emRepouso) return; emRepouso = false;
  if(nativo) Ronron.parar({ som: 'repouso', fadeMs: 400, vibracao: false }).catch(() => {}); else web.parar();
}
export function pararTudo(){ emRepouso = false; if(nativo) Ronron.parar({ fadeMs: 150 }).catch(() => {}); else web.parar(); }

addEventListener('pointerdown', () => { pararRepouso(); repousoFeito = false; }, { passive: true, capture: true });
addEventListener('keydown', () => { pararRepouso(); repousoFeito = false; }, { capture: true });
document.addEventListener('visibilitychange', () => { if(document.hidden) pararTudo(); });

// ---------- browser (só para pré-visualizar no PC; no Android usa-se o plugin nativo) ----------
export const web = (() => {
  let ctx = null, loop = null; const bufs = {}, aCarregar = {};
  const contexto = () => { if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); } if(ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; };
  const preparar = n => aCarregar[n] || (aCarregar[n] = (async () => {
    try{ const c = contexto(); bufs[n] = await c.decodeAudioData(await (await fetch(`sons/ronron-${n}.flac`)).arrayBuffer()); }catch{}
  })());
  const tocar = (n, v, emLoop = false) => preparar(n).then(() => {
    const c = contexto(), b = bufs[n]; if(!c || !b) return null;
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; src.loop = emLoop; src.connect(g).connect(c.destination);
    const t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (emLoop ? 1.5 : .02)); src.start(t);
    return { parar(f = .3){ try{ const t2 = c.currentTime; g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + f); src.stop(t2 + f + .05); }catch{} } };
  });
  return {
    tocar: (n, v) => tocar(n, v),
    repouso: (n, v) => tocar(n, v, true).then(h => { loop = h; setTimeout(() => { if(loop === h){ h?.parar(2.5); loop = null; } }, 20000); }),
    parar: () => { loop?.parar(.4); loop = null; },
    vibrar: ms => { try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.([Math.min(ms, 400)]); }catch{} },
    toque: () => { try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8); }catch{} },
  };
})();
