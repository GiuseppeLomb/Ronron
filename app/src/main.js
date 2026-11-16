// Ronron: arranque, rotas, tema, Ronron no cabeçalho, rede e recursos nativos
import './base.css';
import './app.css';
import { $, $$, go, wait, toast, nativo, reduce } from './ui.js';
import { icon } from './icons.js';
import { makeRonron, RR, rrMode } from './ronron.js';
import * as api from './api.js';
import { S, LS } from './state.js';
import { ronronar, descansar } from './som.js';
import { renderFeed, fecharFicha, fecharMeet, badgeFavs } from './feed.js';
import { renderFavs, renderConta, renderMeus, renderPublicar, renderAdmin, renderAjuda, renderDefinicoes, renderApoiar, renderBoasVindas, renderSobre } from './ecras.js';

export let hdr;

// ---------- tema: claro, escuro ou automático ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
export function aplicarTema(){
  const escuro = S.tema === 'escuro' || (S.tema === 'auto' && mq.matches);
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = escuro ? '#141A1D' : '#F7F1E8';
  if(nativo) import('@capacitor/status-bar').then(({ StatusBar, Style }) => { StatusBar.setStyle({ style: escuro ? Style.Dark : Style.Light }).catch(() => {}); StatusBar.setBackgroundColor?.({ color: escuro ? '#141A1D' : '#F7F1E8' }).catch?.(() => {}); }).catch(() => {});
}
mq.addEventListener('change', aplicarTema);

// ---------- Ronron: modo e noite ----------
export function definirModo(m){ RR.mode = m; LS.set('rr-modo', m); aplicarModo(); }
function aplicarModo(){ const mm = rrMode(); RR.all.forEach(a => { if(!a.el.isConnected){ RR.all.delete(a); return; } a.el.classList.toggle('rr-calm', mm === 'calm'); a.el.classList.toggle('rr-off', mm === 'off'); if(mm === 'off') a.pose(a.base); }); }

// ---------- sessão ----------
export async function carregarMe(){
  const { data: { session } } = await api.sb.auth.getSession();
  if(!session){ S.me = null; return nav(); }
  try{ S.me = { user: session.user, perfil: await api.meuPerfil() }; }catch{ S.me = { user: session.user, perfil: null }; }
  nav();
}
api.sb.auth.onAuthStateChange((ev) => { if(ev === 'SIGNED_OUT'){ S.me = null; nav(); } });

// ---------- navegação ----------
const TABS = [['feed', 'Gatos', 'cat'], ['favoritos', 'Favoritos', 'heart'], ['meus', 'Os meus', 'house-line'], ['conta', 'Conta', 'user-circle']];
function nav(){
  const html = TABS.map(([r, t, ic]) => `<a class="tab" href="#${r}" data-r="${r}">${icon(ic)}${t}${r === 'favoritos' ? `<span class="badge fav-badge" ${S.favs.length ? '' : 'hidden'}>${S.favs.length}</span>` : ''}</a>`).join('');
  $('#nav-top').innerHTML = html; $('#nav-bottom').innerHTML = html; marcar();
}
function marcar(){ const r = (location.hash.slice(1) || 'feed').split('-')[0]; const base = ['publicar', 'editar'].includes(r) ? 'meus' : ['admin', 'definicoes', 'ajuda', 'apoiar', 'sobre', 'boas-vindas'].includes(r) ? 'conta' : r;
  $$('.tab').forEach(t => t.toggleAttribute('aria-current', t.dataset.r === base)); $$('.tab[aria-current]').forEach(t => t.setAttribute('aria-current', 'page')); }
