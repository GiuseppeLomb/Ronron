// Feed (swipe), filtros, ficha e "Quero conhecer"
import { animate } from 'motion';
import { $, $$, go, wait, esc, toast, vibrar, erroPT, dialogo, partilhar, burst, confetti, cascade, reduce } from './ui.js';
import { icon } from './icons.js';
import { makeRonron, RR } from './ronron.js';
import * as api from './api.js';
import { S, LS, guardarFiltros, nFiltros, marcarVisto, addFav, idade, art } from './state.js';
import { hdr, rotear } from './main.js';

const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const cur = () => S.feed[S.idx];
const capa = a => (a.animal_photos.find(p => !p.is_video) || a.animal_photos[0]);
const FILTROS = [
  ['felvNeg', 'Sem FeLV', 'shield-check'], ['young', 'Até 2 anos', 'sparkle'], ['cats', 'Gosta de gatos', 'cat'],
  ['vac', 'Vacinado', 'syringe'], ['dew', 'Desparasitado', 'pill'], ['ster', 'Esterilizado', 'scissors'],
];
const nomeFiltro = k => k === 'district' ? S.filtros.district : (FILTROS.find(f => f[0] === k) || [])[1];

// ---------- ecrã ----------
export async function renderFeed(view){
  view.innerHTML = `<div class="main"><div class="wrap">
    <section class="deck-col" aria-label="Gatos para conhecer">
      <div class="feed-bar" id="feed-bar"></div>
      <div class="deck" id="deck"><div class="cardbox" id="cardbox"></div>
        <div class="empty" id="empty" hidden></div></div>
      <div class="acts" id="acts" style="visibility:hidden">
        <button class="act undo" aria-label="Desfazer">${icon('arrow-counter-clockwise')}</button>
        <button class="act pass" aria-label="Passar">${icon('x')}</button>
        <button class="act like" aria-label="Gosto">${icon('heart')}</button>
        <button class="act info" aria-label="Ver a ficha">${icon('info')}</button>
      </div>
    </section>
    <aside class="side" id="side" aria-label="Sobre este gato" aria-live="polite"></aside>
  </div></div>`;
  $('.act.undo').onclick = undo; $('.act.pass').onclick = () => decide(false); $('.act.like').onclick = () => decide(true); $('.act.info').onclick = abrirFicha;
  barra();
  await carregar();
}
function barra(){
  const n = nFiltros(), b = $('#feed-bar'); if(!b) return;
  const chips = Object.entries(S.filtros).filter(([, v]) => v).map(([k]) => `<button class="fchip" data-k="${k}" aria-label="Tirar o filtro ${esc(nomeFiltro(k))}">${esc(nomeFiltro(k))}${icon('x')}</button>`).join('');
  b.innerHTML = `<button class="fbtn" id="fbtn">${icon('sliders-horizontal')}Filtros${n ? `<span class="n">${n}</span>` : ''}</button>${chips}`;
  $('#fbtn').onclick = abrirFiltros;
  $$('.fchip', b).forEach(c => c.onclick = () => { S.filtros[c.dataset.k] = c.dataset.k === 'district' ? '' : false; guardarFiltros(); barra(); carregar(); });
}

async function carregar(){
  const box = $('#cardbox'); if(!box) return;
  $('#empty').hidden = true; $('#acts').style.visibility = 'hidden';
  box.innerHTML = `<div class="loadbox"><span id="skel-rr"></span><p>A procurar gatos para ti…</p></div>`;
  makeRonron($('#skel-rr'), { size: 150, pose: 'gente', base: 'gente' });
  $('#side').innerHTML = '';
  try{
    const lista = await api.feed(S.filtros);
    LS.set('cache-feed', lista.slice(0, 30));
    if(S.me) (await api.gostos()).forEach(s => S.vistos.add(s.animal_id));
    S.feed = lista.filter(a => !S.vistos.has(a.id)); S.idx = 0; S.trilho = [];
  }catch(e){
    const cache = LS.get('cache-feed', []);
    if(!S.online && cache.length){ S.feed = cache.filter(a => !S.vistos.has(a.id)); S.idx = 0; }
    else return erro(e);
  }
  render(true);
}
function erro(e){
  $('#cardbox').innerHTML = ''; const em = $('#empty'); em.hidden = false;
  em.innerHTML = `<div class="state-rr"><span id="erro-rr"></span><h3>Enrolei-me um bocadinho</h3><span>${esc(erroPT(e))}</span><button class="chip" id="retry">Tentar de novo</button></div>`;
  const r = makeRonron($('#erro-rr'), { size: 160, pose: 'pensar', base: 'novelo' }); r.react('erro');
  $('#retry').onclick = carregar;
}

