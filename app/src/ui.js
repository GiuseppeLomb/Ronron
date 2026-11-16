// Utilitários de interface: animação, avisos, diálogos, erros em PT-PT e recursos nativos (Capacitor)
import { animate } from 'motion';
import { PREF, toque } from './som.js';
import { RR } from './ronron.js';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { icon } from './icons.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const nativo = Capacitor.isNativePlatform();
export const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const done = a => Promise.resolve(a).then(() => {}, () => {});
export const go = (el, kf, op) => ({ finished: (!reduce() && el) ? done(animate(el, kf, op)) : Promise.resolve() });

export function toast(txt, ic = 'heart'){
  $$('.toast').forEach(x => x.remove()); if(ic === 'warning') toque();
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = icon(ic) + esc(txt);
  $('#app').appendChild(d); go(d, { opacity: [0, 1], y: [-10, 0] }, { type: 'spring', stiffness: 300, damping: 22 });
  setTimeout(() => go(d, { opacity: 0 }, { duration: .3 }).finished.then(() => d.remove()), 2600);
}
export async function vibrar(forte = false){
  if(!PREF.vibracao || RR.mode === 'desligado') return;
  toque(forte ? 'medio' : 'leve');   // toque nativo muito leve (LOW_TICK), nunca o padrão de notificação
}

const ERROS = [
  [/ronron_conta_existente|database error (saving|granting|creating|updating|linking)|identity.*already|already linked/i, 'Este email já tem uma conta no Ronron criada com palavra-passe. Entra com o email e a palavra-passe.'],
  [/google_falhou/i, 'O Google não conseguiu iniciar sessão neste telemóvel. Tenta outra vez ou entra com email.'],
  [/nonce/i, 'O início de sessão com o Google expirou. Tenta outra vez.'],
  [/load failed|failed to fetch|networkerror|network request failed|fetch|timeout|timed out|52\d|54\d|503|502/i, 'Não consegui ligar ao servidor. Verifica a ligação e tenta daqui a uns minutos.'],
  [/invalid login credentials/i, 'Email ou palavra-passe errados.'],
  [/user already registered|already been registered/i, 'Já existe uma conta com este email. Usa "Entrar".'],
  [/password should be at least|weak password|password is too weak/i, 'A palavra-passe tem de ter pelo menos 8 caracteres, com letras e números.'],
  [/rate limit|too many requests|429/i, 'Demasiadas tentativas seguidas. Espera uns minutos e tenta outra vez.'],
  [/captcha/i, 'A verificação anti-robô falhou. Tenta outra vez.'],
  [/invalid email|unable to validate email/i, 'Este email não parece válido.'],
  [/mime type|not supported/i, 'Formato não suportado. Usa fotos JPG ou PNG, ou vídeo MP4.'],
  [/payload too large|maximum allowed size|too large/i, 'Ficheiro demasiado grande (máximo 10 MB).'],
  [/row-level security|permission denied|sem permiss/i, 'Não tens permissão para fazer isto.'],
  [/violates check constraint/i, 'Algum campo tem um valor inválido ou demasiado longo.'],
  [/duplicate key.*reports|reports_um_por_anuncio/i, 'Já denunciaste este anúncio. Obrigado.'],
  [/column .*vaccinated/i, 'Esta versão ainda não tem o filtro "vacinado" no servidor.'],
];
export function erroPT(e){
  const m = String(e?.message || e || '');
  if(['P0001', 'P0002', '22023'].includes(e?.code)) return m;
  for(const [re, t] of ERROS) if(re.test(m)) return t;
  return 'Algo correu mal. Tenta outra vez daqui a pouco.';
}

// diálogo próprio (substitui prompt/confirm), em folha que sobe
export function dialogo({ titulo, texto = '', campo = null, ok = 'Confirmar', cancelar = 'Cancelar', perigo = false }){
  return new Promise(resolve => {
    const bg = document.createElement('div'); bg.className = 'bsheet'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true');
    bg.innerHTML = `<form class="panel2"><span class="grab"></span><h3>${esc(titulo)}</h3>${texto ? `<p class="muted" style="margin:0">${esc(texto)}</p>` : ''}
      ${campo ? (campo.multilinha ? `<textarea class="inp" name="v" maxlength="${campo.max || 500}" placeholder="${esc(campo.placeholder || '')}"></textarea>`
        : `<input class="inp" name="v" type="${campo.tipo || 'text'}" maxlength="${campo.max || 200}" placeholder="${esc(campo.placeholder || '')}">`) : ''}
      <div class="sheet-foot"><button type="button" class="btn2" data-x>${esc(cancelar)}</button><button class="primary" ${perigo ? 'style="background:#B4432E;box-shadow:none"' : ''}>${esc(ok)}</button></div></form>`;
    $('#app').appendChild(bg);
    const f = $('form', bg), v = $('[name=v]', bg), panel = $('.panel2', bg);
    const fim = val => { go(panel, { y: [0, 400] }, { duration: .25 }).finished.then(() => bg.remove()); resolve(val); };
    $('[data-x]', bg).onclick = () => fim(campo ? null : false);
    bg.addEventListener('click', e => { if(e.target === bg) fim(campo ? null : false); });
    f.onsubmit = e => { e.preventDefault(); if(campo && campo.obrigatorio && !v.value.trim()) { v.focus(); return; } fim(campo ? v.value.trim() : true); };
    go(panel, { y: [400, 0] }, { type: 'spring', stiffness: 260, damping: 26 });
    (v || $('.primary', bg)).focus();
  });
}