export function rotear(r){ if(location.hash.slice(1) === r) render(); else location.hash = r; }
async function render(){
  const r = location.hash.slice(1) || 'feed', view = $('#view');
  $('#sheet').hidden = true; $('#meet').hidden = true; $('#celebra').hidden = true; marcar();
  go(view, { opacity: [0, 1] }, { duration: .25 });
  // primeiro login por concluir (contas Google): só deixa ver as regras e as definições
  if(S.me?.perfil?.perfil_completo === false && !['boas-vindas', 'ajuda', 'definicoes', 'sobre'].includes(r)) return rotear('boas-vindas');
  if(r === 'boas-vindas') return renderBoasVindas(view);
  if(r === 'feed') return renderFeed(view);
  if(r === 'favoritos') return renderFavs(view);
  if(r === 'conta') return renderConta(view);
  if(r === 'meus') return renderMeus(view);
  if(r === 'publicar') return renderPublicar(view);
  if(r.startsWith('editar-')) return renderPublicar(view, r.slice(7));
  if(r === 'admin') return renderAdmin(view);
  if(r === 'ajuda') return renderAjuda(view);
  if(r === 'definicoes') return renderDefinicoes(view);
  if(r === 'apoiar') return renderApoiar(view);
  if(r === 'sobre') return renderSobre(view);
  rotear('feed');
}
addEventListener('hashchange', render);

// ---------- Ronron no cabeçalho: inatividade, noite, cursor ----------
let lastAct = Date.now(), rested = false, yawned = false;
function setupRonron(){
  RR.mode = LS.get('rr-modo', 'ativo');
  hdr = makeRonron($('#logo-rr'), { size: 46, pose: 'logo', base: 'logo', bubble: $('#logo-bubble') });
  $('.logo').addEventListener('pointerenter', e => { if(e.pointerType === 'mouse' && rrMode() !== 'off') hdr.react('ronronar'); });
  $('.logo').addEventListener('click', () => { if(rrMode() === 'off') return; hdr.react('ronronar'); ronronar('curto'); if(location.hash.slice(1) === 'feed' || !location.hash) hdr.say('Olá!', 1200); });
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); rested = false; if(yawned){ yawned = false; if(hdr.current() === 'dormir') hdr.pose('logo'); } }, { passive: true }));
  setInterval(() => {
    if(rrMode() === 'off' || document.hidden) return;
    const idle = (Date.now() - lastAct) / 1000, n = RR.night;
    // só no Ativo: no Calmo há menos reações espontâneas
    if(!rested && rrMode() === 'on' && idle > 25 && hdr.current() === 'logo'){ rested = true; hdr.seq([['gente', 1400], ['beijinho', 900], ['coçar', 1300], ['curioso', 600]], 'logo'); }
    if(!yawned && idle > (n ? 20 : 45) && hdr.current() === 'logo'){ yawned = true; hdr.seq([['gente', 600], ['bocejar', 1200], ['beijinho', 600]], 'logo'); }
    if(yawned && idle > (n ? 40 : 90) && hdr.current() === 'logo'){ hdr.pose('dormir'); descansar(); }
  }, 4000);
  RR.night = (h => h >= 22 || h < 7)(new Date().getHours());
  aplicarModo();
}

// ---------- abrir a app: o Ronron acena enquanto ronrona ~1,5 s ----------
// o ronronar (~1,5 s) começa com o aceno
function abrirApp(){ if(rrMode() === 'off') return; hdr.seq([['espreitar', 300], ['acenar', 1100], ['feliz', 500]], 'logo'); ronronar('abrir', { atrasoMs: 300 }); }

// ---------- entrada: o Ronron nasce do logo, espreguiça-se e acena ----------
async function intro(){
  if(rrMode() === 'off' || reduce() || LS.get('intro-hoje', '') === new Date().toDateString()) return;
  LS.set('intro-hoje', new Date().toDateString());
  const ov = document.createElement('div'); ov.className = 'celebra'; ov.style.background = 'var(--bg)';
  ov.innerHTML = `<div style="display:grid;justify-items:center;gap:12px"><span class="rr-bubble" id="intro-b" style="position:relative;transform-origin:50% 100%"></span><span id="intro-rr"></span></div>`;
  $('#app').appendChild(ov);
  const big = makeRonron($('#intro-rr'), { size: 200, pose: 'logo', base: 'gente', bubble: $('#intro-b') });
  big.react('abrir'); ronronar('abrir', { atrasoMs: 2150 });   // na entrada grande o aceno começa aos 2,15 s setTimeout(() => big.say('Olá! Encontrei-te uns amigos.', 1800), 2100);
  await wait(3900);
  const from = $('#intro-rr').getBoundingClientRect(), to = $('#logo-rr').getBoundingClientRect();
  big.pose('logo');
  await go($('#intro-rr'), { x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2), scale: to.width / from.width * 1.1 }, { duration: .7, ease: [.6, 0, .2, 1] }).finished;
  RR.all.delete(big); go(ov, { opacity: [1, 0] }, { duration: .3 }).finished.then(() => ov.remove());
  hdr.seq([['feliz', 600]], 'logo');
}