function cardHTML(a, top){
  const p = capa(a), src = p ? api.foto(p.path) : '';
  const media = p?.is_video ? `<video src="${src}" muted autoplay loop playsinline></video>` : `<img src="${src}" alt="" draggable="false" ${top ? 'style="view-transition-name:foto"' : ''}>`;
  return `<article class="card ${top ? 'is-top' : 'is-next'}" data-id="${a.id}" ${top ? `tabindex="0" aria-label="${esc(a.name)}, ${idade(a.age_months)}, ${esc(a.city)}. Enter para abrir a ficha."` : 'aria-hidden="true"'}>
    <div class="tilt">${media}<div class="cap"><div class="nm disp">${esc(a.name)}</div><div class="meta">${idade(a.age_months)} · ${esc(a.city)}, ${esc(a.district)}</div></div></div></article>`;
}
function render(entrada = false){
  const box = $('#cardbox'); if(!box) return;
  const rest = S.feed.slice(S.idx, S.idx + 2);
  $('#acts').style.visibility = rest.length ? 'visible' : 'hidden';
  if(!rest.length){ box.innerHTML = ''; return vazio(); }
  $('#empty').hidden = true;
  box.innerHTML = rest.slice().reverse().map((a, i, arr) => cardHTML(a, i === arr.length - 1)).join('');
  const top = $('.card.is-top', box); arrastar(top); if(fine() && !reduce()) inclinar(top);
  if(entrada){ go(top, { opacity: [0, 1], y: [30, 0], scale: [.96, 1] }, { type: 'spring', stiffness: 180, damping: 20 });
    $$('#acts .act').forEach((e, i) => go(e, { opacity: [0, 1], scale: [.6, 1] }, { type: 'spring', stiffness: 300, damping: 16, delay: .1 + i * .06 })); }
  renderSide();
}
function vazio(){
  const em = $('#empty'); em.hidden = false; $('#side').innerHTML = '';
  if(nFiltros()){
    em.innerHTML = `<div class="state-rr"><span id="vz-rr"></span><h3>Não encontrei ninguém</h3><span>Com estes filtros não há gatos agora. Experimenta tirar um.</span>
      <div class="toggles" style="justify-content:center">${Object.entries(S.filtros).filter(([, v]) => v).map(([k]) => `<button class="fchip" data-k="${k}">${esc(nomeFiltro(k))}${icon('x')}</button>`).join('')}</div>
      <button class="chip" id="limpar">Limpar filtros</button></div>`;
    const r = makeRonron($('#vz-rr'), { size: 150, pose: 'pensar', base: 'pensar' }); r.seq([['curioso', 700], ['pensar', 900]], 'pensar');
    hdr.say('Tira um filtro e procuro outra vez.', 2400);
    $$('.fchip', em).forEach(c => c.onclick = () => { S.filtros[c.dataset.k] = c.dataset.k === 'district' ? '' : false; guardarFiltros(); barra(); carregar(); });
    $('#limpar').onclick = () => { Object.keys(S.filtros).forEach(k => S.filtros[k] = k === 'district' ? '' : false); guardarFiltros(); barra(); carregar(); };
  } else {
    em.innerHTML = `<div class="state-rr"><span id="vz-rr"></span><h3>Por hoje é tudo</h3><span>Vou dormir uma sesta. Amanhã há mais amigos para conhecer.</span><button class="chip" id="rever">Ver outra vez os que passei</button></div>`;
    const r = makeRonron($('#vz-rr'), { size: 170, pose: 'gente', base: 'dormir' }); r.react('vazio');
    hdr.say('Por hoje é tudo. Vou dormir uma sesta.', 2600, 'vazio');
    $('#rever').onclick = () => { S.vistos = new Set(); LS.set('vistos', []); carregar(); };
  }
}