export async function partilhar(c){
  const texto = `Conhece ${c.nome_art} no Ronron: ${c.idade}, ${c.local}. Procura casa.`;
  try{
    if(nativo) await Share.share({ title: `Ronron: ${c.nome}`, text: texto, dialogTitle: 'Partilhar' });
    else if(navigator.share) await navigator.share({ title: 'Ronron', text: texto });
    else { await navigator.clipboard.writeText(texto); toast('Texto copiado', 'check'); }
  }catch{}
}

// fotografias: câmara ou galeria (nativo) ou seletor de ficheiros (web)
export async function escolherFotos(max){
  if(nativo){
    try{
      const p = await Camera.getPhoto({ source: CameraSource.Prompt, resultType: CameraResultType.Uri, quality: 85, width: 1600, correctOrientation: true,
        promptLabelHeader: 'Fotografia', promptLabelPhoto: 'Escolher da galeria', promptLabelPicture: 'Tirar fotografia', promptLabelCancel: 'Cancelar' });
      const blob = await (await fetch(p.webPath)).blob();
      return [new File([blob], `foto.${p.format || 'jpg'}`, { type: blob.type || 'image/jpeg' })];
    }catch{ return []; }
  }
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,video/*'; i.multiple = max > 1;
    i.onchange = () => res([...i.files].slice(0, max)); i.click(); });
}
export async function reduzir(file){
  try{
    const bmp = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/webp', .82)); return b ? { blob: b, ext: 'webp', type: 'image/webp' } : null;
  }catch{ return null; }
}

// corações e patinhas em traço que flutuam; confetti suave de patinhas
const PAW = `<svg class="fx" viewBox="0 0 28 28"><path d="M8 18 C 8 13 11 11 14 11 C 17 11 20 13 20 18 C 20 22 17 23 14 23 C 11 23 8 22 8 18 Z M5 10 C 5 8 6 7 7 7 C 8 7 9 8 9 10 C 9 12 8 13 7 13 C 6 13 5 12 5 10 Z M10 6 C 10 4 11 3 12 3 C 13 3 14 4 14 6 C 14 8 13 9 12 9 C 11 9 10 8 10 6 Z M14 6 C 14 4 15 3 16 3 C 17 3 18 4 18 6 C 18 8 17 9 16 9 C 15 9 14 8 14 6 Z M19 10 C 19 8 20 7 21 7 C 22 7 23 8 23 10 C 23 12 22 13 21 13 C 20 13 19 12 19 10 Z"/></svg>`;
const HEART = `<svg class="fx" viewBox="0 0 28 28"><path d="M14 24 C 6 18.5 2.5 13.5 4.5 8.6 C 6.5 4.3 11.5 4.6 14 8.6 C 16.5 4.6 21.5 4.3 23.5 8.6 C 25.5 13.5 22 18.5 14 24 Z"/></svg>`;
export function burst(from, n = 9, cores = null){
  if(reduce() || !from) return; const app = $('#app').getBoundingClientRect(), r = from.getBoundingClientRect();
  for(let i = 0; i < n; i++){
    const w = document.createElement('div'); w.innerHTML = i % 3 === 2 ? PAW : HEART; const s = w.firstChild; $('#app').appendChild(s);
    if(cores) s.style.color = cores[i % cores.length];
    s.style.left = (r.left - app.left + r.width * (.25 + Math.random() * .5)) + 'px'; s.style.top = (r.top - app.top + r.height * (.3 + Math.random() * .35)) + 'px';
    const dx = (Math.random() - .5) * 170, dy = -(110 + Math.random() * 150), sc = .7 + Math.random() * .7;
    done(animate(s, { x: [0, dx], y: [0, dy], rotate: [0, (Math.random() - .5) * 70], scale: [0, sc, sc * .9], opacity: [0, 1, 0] }, { duration: 1.4 + Math.random() * .5, delay: i * .05, ease: 'easeOut' })).then(() => s.remove());
  }
}
export const confetti = el => burst(el, 18, ['var(--accent)', 'var(--accent-2)', 'var(--sage)']);
export function countUp(e){ const n = +e.dataset.n; if(reduce()){ e.textContent = n; return; } const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 900); e.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if(k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
export function cascade(root){
  $$('.reveal', root).forEach((e, i) => go(e, { opacity: [0, 1], y: [14, 0] }, { duration: .5, delay: .05 * i, ease: [.22, 1, .36, 1] }));
  $$('.ic', root).forEach((e, i) => go(e, { scale: [.3, 1], rotate: [-20, 0] }, { type: 'spring', stiffness: 300, damping: 12, delay: .2 + .07 * i }));
  $$('.count', root).forEach(countUp);
}