// ---------- rede (offline) ----------
async function rede(){
  const mostra = on => { S.online = on; const o = $('#offline'); o.hidden = on;
    if(!on && !$('#offline .rr')) makeRonron($('#offline-rr'), { size: 44, pose: 'novelo', base: 'novelo' }); };
  if(nativo){ const { Network } = await import('@capacitor/network'); const st = await Network.getStatus(); mostra(st.connected); Network.addListener('networkStatusChange', s => { const era = S.online; mostra(s.connected); if(s.connected && !era){ toast('Voltou a ligação', 'check'); render(); } }); }
  else { mostra(navigator.onLine); addEventListener('online', () => { mostra(true); render(); }); addEventListener('offline', () => mostra(false)); }
}

// ---------- notificação local: um gato teu foi aprovado ----------
async function verificarAprovados(){
  if(!nativo || !S.me || S.me.perfil?.role !== 'protetor') return;
  try{
    const lista = await api.meusGatos(S.me.user.id), antes = LS.get('aprovados', null), agora = lista.filter(a => a.approved).map(a => a.id);
    LS.set('aprovados', agora); if(antes === null) return;
    const novos = lista.filter(a => a.approved && !antes.includes(a.id)); if(!novos.length) return;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({ notifications: novos.map((a, i) => ({ id: Date.now() % 100000 + i, title: 'Já está no Ronron', body: `${a.name} foi aprovad${a.sex === 'femea' ? 'a' : 'o'} e já aparece a quem procura um gato.` })) });
  }catch{}
}

// ---------- botão "voltar" do Android ----------
async function nativos(){
  if(!nativo) return;
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    const bs = $$('.bsheet'); if(bs.length){ bs.at(-1).click(); return; }
    if(!$('#celebra').hidden){ $('#celebra').hidden = true; return; }
    if(!$('#meet').hidden) return fecharMeet();
    if(!$('#sheet').hidden) return fecharFicha();
    if(location.hash && location.hash !== '#feed') return history.back();
    // sair: um ronronar curto antes de a app ir para segundo plano
    if(rrMode() !== 'off'){ hdr.react('ronronar'); ronronar('curto'); setTimeout(() => App.minimizeApp(), 520); } else App.minimizeApp();
  });
  // ronronar forte ao voltar à app depois de mais de 30 minutos em segundo plano
  App.addListener('pause', () => LS.set('pausa', Date.now()));
  App.addListener('resume', () => { verificarAprovados(); if(Date.now() - LS.get('pausa', Date.now()) > 30 * 60 * 1000) abrirApp(); });
  try{ const { SplashScreen } = await import('@capacitor/splash-screen'); SplashScreen.hide(); }catch{}
}

// ---------- arranque ----------
(async () => {
  aplicarTema();
  $('#btn-def').innerHTML = icon('gear'); $('#btn-def').onclick = () => rotear('definicoes');
  // etiqueta só nas versões de teste (a compilação de lançamento retira este bloco)
  if(import.meta.env.VITE_AMBIENTE === 'staging'){ const t = document.createElement('div'); t.className = 'env-tag'; t.textContent = 'Testes'; document.body.appendChild(t); }
  setupRonron(); nav(); rede(); nativos();
  await carregarMe(); badgeFavs();
  const vaiHaverIntro = rrMode() !== 'off' && !reduce() && LS.get('intro-hoje', '') !== new Date().toDateString();
  if(!vaiHaverIntro) setTimeout(abrirApp, 350);   // abrir a app (sem a entrada grande): esticão e aceno no logo + ronronar forte
  const i = intro(); render(); await i; verificarAprovados();
})();