// ---------- física do swipe ----------
function arrastar(el){
  let sx = 0, sy = 0, x = 0, y = 0, on = false, moved = false, s = [];
  const set = () => { el.style.transform = `translate(${x}px,${y}px) rotate(${x / 24}deg)`; };
  el.addEventListener('pointerdown', e => { if(S.busy) return; on = true; moved = false; sx = e.clientX; sy = e.clientY; x = y = 0; s = []; el.setPointerCapture(e.pointerId); $('.tilt', el).style.transform = ''; });
  el.addEventListener('pointermove', e => { if(!on) return; x = e.clientX - sx; y = (e.clientY - sy) * .3; if(Math.abs(x) > 6) moved = true; s.push([e.timeStamp, x]); if(s.length > 6) s.shift(); set(); });
  const end = () => { if(!on) return; on = false;
    const v = s.length > 1 ? (s.at(-1)[1] - s[0][1]) / Math.max(1, s.at(-1)[0] - s[0][0]) : 0;
    if(x > 110 || v > .55) return decide(true, x, y);
    if(x < -110 || v < -.55) return decide(false, x, y);
    if(!moved){ el.style.transform = ''; if(!$('#side').offsetParent) abrirFicha(); return; }
    const fx = x, fy = y; x = y = 0;
    if(!reduce()) animate(el, { x: [fx, 0], y: [fy, 0], rotate: [fx / 24, 0] }, { type: 'spring', stiffness: 420, damping: 18 }); else el.style.transform = '';
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e => { if(e.key === 'Enter') abrirFicha(); });
}
function inclinar(el){
  const t = $('.tilt', el), img = $('img', t); let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const loop = () => { cx += (tx - cx) * .12; cy += (ty - cy) * .12;
    t.style.transform = `rotateY(${cx * 7}deg) rotateX(${-cy * 7}deg)`; if(img) img.style.transform = `translate(${-cx * 10}px,${-cy * 10}px)`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .001 ? requestAnimationFrame(loop) : 0; };
  el.addEventListener('pointermove', e => { if(e.pointerType !== 'mouse' || e.buttons) return; const r = el.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; if(!raf) raf = requestAnimationFrame(loop); });
  el.addEventListener('pointerleave', () => { tx = ty = 0; if(!raf) raf = requestAnimationFrame(loop); });
}

export async function decide(liked, x0 = 0, y0 = 0){
  const el = $('.card.is-top'); if(!el || S.busy) return; S.busy = true;
  const a = cur(); S.trilho.push(S.idx); const next = $('.card.is-next');
  marcarVisto(a.id); if(S.me) api.registarSwipe(S.me.user.id, a.id, liked);
  if(liked){
    addFav(a.id); vibrar(true); burst(el, 9); hdr.react('gosto'); hdr.say('Boa escolha.', 1500, 'gosto');
    go($('img', el), { scale: [1, 1.07, 1] }, { duration: .6, ease: 'easeInOut' });
    await go(el, { x: [x0, x0 * .2], y: [y0, 0], rotate: [x0 / 24, 0], scale: [1, .96] }, { type: 'spring', stiffness: 320, damping: 16 }).finished;
    await wait(reduce() ? 0 : 160);
    await go(el, { x: [x0 * .2, 520], y: [0, -60], rotate: [0, 14], opacity: [1, 0] }, { duration: .55, ease: [.4, 0, .2, 1] }).finished;
    badgeFavs(); toast(`${a.name} ficou nos teus favoritos`);
  } else {
    hdr.react('passar'); hdr.say('Até já.', 1100);
    await go(el, { x: [x0, -360], y: [y0, y0 + 30], rotate: [x0 / 24, -9], opacity: [1, 0] }, { duration: .8, ease: [.25, .1, .25, 1] }).finished;
  }
  if(next){ next.classList.replace('is-next', 'was-next'); await go(next, { scale: [.94, 1], y: [16, 0] }, { type: 'spring', stiffness: 260, damping: 22 }).finished; }
  S.idx++; S.busy = false; render();
}
function undo(){ if(!S.trilho.length || S.busy) return; S.idx = S.trilho.pop(); const a = cur(); S.vistos.delete(a.id); LS.set('vistos', [...S.vistos]); render();
  hdr.react('desfazer'); hdr.say('Ups. Não vi nada.', 1400); go($('.card.is-top'), { x: [-260, 0], rotate: [-10, 0], opacity: [0, 1] }, { type: 'spring', stiffness: 240, damping: 22 }); }
export function badgeFavs(){ $$('.fav-badge').forEach(b => { b.hidden = !S.favs.length; b.textContent = S.favs.length; go(b, { scale: [.4, 1.35, 1] }, { duration: .5 }); }); }

