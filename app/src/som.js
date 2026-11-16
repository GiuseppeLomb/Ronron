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
// volume: controlo "Volume do Ronron" nas Definições (0-1, por omissão 1). versao: 'atual', 'a1' (altifalante, sopro) ou 'a2' (altifalante, garganta)
export const PREF = { som: LS.get('som', true), vibracao: LS.get('vibracao', true), variante: LS.get('vib-variante', 'A'),
                      volume: LS.get('som-volume', 1), versao: LS.get('som-versao', 'a1') };
const CHAVE = { variante: 'vib-variante', volume: 'som-volume', versao: 'som-versao' };
export function definir(k, v){ PREF[k] = v; LS.set(CHAVE[k] || k, v); if(k === 'som' && !v) pararTudo(); }
export const ficheiro = (n, versao = PREF.versao) => n + (versao === 'atual' ? '' : '-' + versao);

// duração (ms), fade-out (ms) e volume de cada som. Reações a 1.0 (x Volume do Ronron), sem outros multiplicadores.
// Só o repouso (loop de fundo enquanto dorme) toca a 35%, e isso aparece no ecrã de testes.
export const SONS = { curto: { dur: 600, saida: 220, vol: 1 }, medio: { dur: 1650, saida: 450, vol: 1 }, longo: { dur: 3200, saida: 800, vol: 1 },
                      abrir: { dur: 1500, saida: 600, vol: 1 }, repouso: { dur: 6500, saida: 0, vol: .35 } };
const nivel = () => RR.mode === 'desligado' ? 'nada' : RR.mode === 'calmo' ? 'calmo' : RR.night ? 'noite' : 'ativo';

// registo do lado da app (aparece no ecrã de testes)
export const registoJS = [];
export function anotar(t){ registoJS.push(new Date().toLocaleTimeString('pt-PT', { hour12: false }) + '  ' + t); if(registoJS.length > 40) registoJS.shift(); }

// ---------- reações ----------
// 'curto' ~0,6 s (gosto, tocar no Ronron, sair) · 'medio' ~1,6 s · 'longo' ~3,2 s (Quero conhecer) · 'abrir' ~1,5 s (abrir a app)
export function ronronar(tipo = 'curto', { atrasoMs = 0, variante, forcarSom = false } = {}){
  const n = nivel(); if(n === 'nada' && !forcarSom) return;
  const som = (PREF.som && n !== 'calmo') || forcarSom, vib = PREF.vibracao;
  if(!som && !vib) return;
  pararRepouso();
  const s = SONS[tipo], suave = n === 'calmo' || n === 'noite';
  const args = { som: ficheiro(tipo), volume: s.vol * PREF.volume, variante: variante || PREF.variante, env: vib ? ENV[tipo] : [],
                 passoMs: 20, intensidade: suave ? .6 : 1, saidaMs: s.saida };
  const vai = () => {
    if(nativo){
      (som ? Ronron.tocar(args) : Ronron.vibrar(args))
        .then(r => anotar(`${tipo}: ${som ? (r?.tocou ? 'som a tocar' : 'som NÃO tocou') : 'só vibração'}${vib ? ' + vibração ' + args.variante : ''}`))
        .catch(e => anotar(`${tipo}: erro ${e?.message || e}`));
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
  const vol = SONS.repouso.vol * PREF.volume;
  if(nativo) Ronron.tocar({ som: ficheiro('repouso'), volume: vol, loop: true, maxMs: 20000, fadeInMs: 1500 }).then(r => anotar('repouso: ' + (r?.tocou ? 'a tocar' : 'NÃO tocou'))).catch(() => {});
  else web.repouso(ficheiro('repouso'), vol);
  setTimeout(() => { emRepouso = false; }, 22500);
}
export function pararRepouso(){
  if(!emRepouso) return; emRepouso = false;
  if(nativo) Ronron.parar({ som: ficheiro('repouso'), fadeMs: 400, vibracao: false }).catch(() => {}); else web.parar();
}
export function pararTudo(){ emRepouso = false; if(nativo) Ronron.parar({ fadeMs: 150 }).catch(() => {}); else web.parar(); }

addEventListener('pointerdown', () => { pararRepouso(); repousoFeito = false; }, { passive: true, capture: true });
addEventListener('keydown', () => { pararRepouso(); repousoFeito = false; }, { capture: true });
document.addEventListener('visibilitychange', () => { if(document.hidden) pararTudo(); });

// ---------- browser (pré-visualização no PC; no Android usa-se o plugin nativo) ----------
export const web = (() => {
  let ctx = null, loop = null; const bufs = {}, aCarregar = {};
  const contexto = () => { if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); } if(ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; };
  const preparar = n => aCarregar[n] || (aCarregar[n] = (async () => {
    try{ const c = contexto(); bufs[n] = await c.decodeAudioData(await (await fetch(`sons/ronron-${n}.ogg`)).arrayBuffer()); }catch(e){ anotar(`WebView: não descodificou ${n} (${e?.message || e})`); }
  })());
  const tocar = (n, v, emLoop = false) => preparar(n).then(() => {
    const c = contexto(), b = bufs[n]; if(!c || !b) return null;
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; src.loop = emLoop; src.connect(g).connect(c.destination);
    const t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (emLoop ? 1.5 : .02)); src.start(t);
    anotar(`WebView: ${n} vol=${v.toFixed(2)} (contexto ${c.state})`);
    return { parar(f = .3){ try{ const t2 = c.currentTime; g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + f); src.stop(t2 + f + .05); }catch{} } };
  });
  return {
    estado: () => ({ suportado: !!(window.AudioContext || window.webkitAudioContext), contexto: ctx?.state || 'por criar', sons: Object.keys(bufs).length }),
    tocar: (n, v) => tocar(n, v),
    repouso: (n, v) => tocar(n, v, true).then(h => { loop = h; setTimeout(() => { if(loop === h){ h?.parar(2.5); loop = null; } }, 20000); }),
    parar: () => { loop?.parar(.4); loop = null; },
    vibrar: ms => { try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.([Math.min(ms, 400)]); }catch{} },
    toque: () => { try{ if(navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8); }catch{} },
  };
})();
