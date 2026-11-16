// Ronronar em som e vibração, ao mesmo tempo que a animação do Ronron.
// Som: Web Audio (corta, faz fade e loop sem atrasos; sai pelo volume de multimédia do Android).
// Vibração: Capacitor Haptics, porque o "Light" é um pulso nativo de 50 ms a ~40% da força, o mais suave que o Android dá,
// e o navigator.vibrate não é garantido dentro do WebView nem deixa escolher a intensidade.
// Sons: BigSoundBank #0436 "Cat purr" (reações) e #0981 "Cat purring 2" (repouso), CC0. Ver docs/CREDITOS.md.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { RR } from './ronron.js';
import { LS } from './state.js';

const nativo = Capacitor.isNativePlatform();
export const PREF = { som: LS.get('som', true), vibracao: LS.get('vibracao', true) };
export function definir(k, v){ PREF[k] = v; LS.set(k, v); if(!v && k === 'som') calar(); if(!v && k === 'vibracao') pararVib(); }

const DUR = { curto: 600, medio: 1650, longo: 3200 };            // duração dos cortes (ms)
const GANHO = { reacao: .45, reacaoNoite: .22, repouso: .12, repousoNoite: .06 };
const nivel = () => RR.mode === 'desligado' ? 'nada' : RR.mode === 'calmo' ? 'calmo' : RR.night ? 'noite' : 'ativo';

// ---------- som ----------
let ctx = null, carregado = null; const bufs = {}, ativos = new Set();
function contexto(){
  if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); }
  if(ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
export function preparar(){
  if(carregado) return carregado; const c = contexto(); if(!c) return (carregado = Promise.resolve());
  carregado = Promise.all(['curto', 'medio', 'longo', 'repouso'].map(async n => {
    try{ const r = await fetch(`sons/ronron-${n}.ogg`); bufs[n] = await c.decodeAudioData(await r.arrayBuffer()); }catch{}
  }));
  return carregado;
}
function tocar(n, ganho, loop = false){
  const c = contexto(), b = bufs[n]; if(!c || !b) return null;
  const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; src.loop = loop;
  src.connect(g).connect(c.destination);
  const t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(ganho, t + (loop ? 1.5 : .02)); src.start(t);
  const h = { parar(f = .25){ try{ const t2 = c.currentTime; g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + f); src.stop(t2 + f + .05); }catch{} } };
  src.onended = () => ativos.delete(h); ativos.add(h); return h;
}
function calar(f = .15){ ativos.forEach(h => h.parar(f)); ativos.clear(); repouso = null; clearTimeout(repousoT); }

// ---------- vibração em pulsos, ao ritmo de um ronronar (expira, pausa, inspira, pausa) ----------
let vibT = null;
function pararVib(){ clearTimeout(vibT); vibT = null; }
function pulsar(ms, suave){
  if(!PREF.vibracao) return; pararVib();
  if(!nativo){ try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.(suave ? [20] : [30, 30, 30, 30, 30]); }catch{} return; }
  const passo = suave ? 130 : 62, ciclo = [[560, passo], [120, 0], [420, Math.round(passo * 1.25)], [170, 0]];
  const t0 = performance.now(), fim = t0 + ms; let fase = 0, faseFim = t0 + ciclo[0][0];
  const tick = () => {
    const agora = performance.now(); if(agora >= fim) return pararVib();
    while(agora >= faseFim){ fase = (fase + 1) % ciclo.length; faseFim += ciclo[fase][0]; }
    const p = ciclo[fase][1];
    if(p){ Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); vibT = setTimeout(tick, p); }
    else vibT = setTimeout(tick, faseFim - agora);
  };
  tick();
}

// ---------- o que a app chama ----------
// Ronronar de reação: 'curto' (~0,5 s: gosto, tocar no Ronron, sair), 'medio' (~1,5 s: abrir a app), 'longo' (~3 s: Quero conhecer)
export function ronronar(tipo = 'curto'){
  const n = nivel(); if(n === 'nada') return;
  pararRepouso();
  if(PREF.som && n !== 'calmo') preparar().then(() => tocar(tipo, n === 'noite' ? GANHO.reacaoNoite : GANHO.reacao));
  const suave = n === 'calmo' || n === 'noite';
  pulsar(suave ? Math.min(DUR[tipo], 700) : DUR[tipo], suave);
}
// Passar, desfazer, erro: só um toque leve, sem som
export function toque(){
  if(nivel() === 'nada' || !PREF.vibracao) return;
  if(nativo) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); else try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12); }catch{}
}
// Repouso: loop muito baixo enquanto o Ronron dorme ou espera. No máximo 20 s; para à primeira interação.
let repouso = null, repousoT = null, repousoFeito = false;
export function descansar(){
  const n = nivel(); if(!PREF.som || (n !== 'ativo' && n !== 'noite') || repouso || repousoFeito || document.hidden) return;
  repousoFeito = true;
  preparar().then(() => {
    if(repouso || document.hidden) return;
    repouso = tocar('repouso', n === 'noite' ? GANHO.repousoNoite : GANHO.repouso, true); if(!repouso) return;
    repousoT = setTimeout(() => pararRepouso(2.5), 20000);
  });
}
export function pararRepouso(f = .4){ clearTimeout(repousoT); if(repouso){ repouso.parar(f); repouso = null; } }

['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { pararRepouso(); repousoFeito = false; }, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ calar(.05); pararVib(); ctx?.suspend?.().catch(() => {}); }
  else ctx?.resume?.().catch(() => {});
});