// ---------- filtros: folha que sobe, contagem ao vivo ----------
function abrirFiltros(){
  const tmp = { ...S.filtros };
  const bg = document.createElement('div'); bg.className = 'bsheet'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Filtros');
  bg.innerHTML = `<div class="panel2"><span class="grab"></span><h3>Filtros</h3>
    <label class="field"><span>Distrito</span><select class="inp" id="f-dist"><option value="">Todo o país</option>${api.DISTRITOS.map(d => `<option ${d === tmp.district ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
    <div class="field"><span>Saúde e feitio</span><div class="toggles">${FILTROS.map(([k, t, ic]) => `<button type="button" class="tg" data-k="${k}" aria-pressed="${!!tmp[k]}">${icon(ic)}${t}</button>`).join('')}</div></div>
    <div class="sheet-foot"><button class="btn2" id="f-limpar">Limpar</button><button class="primary" id="f-ver">A contar…</button></div></div>`;
  $('#app').appendChild(bg);
  const panel = $('.panel2', bg); go(panel, { y: [500, 0] }, { type: 'spring', stiffness: 240, damping: 26 });
  let t = 0;
  const conta = () => { clearTimeout(t); t = setTimeout(async () => { const b = $('#f-ver', bg);
    try{ const n = await api.contar(tmp); b.innerHTML = n ? `Ver <span class="count-num">${n}</span> ${n === 1 ? 'gato' : 'gatos'}` : 'Nenhum gato assim'; b.disabled = !n;
      go(b, { scale: [.97, 1] }, { type: 'spring', stiffness: 400, damping: 14 }); }catch(e){ b.textContent = 'Aplicar'; b.disabled = false; } }, 180); };
  $$('.tg', bg).forEach(g => g.onclick = () => { tmp[g.dataset.k] = !tmp[g.dataset.k]; g.setAttribute('aria-pressed', tmp[g.dataset.k]); vibrar(); go(g, { scale: [.9, 1] }, { type: 'spring', stiffness: 500, damping: 12 }); conta(); });
  $('#f-dist', bg).onchange = e => { tmp.district = e.target.value; conta(); };
  $('#f-limpar', bg).onclick = () => { Object.keys(tmp).forEach(k => tmp[k] = k === 'district' ? '' : false); $('#f-dist', bg).value = ''; $$('.tg', bg).forEach(g => g.setAttribute('aria-pressed', 'false')); conta(); };
  const fechar = async () => { await go(panel, { y: [0, 500] }, { duration: .25 }).finished; bg.remove(); };
  bg.addEventListener('click', e => { if(e.target === bg) fechar(); });
  $('#f-ver', bg).onclick = async () => { S.filtros = tmp; guardarFiltros(); await fechar(); barra(); carregar(); };
  conta();
}

// ---------- ficha ----------
const yn = v => v === true ? 'Sim' : v === false ? 'Não' : 'Não sei';
function bemCom(a){ const l = []; if(a.good_with_cats) l.push('gatos'); if(a.good_with_dogs) l.push('cães'); if(a.good_with_kids) l.push('crianças');
  return l.length ? l.join(', ').replace(/, ([^,]*)$/, ' e $1').replace(/^./, c => c.toUpperCase()) : 'Ainda não sabemos'; }
const dias = a => Math.max(1, Math.round((Date.now() - new Date(a.created_at)) / 864e5));
export function fichaHTML(a, full){
  const ph = a.animal_photos;
  return `${full ? `<div class="f-head" style="display:flex;justify-content:space-between;align-items:center"><button class="icon-btn" data-voltar aria-label="Voltar">${icon('arrow-left')}</button>
      <button class="icon-btn" data-share aria-label="Partilhar">${icon('share-network')}</button></div>
    <div class="f-hero">${ph[0] ? (ph[0].is_video ? `<video src="${api.foto(ph[0].path)}" controls playsinline></video>` : `<img src="${api.foto(ph[0].path)}" alt="${esc(a.name)}" style="view-transition-name:foto">`) : ''}</div>
    ${ph.length > 1 ? `<div class="toggles">${ph.slice(1).map(p => `<button class="ph-cell" style="width:72px" data-ph="${esc(p.path)}" data-v="${p.is_video ? 1 : 0}">${p.is_video ? `<video src="${api.foto(p.path)}" muted></video>` : `<img src="${api.foto(p.path)}" alt="">`}</button>`).join('')}</div>` : ''}` : ''}
    <div class="reveal f-top"><div><div class="f-name disp">${esc(a.name)}</div><div class="f-meta">${idade(a.age_months)} · ${a.sex === 'femea' ? 'fêmea' : a.sex === 'macho' ? 'macho' : 'sexo por saber'} · ${esc(a.city)}, ${esc(a.district)}</div></div><span class="rr-wrap"><span class="rr-bubble"></span><span class="read-rr"></span></span></div>
    <div class="counts reveal"><span>${icon('calendar-blank')}há <b class="count" data-n="${dias(a)}">0</b> ${dias(a) === 1 ? 'dia' : 'dias'} à espera de casa</span>${a.status === 'reservado' ? '<span class="pill warn">Reservado</span>' : ''}</div>
    ${a.description || a.unique_trait ? `<p class="story reveal">${esc(a.description || a.unique_trait)}</p>` : ''}
    <div class="ess">
      <div class="row reveal"><span class="ic">${icon('syringe')}</span><span><b>Vacinado</b>${yn(a.vaccinated)}</span></div>
      <div class="row reveal"><span class="ic">${icon('pill')}</span><span><b>Desparasitado</b>${yn(a.dewormed)}</span></div>
      <div class="row reveal"><span class="ic">${icon('scissors')}</span><span><b>Esterilizado</b>${yn(a.sterilized)}</span></div>
      <div class="row reveal"><span class="ic">${icon('shield-check')}</span><span><b>FeLV</b>${a.felv === 'negativo' ? 'Negativo' : a.felv === 'positivo' ? 'Positivo: deve ser o único gato da casa, ou viver com outros FeLV positivos' : 'Ainda não testado'}</span></div>
      <div class="row reveal"><span class="ic">${icon('users-three')}</span><span><b>Dá-se bem com</b>${bemCom(a)}</span></div>
      <div class="row reveal"><span class="ic">${icon('user-circle')}</span><span><b>Quem cuida</b>${esc(a.profiles?.display_name || 'Protetor')}</span></div>
    </div>
    <div class="${full ? 'sticky' : 'pin'} reveal"><div class="cta purr"><button class="primary" data-meet>${icon('paw-print')}Quero conhecer ${art(a)} ${esc(a.name)}</button></div></div>
    <div class="row-btns reveal" style="justify-content:center">${full ? '' : `<button class="btn2" data-share>${icon('share-network')}Partilhar</button>`}<button class="quiet" data-report>Denunciar anúncio</button></div>`;
}
function ligarFicha(root, a){
  $$('[data-meet]', root).forEach(b => b.onclick = () => meet(a));
  $$('[data-share]', root).forEach(b => b.onclick = () => partilhar({ nome: a.name, nome_art: `${art(a)} ${a.name}`, idade: idade(a.age_months), local: `${a.city}, ${a.district}` }));
  $$('[data-report]', root).forEach(b => b.onclick = () => denunciar(a));
  $$('[data-voltar]', root).forEach(b => b.onclick = fecharFicha);
  $$('[data-ph]', root).forEach(b => b.onclick = () => { const h = $('.f-hero', root); const src = api.foto(b.dataset.ph);
    h.innerHTML = b.dataset.v === '1' ? `<video src="${src}" controls autoplay playsinline></video>` : `<img src="${src}" alt="">`; go(h.firstChild, { opacity: [0, 1] }, { duration: .3 }); });
  $$('.read-rr', root).forEach(h => { const r = makeRonron(h, { size: 78, pose: 'ler', base: 'ler', bubble: h.previousElementSibling }); r.react('ficha'); setTimeout(() => r.say('Deixa-me ler contigo.', 2000, 'ficha'), 500); });
}
function renderSide(){ const s = $('#side'), a = cur(); if(!s) return; if(!a){ s.innerHTML = ''; return; }
  s.innerHTML = `<div class="panel">${fichaHTML(a, false)}</div>`; ligarFicha(s, a); if(s.offsetParent) cascade(s); }
const vt = fn => (document.startViewTransition && !reduce()) ? document.startViewTransition(fn) : (fn(), null);
export function abrirFicha(a = cur()){
  if(!a) return; const sh = $('#sheet');
  const run = () => { $('.card.is-top img')?.style.removeProperty('view-transition-name'); sh.innerHTML = `<div class="wrap">${fichaHTML(a, true)}</div>`; sh.hidden = false; sh.scrollTop = 0; ligarFicha(sh, a); };
  const t = vt(run); (t ? t.finished : Promise.resolve()).then(() => { cascade(sh); $('[data-voltar]', sh)?.focus({ preventScroll: true }); });
}
export function fecharFicha(){ const sh = $('#sheet'); vt(() => { sh.hidden = true; sh.innerHTML = ''; const img = $('.card.is-top img'); if(img) img.style.viewTransitionName = 'foto'; }); }

async function denunciar(a){
  if(!S.me){ toast('Entra na tua conta para denunciar.', 'flag'); return rotear('conta'); }
  const r = await dialogo({ titulo: 'Denunciar anúncio', texto: 'O que se passa? Por exemplo: estão a vender, parece burla, fotos falsas.', campo: { multilinha: true, max: 500, obrigatorio: true }, ok: 'Enviar denúncia' });
  if(!r) return; if(r.length < 3) return toast('Escreve um pouco mais sobre o problema.', 'warning');
  const { error } = await api.sb.from('reports').insert({ reporter_id: S.me.user.id, animal_id: a.id, reason: r });
  toast(error ? erroPT(error) : 'Obrigado. Vamos ver isto com atenção.', error ? 'warning' : 'check');
}

// ---------- "Quero conhecer" ----------
async function meet(a){
  if(!S.me){ toast('Cria uma conta grátis para falares com quem cuida.', 'user-circle'); fecharFicha(); return rotear('conta'); }
  let c; try{ c = await api.revelarContacto(a.id); }catch(e){ return toast(erroPT(e), 'warning'); }
  const m = $('#meet'), mc = $('#meet-card');
  const fone = (c?.whatsapp || '').replace(/\D/g, ''), intl = fone ? (fone.length === 9 ? '351' + fone : fone) : '';
  const msg = encodeURIComponent(`Olá! Vi ${art(a)} ${a.name} no Ronron e gostava de ${a.sex === 'femea' ? 'a' : 'o'} conhecer.`);
  mc.innerHTML = `<span class="rr-wrap"><span class="meet-rr"></span></span>
    <h2 class="disp" id="meet-t">Vão gostar um do outro</h2>
    <p>${esc(c?.nome || 'Quem cuida')} cuida ${a.sex === 'femea' ? 'da' : 'do'} ${esc(a.name)}. Escreve-lhe e combinem uma visita, sem pressas.</p>
    ${intl ? `<div class="cta purr" style="width:100%"><a class="primary" href="https://wa.me/${intl}?text=${msg}" target="_blank" rel="noopener">${icon('whatsapp-logo')} Escrever no WhatsApp</a></div>` : ''}
    ${c?.email ? `<a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Adoção pelo Ronron')}&body=${msg}">${icon('envelope-simple')}${esc(c.email)}</a>` : ''}
    ${!intl && !c?.email ? '<p class="muted">Este protetor ainda não deixou contacto.</p>' : ''}
    <div class="note">A adoção no Ronron é sempre gratuita. Nunca pagues nada adiantado.</div>
    <button class="quiet" id="meet-x">Agora não</button>`;
  m.hidden = false;
  const mr = makeRonron($('.meet-rr', mc), { size: 150, pose: 'gente', base: 'ronronar' }); setTimeout(() => mr.react('conhecer'), 250);
  go(m, { opacity: [0, 1] }, { duration: .25 }); go(mc, { y: [460, 0] }, { type: 'spring', stiffness: 220, damping: 24 });
  setTimeout(() => confetti(mc), 500); vibrar(true);
  $('#meet-x').onclick = fecharMeet; m.onclick = e => { if(e.target === m) fecharMeet(); };
}
export async function fecharMeet(){ const m = $('#meet'); if(m.hidden) return; await go($('#meet-card'), { y: [0, 460] }, { duration: .3, ease: 'easeIn' }).finished; m.hidden = true; }

addEventListener('keydown', e => {
  if(!$('#meet').hidden){ if(e.key === 'Escape') fecharMeet(); return; }
  if(!$('#sheet').hidden){ if(e.key === 'Escape') fecharFicha(); return; }
  if(location.hash && location.hash !== '#feed') return;
  if(e.target.closest?.('input,textarea,select')) return;
  if(e.key === 'ArrowRight') decide(true); else if(e.key === 'ArrowLeft') decide(false); else if(e.key === 'ArrowUp') abrirFicha();
});
