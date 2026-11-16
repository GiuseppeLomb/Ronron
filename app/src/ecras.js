// Ecrãs: favoritos, conta, os meus gatos, publicar/editar, admin, ajuda, definições e apoiar (desligado)
import { $, $$, go, esc, toast, vibrar, erroPT, dialogo, escolherFotos, reduzir, confetti, cascade, nativo, wait } from './ui.js';
import { icon } from './icons.js';
import { makeRonron, RR } from './ronron.js';
import * as api from './api.js';
import { S, LS, idade, art } from './state.js';
import { hdr, rotear, carregarMe, aplicarTema, definirModo } from './main.js';
import { abrirFicha } from './feed.js';

const pagina = (view, html) => { view.innerHTML = `<div class="scroll"><div class="wrap">${html}</div></div>`; const s = $('.scroll', view); cascade(s); return s; };
const capa = a => (a.animal_photos.find(p => !p.is_video) || a.animal_photos[0]);
const estado = (view, { pose = 'gente', base, titulo, texto, botao, acao, react }) => {
  const s = pagina(view, `<div class="state-box reveal"><span class="st-rr"></span><h3>${titulo}</h3><span>${texto}</span>${botao ? `<button class="primary sm" id="st-b">${botao}</button>` : ''}</div>`);
  const r = makeRonron($('.st-rr', s), { size: 170, pose, base: base || pose }); if(react) r.react(react);
  if(botao) $('#st-b', s).onclick = acao; return s;
};
const aCarregar = view => pagina(view, `<div class="card-s"><div class="skel-line" style="width:40%"></div><div class="skel-line"></div><div class="skel-line" style="width:70%"></div></div>`);

// ---------------- Favoritos ----------------
export async function renderFavs(view){
  aCarregar(view);
  let ids = [...S.favs];
  try{ if(S.me) ids = [...new Set([...(await api.gostos()).filter(s => s.liked).map(s => s.animal_id), ...ids])]; }catch{}
  if(!ids.length) return estado(view, { pose: 'curioso', titulo: 'Ainda sem favoritos', texto: 'Quando gostares de um gato, ele fica guardado aqui.', botao: 'Ver gatos', acao: () => rotear('feed') });
  let lista; try{ lista = await api.gatos(ids); }catch(e){ return estado(view, { pose: 'novelo', titulo: 'Enrolei-me um bocadinho', texto: esc(erroPT(e)), botao: 'Tentar de novo', acao: () => renderFavs(view) }); }
  const by = Object.fromEntries(lista.map(a => [a.id, a]));
  const s = pagina(view, `<div class="reveal"><h1 class="page-title">Favoritos</h1><p class="lead">Os gatos de que gostaste. Toca para ver a ficha.</p></div>
    <div class="grid-cats">${ids.filter(i => by[i]).map(i => { const a = by[i], p = capa(a);
      return `<button class="mini" data-id="${a.id}">${p ? `<img src="${api.foto(p.path)}" alt="" loading="lazy">` : ''}
        ${a.status === 'adotado' ? '<span class="pill ok">Já tem casa</span>' : a.status === 'reservado' ? '<span class="pill warn">Reservado</span>' : ''}
        <span class="t"><b>${esc(a.name)}</b><span>${idade(a.age_months)} · ${esc(a.city)}</span></span></button>`; }).join('')}</div>`);
  $$('.mini', s).forEach((m, i) => { go(m, { opacity: [0, 1], scale: [.85, 1] }, { type: 'spring', stiffness: 280, damping: 16, delay: i * .05 }); m.onclick = () => abrirFicha(by[m.dataset.id]); });
}

// ---------------- Conta: entrar / criar conta (Turnstile) / perfil ----------------
let modo = 'entrar', papel = 'adotante', captchaToken = null, captchaId = null, comEmail = false;
const G_LOGO = '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
export async function renderConta(view){
  if(S.me) return S.me.perfil && S.me.perfil.perfil_completo === false ? renderBoasVindas(view) : perfil(view);
  const temGoogle = nativo && api.ENV.google;
  const mostrarEmail = comEmail || !temGoogle;
  const s = pagina(view, `<div class="reveal center" style="display:grid;gap:8px"><span class="st-rr"></span><h1 class="page-title">${mostrarEmail && modo === 'registar' ? 'Junta-te ao Ronron' : 'Olá!'}</h1>
      <p class="lead" style="margin:0">Entra para falares com quem cuida dos gatos. É grátis.</p></div>
    <div class="card-s form reveal">
      ${api.ENV.turnstile ? '<div class="ts-box" id="captcha"></div>' : ''}
      ${temGoogle ? `<button type="button" class="g-btn" id="g-entrar">${G_LOGO}<span>Continuar com o Google</span></button>
        <p class="small muted" style="margin:0;text-align:center">Na primeira vez pedimos só o essencial: se queres adotar ou se cuidas de gatos, e o teu distrito.</p>` : ''}
      <p class="err-msg" id="g-err" role="alert" hidden></p>
      ${temGoogle && !mostrarEmail ? '<button type="button" class="btn2" id="usar-email">Usar email e palavra-passe</button>' : ''}
    </div>
    ${mostrarEmail ? `<form class="card-s form reveal" id="auth" novalidate>
      ${temGoogle ? '<h2 style="margin:0">Com email e palavra-passe</h2>' : ''}
      <div class="seg" role="group" aria-label="Entrar ou criar conta"><button type="button" data-m="entrar" aria-pressed="${modo === 'entrar'}">Entrar</button><button type="button" data-m="registar" aria-pressed="${modo === 'registar'}">Criar conta</button></div>
      ${modo === 'registar' ? `
        <div class="field"><span>Eu…</span><div class="seg"><button type="button" data-p="adotante" aria-pressed="${papel === 'adotante'}">Quero adotar</button><button type="button" data-p="protetor" aria-pressed="${papel === 'protetor'}">Cuido de gatos de rua</button></div></div>
        <label class="field"><span>Nome</span><input class="inp" name="name" required maxlength="40" autocomplete="name"></label>
        <div class="two"><label class="field"><span>Distrito</span><select class="inp" name="district" required><option value="">Escolhe</option>${api.DISTRITOS.map(d => `<option>${d}</option>`).join('')}</select></label>
          <label class="field"><span>Cidade</span><input class="inp" name="city" required maxlength="60"></label></div>
        ${papel === 'protetor' ? `<label class="field"><span>WhatsApp</span><input class="inp" name="whatsapp" inputmode="tel" placeholder="912 345 678" maxlength="20"><small>Os adotantes falam contigo diretamente.</small></label>` : ''}` : ''}
      <label class="field"><span>Email</span><input class="inp" name="email" type="email" required autocomplete="email"></label>
      <label class="field"><span>Palavra-passe</span><input class="inp" name="pass" type="password" required minlength="${modo === 'entrar' ? 6 : 8}" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}">${modo === 'registar' ? '<small>Pelo menos 8 caracteres, com letras e números. Guarda-a bem: ainda não conseguimos repor palavras-passe.</small>' : ''}</label>
      ${modo === 'registar' ? `<label class="check"><input type="checkbox" name="adulto" required><span>Tenho 18 anos ou mais e aceito as <a href="#ajuda">regras do Ronron</a> e a ${linkPrivacidade()}.</span></label>` : ''}
      <p class="err-msg" id="auth-err" role="alert" hidden></p>
      <button class="primary">${modo === 'entrar' ? 'Entrar' : 'Criar conta grátis'}</button>
      ${modo === 'entrar' ? `<p class="small muted" style="margin:0;text-align:center">Esqueceste a palavra-passe? O Ronron ainda não envia emails, por isso não a conseguimos repor.${temGoogle ? ' Podes criar uma conta nova com o Google, que não precisa de palavra-passe.' : ' Podes criar uma conta nova.'}</p>` : ''}
    </form>` : ''}`);
  makeRonron($('.st-rr', s), { size: 130, pose: 'acenar', base: 'gente' }).seq([['acenar', 1200]], 'gente');
  $$('[data-m]', s).forEach(b => b.onclick = () => { modo = b.dataset.m; renderConta(view); });
  $$('[data-p]', s).forEach(b => b.onclick = () => { papel = b.dataset.p; renderConta(view); });
  $('#usar-email', s)?.addEventListener('click', () => { comEmail = true; renderConta(view); });
  $('#g-entrar', s)?.addEventListener('click', () => entrarComGoogle($('#g-entrar', s)));
  $('#auth', s)?.addEventListener('submit', e => { e.preventDefault(); entrar(e.target, view); });
  montarCaptcha();
}
const linksPrivacidade = () => `${api.ENV.privacidade ? `<a class="linkrow" href="${api.ENV.privacidade}" target="_blank" rel="noopener">${icon('shield-check')}<span class="grow">Política de privacidade</span>${icon('arrow-square-out', 'i chev')}</a>` : ''}
  ${api.ENV.apagarConta ? `<a class="linkrow" href="${api.ENV.apagarConta}" target="_blank" rel="noopener">${icon('trash')}<span class="grow">Pedir a eliminação da conta (sem a app)</span>${icon('arrow-square-out', 'i chev')}</a>` : ''}`;
const linkPrivacidade = () => api.ENV.privacidade ? `<a href="${api.ENV.privacidade}" target="_blank" rel="noopener">política de privacidade</a>` : 'política de privacidade';
async function entrarComGoogle(b){
  const err = $('#g-err'); err.hidden = true; const mostrar = t => { err.textContent = t; err.hidden = false; go(err, { x: [0, -6, 6, -3, 0] }, { duration: .35 }); };
  if(api.ENV.turnstile && !captchaToken) return mostrar('Confirma primeiro a verificação anti-robô, acima.');
  b.disabled = true; const t = captchaToken; captchaToken = null;
  try{
    const r = await api.entrarGoogle(t);
    if(r?.cancelado) return;
    await carregarMe(); vibrar();
    if(S.me?.perfil?.perfil_completo === false) return rotear('boas-vindas');
    hdr.seq([['feliz', 900]], 'logo'); hdr.say(`Olá, ${S.me?.perfil?.display_name || ''}!`, 2000);
    rotear(S.me?.perfil?.role === 'protetor' ? 'meus' : 'feed');
  }catch(e){ mostrar(erroPT(e)); }
  finally{ b.disabled = false; try{ window.turnstile?.reset(captchaId); }catch{} }
}

// ---------------- Primeiro login (contas Google): papel, distrito, cidade, WhatsApp, 18+ ----------------
let bvPapel = 'adotante';
export function renderBoasVindas(view){
  if(!S.me) return rotear('conta');
  if(S.me.perfil?.perfil_completo) return rotear('feed');
  const p = S.me.perfil || {};
  const s = pagina(view, `<div class="reveal center" style="display:grid;gap:8px"><span class="st-rr"></span><h1 class="page-title">Boas-vindas ao Ronron</h1>
      <p class="lead" style="margin:0">Só mais uns segundos. Isto ajuda-nos a mostrar-te gatos perto de ti.</p></div>
    <form class="card-s form reveal" id="bv" novalidate>
      <div class="field"><span>Eu…</span><div class="seg"><button type="button" data-p="adotante" aria-pressed="${bvPapel === 'adotante'}">Quero adotar</button><button type="button" data-p="protetor" aria-pressed="${bvPapel === 'protetor'}">Cuido de gatos de rua</button></div></div>
      <label class="field"><span>Nome</span><input class="inp" name="name" required maxlength="40" autocomplete="given-name" value="${esc(p.display_name && p.display_name !== 'Amigo dos gatos' ? p.display_name : '')}">${bvPapel === 'protetor' ? '<small>Aparece nos teus anúncios.</small>' : ''}</label>
      <div class="two"><label class="field"><span>Distrito</span><select class="inp" name="district" required><option value="">Escolhe</option>${api.DISTRITOS.map(d => `<option ${d === p.district ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field"><span>Cidade</span><input class="inp" name="city" required maxlength="60" value="${esc(p.city || '')}"></label></div>
      ${bvPapel === 'protetor' ? `<label class="field"><span>WhatsApp (opcional)</span><input class="inp" name="whatsapp" inputmode="tel" placeholder="912 345 678" maxlength="20"><small>Só aparece a quem tem conta e pede para conhecer um gato teu. Sem WhatsApp, mostramos o teu email.</small></label>` : ''}
      <label class="check"><input type="checkbox" name="adulto" required><span>Tenho 18 anos ou mais e aceito as <a href="#ajuda">regras do Ronron</a> e a ${linkPrivacidade()}.</span></label>
      <p class="err-msg" id="bv-err" role="alert" hidden></p>
      <button class="primary">Começar</button>
      <button type="button" class="btn2" id="bv-sair">Agora não, terminar sessão</button>
    </form>`);
  makeRonron($('.st-rr', s), { size: 130, pose: 'feliz', base: 'gente' }).seq([['feliz', 1000], ['beijinho', 900]], 'gente');
  $$('[data-p]', s).forEach(b => b.onclick = () => { const f = $('#bv', s); const keep = { name: f.name.value, district: f.district.value, city: f.city.value };
    bvPapel = b.dataset.p; S.me.perfil = { ...p, display_name: keep.name || p.display_name, district: keep.district || p.district, city: keep.city || p.city }; renderBoasVindas(view); });
  $('#bv-sair', s).onclick = async () => { await api.sairGoogle(); await api.sb.auth.signOut(); S.me = null; rotear('feed'); };
  $('#bv', s).onsubmit = async e => { e.preventDefault(); const f = e.target, err = $('#bv-err');
    const mostrar = t => { err.textContent = t; err.hidden = false; go(err, { x: [0, -6, 6, -3, 0] }, { duration: .35 }); };
    if(!f.name.value.trim() || !f.district.value || !f.city.value.trim()) return mostrar('Preenche o nome, o distrito e a cidade.');
    if(!f.adulto.checked) return mostrar('Para usar o Ronron tens de ter 18 anos ou mais e aceitar as regras.');
    const b = $('button.primary', f); b.disabled = true;
    try{ await api.completarPerfil({ role: bvPapel, nome: f.name.value.trim(), distrito: f.district.value, cidade: f.city.value.trim(), whatsapp: f.whatsapp?.value.trim(), adulto: true }); }
    catch(x){ b.disabled = false; return mostrar(erroPT(x)); }
    await carregarMe(); confetti(b); hdr.seq([['feliz', 900]], 'logo'); hdr.say(`Olá, ${S.me?.perfil?.display_name || ''}!`, 2000);
    rotear(bvPapel === 'protetor' ? 'meus' : 'feed');
  };
}
function montarCaptcha(){
  const el = $('#captcha'); if(!el) return; captchaToken = null;
  const render = () => { try{ captchaId = window.turnstile.render(el, { sitekey: api.ENV.turnstile, language: 'pt-PT', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    callback: t => captchaToken = t, 'expired-callback': () => captchaToken = null, 'error-callback': () => { captchaToken = null; el.innerHTML = '<p class="err-msg">A verificação anti-robô não carregou. Verifica a ligação e volta a abrir este ecrã.</p>'; } }); }catch{} };
  if(window.turnstile) return render();
  if(!document.getElementById('ts-js')){ const sc = document.createElement('script'); sc.id = 'ts-js'; sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true; sc.onload = render; document.head.appendChild(sc); }
  else setTimeout(render, 300);
}
async function entrar(f, view){
  const err = $('#auth-err'); err.hidden = true; const mostrar = t => { err.textContent = t; err.hidden = false; go(err, { x: [0, -6, 6, -3, 0] }, { duration: .35 }); };
  if(!f.email.value.trim() || f.pass.value.length < (modo === 'entrar' ? 6 : 8)) return mostrar('Preenche o email e a palavra-passe.');
  if(modo === 'registar'){
    if(!f.name.value.trim() || !f.district.value || !f.city.value.trim()) return mostrar('Preenche o nome, o distrito e a cidade.');
    if(!f.adulto.checked) return mostrar('Para criar conta tens de ter 18 anos ou mais e aceitar as regras.');
  }
  if(api.ENV.turnstile && !captchaToken) return mostrar('Confirma primeiro a verificação anti-robô.');
  const b = $('button.primary', f); b.disabled = true; const txt = b.textContent; b.textContent = 'Um momento…';
  const extra = captchaToken ? { captchaToken } : {};
  let res;
  try{
    res = modo === 'entrar' ? await api.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pass.value, options: extra })
      : await api.sb.auth.signUp({ email: f.email.value.trim(), password: f.pass.value, options: { ...extra, data: { role: papel, termos: true, display_name: f.name.value.trim(), district: f.district.value, city: f.city.value.trim(), whatsapp: f.whatsapp?.value.trim() || null } } });
  }catch(e){ res = { error: e }; }
  b.disabled = false; b.textContent = txt; try{ window.turnstile?.reset(captchaId); }catch{} captchaToken = null;
  if(res.error) return mostrar(erroPT(res.error));
  if(modo === 'registar' && !res.data.session) return mostrar('Conta criada. Confirma o teu email para entrares.');
  await carregarMe(); hdr.seq([['feliz', 900]], 'logo'); hdr.say(`Olá, ${S.me?.perfil?.display_name || ''}!`, 2000);
  rotear(S.me?.perfil?.role === 'protetor' ? 'meus' : 'feed');
}
async function perfil(view){
  const p = S.me.perfil || {};
  const s = pagina(view, `<div class="reveal" style="display:flex;align-items:center;gap:16px"><span class="st-rr"></span><div><h1 class="page-title">Olá, ${esc(p.display_name || '')}</h1>
      <p class="lead" style="margin:4px 0 0">${p.role === 'protetor' ? 'Conta de protetor' : 'Conta de adotante'}${p.is_admin ? ' · administração' : ''}</p></div></div>
    <form class="card-s form reveal" id="perfil"><h2>O teu perfil</h2>
      <label class="field"><span>Nome</span><input class="inp" name="name" maxlength="40" value="${esc(p.display_name || '')}"></label>
      <div class="two"><label class="field"><span>Distrito</span><select class="inp" name="district"><option value="">Escolhe</option>${api.DISTRITOS.map(d => `<option ${d === p.district ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field"><span>Cidade</span><input class="inp" name="city" maxlength="60" value="${esc(p.city || '')}"></label></div>
      ${p.role === 'protetor' ? `<label class="field"><span>WhatsApp</span><input class="inp" name="whatsapp" inputmode="tel" maxlength="20" value="${esc(p.whatsapp || '')}"><small>Só é mostrado a quem tem conta e pede para conhecer um gato teu.</small></label>` : ''}
      <p class="err-msg" id="perfil-err" hidden></p>
      <div class="row-btns"><button class="primary sm">Guardar</button></div></form>
    ${p.role !== 'protetor' ? `<div class="card-s reveal"><h2>Cuidas de gatos de rua?</h2><p class="muted" style="margin:0">Passa a protetor para publicares gatos. Quem quiser adotar fala diretamente contigo.</p><div class="row-btns"><button class="btn2" id="ser-prot">${icon('house-line')}Passar a protetor</button></div></div>` : ''}
    <div class="card-s reveal">
      ${p.is_admin ? `<a class="linkrow" href="#admin">${icon('list-checks')}<span class="grow">Administração</span>${icon('caret-right', 'i chev')}</a>` : ''}
      <a class="linkrow" href="#definicoes">${icon('gear')}<span class="grow">Definições</span>${icon('caret-right', 'i chev')}</a>
      <a class="linkrow" href="#ajuda">${icon('question')}<span class="grow">Ajuda e FeLV</span>${icon('caret-right', 'i chev')}</a>
      ${api.ENV.doacoes ? `<a class="linkrow" href="#apoiar">${icon('hand-heart')}<span class="grow">Apoiar</span>${icon('caret-right', 'i chev')}</a>` : ''}
      <button class="linkrow" id="sair">${icon('sign-out')}<span class="grow" style="text-align:left">Terminar sessão</span></button>
    </div>`);
  makeRonron($('.st-rr', s), { size: 96, pose: 'gente', base: 'gente' }).react('repouso');
  $('#perfil', s).onsubmit = async e => { e.preventDefault(); const f = e.target, er = $('#perfil-err');
    let r = await api.sb.from('profiles').update({ display_name: f.name.value.trim(), city: f.city.value.trim() || null, district: f.district.value || null }).eq('id', S.me.user.id);
    if(!r.error && f.whatsapp){ const tel = f.whatsapp.value.replace(/[^0-9+ ]/g, '').trim(); r = await api.sb.from('profile_contacts').upsert({ profile_id: S.me.user.id, whatsapp: tel || null }); }
    if(r.error){ er.textContent = erroPT(r.error); er.hidden = false; return; }
    await carregarMe(); toast('Perfil guardado', 'check'); };
  $('#ser-prot', s)?.addEventListener('click', async () => {
    const w = await dialogo({ titulo: 'Passar a protetor', texto: 'O teu WhatsApp, para os adotantes falarem contigo. Só aparece a quem tem conta e pede para conhecer um gato teu.', campo: { tipo: 'tel', max: 20, placeholder: '912 345 678', obrigatorio: true }, ok: 'Passar a protetor' });
    if(w === null) return; const tel = w.replace(/[^0-9+ ]/g, '');
    if(!/^\+?[0-9 ]{9,20}$/.test(tel)) return toast('Número de WhatsApp inválido.', 'warning');
    let r = await api.sb.from('profiles').update({ role: 'protetor' }).eq('id', S.me.user.id);
    if(!r.error) r = await api.sb.from('profile_contacts').upsert({ profile_id: S.me.user.id, whatsapp: tel, email: S.me.user.email });
    if(r.error) return toast(erroPT(r.error), 'warning'); await carregarMe(); rotear('meus');
  });
  $('#sair', s).onclick = async () => { await api.sairGoogle(); await api.sb.auth.signOut(); S.me = null; toast('Sessão terminada', 'sign-out'); rotear('feed'); };
}

// ---------------- Os meus gatos (protetor) ----------------
export async function renderMeus(view){
  if(!S.me) return estado(view, { pose: 'acenar', base: 'gente', titulo: 'Cuidas de gatos de rua?', texto: 'Cria uma conta de protetor e publica-os. Quem quiser adotar fala diretamente contigo.', botao: 'Criar conta', acao: () => { modo = 'registar'; papel = 'protetor'; rotear('conta'); } });
  if(S.me.perfil?.role !== 'protetor') return estado(view, { pose: 'gente', titulo: 'Esta zona é para protetores', texto: 'Se cuidas de gatos de rua, passa a protetor no teu perfil.', botao: 'Ir para o perfil', acao: () => rotear('conta') });
  aCarregar(view);
  let lista; try{ lista = await api.meusGatos(S.me.user.id); }catch(e){ return estado(view, { pose: 'novelo', titulo: 'Enrolei-me um bocadinho', texto: esc(erroPT(e)), botao: 'Tentar de novo', acao: () => renderMeus(view) }); }
  if(!lista.length) return estado(view, { pose: 'fotografia', base: 'gente', titulo: 'Ainda não publicaste nenhum gato', texto: 'Uma boa fotografia faz toda a diferença: luz natural e o gato à altura dos olhos.', botao: 'Publicar um gato', acao: () => rotear('publicar') });
  const s = pagina(view, `<div class="reveal" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h1 class="page-title">Os meus gatos</h1><p class="lead">Muda o estado quando alguém os reservar ou adotar.</p></div>
      <button class="primary sm" id="novo">${icon('plus')}Novo gato</button></div>
    ${lista.map(a => { const p = capa(a); return `<div class="item reveal" data-id="${a.id}">${p ? `<img class="th" src="${api.foto(p.path)}" alt="">` : '<span class="th"></span>'}
      <div><h3>${esc(a.name)}</h3><div class="small muted">${idade(a.age_months)} · ${esc(a.city)}</div>
        <div style="margin-top:6px">${a.approved ? '<span class="pill ok">Visível no Ronron</span>' : '<span class="pill warn">À espera de aprovação</span>'}</div></div>
      <div class="seg" role="group" aria-label="Estado de ${esc(a.name)}">${[['disponivel', 'Disponível'], ['reservado', 'Reservado'], ['adotado', 'Adotado']].map(([v, t]) => `<button data-st="${v}" aria-pressed="${a.status === v}">${t}</button>`).join('')}</div>
      <div class="acts2"><button class="btn2" data-edit>${icon('pencil-simple')}Editar</button><button class="btn2" data-ver>${icon('eye')}Ver ficha</button></div></div>`; }).join('')}`);
  $('#novo', s).onclick = () => rotear('publicar');
  const by = Object.fromEntries(lista.map(a => [a.id, a]));
  $$('.item', s).forEach(it => { const a = by[it.dataset.id];
    $('[data-edit]', it).onclick = () => rotear('editar-' + a.id); $('[data-ver]', it).onclick = () => abrirFicha(a);
    $$('[data-st]', it).forEach(b => b.onclick = async () => { const st = b.dataset.st; if(st === a.status) return;
      const { error } = await api.sb.from('animals').update({ status: st }).eq('id', a.id); if(error) return toast(erroPT(error), 'warning');
      a.status = st; $$('[data-st]', it).forEach(x => x.setAttribute('aria-pressed', x.dataset.st === st)); vibrar();
      if(st === 'adotado') celebrar(a); else toast(st === 'reservado' ? `${a.name} está reservad${art(a)}` : `${a.name} está disponível`, 'check'); });
  });
}
export function celebrar(a){
  const c = $('#celebra'), b = $('#celebra-box');
  b.innerHTML = `<span class="ce-rr"></span><h2>${a.sex === 'femea' ? 'A' : 'O'} ${esc(a.name)} encontrou casa!</h2><p>Obrigado por cuidares ${a.sex === 'femea' ? 'dela' : 'dele'} até aqui. É por pessoas como tu que o Ronron existe.</p><button class="primary sm" id="ce-ok">Que bom</button>`;
  c.hidden = false; const r = makeRonron($('.ce-rr', b), { size: 150, pose: 'feliz', base: 'ronronar' }); r.react('adotado');
  go(c, { opacity: [0, 1] }, { duration: .25 }); go(b, { scale: [.85, 1], y: [30, 0] }, { type: 'spring', stiffness: 260, damping: 18 });
  setTimeout(() => confetti(b), 300); vibrar(true);
  $('#ce-ok').onclick = async () => { await go(b, { scale: [1, .9], opacity: [1, 0] }, { duration: .2 }).finished; c.hidden = true; };
}

// ---------------- Publicar / editar ----------------
let fotos = []; // { path?, file?, url, is_video }
const TRI = [['vaccinated', 'Vacinado', 'syringe'], ['dewormed', 'Desparasitado', 'pill'], ['sterilized', 'Esterilizado', 'scissors'], ['good_with_cats', 'Dá-se bem com gatos', 'cat'], ['good_with_dogs', 'Dá-se bem com cães', 'dog'], ['good_with_kids', 'Dá-se bem com crianças', 'baby']];
const triHTML = (k, t, ic, v) => `<div class="tri-row"><span class="ic">${icon(ic)}</span><span class="lbl">${t}</span><div class="seg" data-tri="${k}">${[['true', 'Sim'], ['false', 'Não'], ['', 'Não sei']].map(([x, l]) => `<button type="button" data-v="${x}" aria-pressed="${String(v ?? '') === x}">${l}</button>`).join('')}</div></div>`;
export async function renderPublicar(view, id){
  if(!S.me || S.me.perfil?.role !== 'protetor') return rotear('meus');
  let a = { district: S.me.perfil.district || '', city: S.me.perfil.city || '', felv: 'desconhecido', sex: 'desconhecido' }; fotos = [];
  if(id){ aCarregar(view); try{ a = await api.gato(id); fotos = a.animal_photos.map(p => ({ path: p.path, url: api.foto(p.path), is_video: p.is_video })); }catch(e){ return toast(erroPT(e), 'warning'); } }
  const s = pagina(view, `<div class="reveal"><h1 class="page-title">${id ? `Editar ${esc(a.name)}` : 'Novo gato'}</h1><p class="lead">${id ? 'Se mudares fotos ou textos, o anúncio volta a ser revisto antes de aparecer.' : 'Fica visível depois de aprovado. A adoção no Ronron é sempre gratuita.'}</p></div>
    <form class="form" id="pub" novalidate>
      <div class="card-s reveal"><h2>Fotografias</h2><p class="small muted" style="margin:0">Até 6. A primeira é a principal. Luz natural, o gato à altura dos olhos e uma com uma mão a fazer festas.</p><div class="photos" id="pg"></div></div>
      <div class="card-s reveal"><h2>Sobre ${id ? esc(a.name) : 'o gato'}</h2>
        <label class="field"><span>Nome</span><input class="inp" name="name" required maxlength="40" value="${esc(a.name || '')}"></label>
        <div class="field"><span>Sexo</span><div class="seg" data-one="sex">${[['femea', 'Fêmea'], ['macho', 'Macho'], ['desconhecido', 'Não sei']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${a.sex === v}">${t}</button>`).join('')}</div></div>
        <div class="two"><label class="field"><span>Idade (meses)</span><input class="inp" name="age" type="number" min="0" max="360" inputmode="numeric" value="${a.age_months ?? ''}" placeholder="ex.: 18"></label>
          <label class="field"><span>Cor ou padrão</span><input class="inp" name="color" maxlength="60" value="${esc(a.color || '')}" placeholder="ex.: ruivo às riscas"></label></div>
        <label class="field"><span>Feitio (3 palavras)</span><input class="inp" name="personality" maxlength="80" value="${esc(a.personality || '')}" placeholder="meigo, brincalhão, curioso"></label>
        <label class="field"><span>A história ${id ? art(a) === 'a' ? 'dela' : 'dele' : 'do gato'}</span><textarea class="inp" name="desc" maxlength="1500" placeholder="Onde apareceu, do que gosta, como é em casa.">${esc(a.description || '')}</textarea></label>
        <label class="field"><span>Algo único</span><input class="inp" name="unique" maxlength="140" value="${esc(a.unique_trait || '')}" placeholder="ex.: segue-te até à porta"></label></div>
      <div class="card-s reveal"><h2>Saúde e feitio</h2>
        ${TRI.map(([k, t, ic]) => triHTML(k, t, ic, a[k])).join('')}
        <label class="field"><span>FeLV</span><select class="inp" name="felv"><option value="desconhecido">Ainda não testado</option><option value="negativo" ${a.felv === 'negativo' ? 'selected' : ''}>Negativo</option><option value="positivo" ${a.felv === 'positivo' ? 'selected' : ''}>Positivo</option></select></label></div>
      <div class="card-s reveal"><h2>Onde está</h2>
        <div class="two"><label class="field"><span>Distrito</span><select class="inp" name="district" required><option value="">Escolhe</option>${api.DISTRITOS.map(d => `<option ${d === a.district ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
          <label class="field"><span>Cidade ou vila</span><input class="inp" name="city" required maxlength="60" value="${esc(a.city || '')}"></label></div>
        <small class="muted">Não ponhas a morada exata.</small></div>
      <p class="err-msg" id="pub-err" role="alert" hidden></p>
      <div class="row-btns reveal"><button class="primary" id="pub-b">${id ? 'Guardar' : 'Publicar'}</button></div>
      ${id ? `<div class="row-btns reveal" style="justify-content:center"><button type="button" class="btn2 danger" id="apagar">${icon('trash')}Apagar anúncio</button></div>` : ''}
    </form>`);
  desenharFotos();
  $$('[data-tri] button, [data-one] button', s).forEach(b => b.onclick = () => { $$('button', b.parentNode).forEach(x => x.setAttribute('aria-pressed', x === b)); vibrar(); });
  $('#pub', s).onsubmit = e => { e.preventDefault(); guardar(e.target, a, id); };
  $('#apagar', s)?.addEventListener('click', async () => {
    if(!await dialogo({ titulo: `Apagar ${a.name}?`, texto: 'O anúncio, as fotografias e os vídeos são apagados. Não dá para desfazer.', ok: 'Apagar', perigo: true })) return;
    try{ await api.apagarAnimal(a.id); toast('Anúncio apagado', 'trash'); rotear('meus'); }catch(err){ toast(erroPT(err), 'warning'); }
  });
}
function desenharFotos(){
  const g = $('#pg'); if(!g) return;
  g.innerHTML = fotos.map((p, i) => `<div class="ph-cell">${p.is_video ? `<video src="${p.url}" muted playsinline></video>` : `<img src="${p.url}" alt="">`}${i === 0 ? '<span class="first">Principal</span>' : ''}<button type="button" class="x" data-i="${i}" aria-label="Tirar">${icon('x')}</button></div>`).join('')
    + (fotos.length < 6 ? `<button type="button" class="ph-add" id="add">${icon('camera')}Adicionar</button>` : '');
  $$('.x', g).forEach(b => b.onclick = () => { fotos.splice(+b.dataset.i, 1); desenharFotos(); });
  $('#add', g)?.addEventListener('click', async () => { const fs = await escolherFotos(6 - fotos.length);
    for(const f of fs){ const v = f.type.startsWith('video'); if(v && f.size > 10e6){ toast('Vídeo demasiado grande (máximo 10 MB).', 'warning'); continue; } fotos.push({ file: f, url: URL.createObjectURL(f), is_video: v }); }
    desenharFotos(); });
}
async function guardar(f, a, id){
  const err = $('#pub-err'), b = $('#pub-b'); err.hidden = true;
  const falha = t => { err.textContent = t; err.hidden = false; b.disabled = false; b.textContent = id ? 'Guardar' : 'Publicar'; go(err, { x: [0, -6, 6, -3, 0] }, { duration: .35 }); };
  if(!fotos.length) return falha('Põe pelo menos uma fotografia.');
  if(!f.name.value.trim() || !f.district.value || !f.city.value.trim()) return falha('Preenche o nome, o distrito e a cidade.');
  b.disabled = true; b.textContent = 'A guardar…';
  const tri = k => { const v = $(`[data-tri="${k}"] [aria-pressed="true"]`)?.dataset.v; return v === 'true' ? true : v === 'false' ? false : null; };
  const row = { name: f.name.value.trim(), sex: $('[data-one="sex"] [aria-pressed="true"]')?.dataset.v || 'desconhecido', age_months: f.age.value === '' ? null : +f.age.value,
    color: f.color.value.trim() || null, personality: f.personality.value.trim() || null, description: f.desc.value.trim() || null, unique_trait: f.unique.value.trim() || null,
    felv: f.felv.value, district: f.district.value, city: f.city.value.trim(), vaccinated: tri('vaccinated'), dewormed: tri('dewormed'), sterilized: tri('sterilized'),
    good_with_cats: tri('good_with_cats'), good_with_dogs: tri('good_with_dogs'), good_with_kids: tri('good_with_kids') };
  let animalId = id;
  if(id){ const { error } = await api.sb.from('animals').update(row).eq('id', id); if(error) return falha(erroPT(error)); }
  else { const { data, error } = await api.sb.from('animals').insert({ ...row, owner_id: S.me.user.id }).select('id').single(); if(error) return falha(erroPT(error)); animalId = data.id; }
  const lista = [];
  for(let i = 0; i < fotos.length; i++){ const p = fotos[i];
    if(!p.path){ b.textContent = `A enviar fotografia ${i + 1} de ${fotos.length}…`;
      let blob = p.file, ext = (p.file.name.split('.').pop() || 'jpg').toLowerCase(), type = p.file.type;
      if(!p.is_video){ const r = await reduzir(p.file); if(r){ blob = r.blob; ext = r.ext; type = r.type; } else if(/hei[cf]/i.test(type + ext)) return falha('Esta fotografia está em HEIC. No iPhone escolhe "Mais compatível" em Definições > Câmara > Formatos.'); }
      const path = `${S.me.user.id}/${animalId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await api.sb.storage.from('animal-photos').upload(path, blob, { contentType: type }); if(error) return falha(erroPT(error)); p.path = path; }
    lista.push({ path: p.path, is_video: p.is_video }); }
  const { data: orfaos, error: pe } = await api.sb.rpc('guardar_fotos', { p_animal: animalId, p_fotos: lista }); if(pe) return falha(erroPT(pe));
  if(orfaos?.length) await api.sb.storage.from('animal-photos').remove(orfaos);
  // momento "orgulhoso da fotografia"
  const c = $('#celebra'), bx = $('#celebra-box');
  bx.innerHTML = `<span class="ce-rr"></span><h2>${id ? 'Guardado' : 'Publicado!'}</h2><p>${id ? 'As alterações ficam visíveis depois de revistas.' : `Que fotografia bonita! ${row.sex === 'femea' ? 'A' : 'O'} ${esc(row.name)} aparece no Ronron depois de aprovad${row.sex === 'femea' ? 'a' : 'o'}.`}</p><button class="primary sm" id="ce-ok">Ver os meus gatos</button>`;
  c.hidden = false; makeRonron($('.ce-rr', bx), { size: 150, pose: 'fotografia', base: 'fotografia' }).react('publicar');
  go(bx, { scale: [.85, 1], y: [30, 0] }, { type: 'spring', stiffness: 260, damping: 18 });
  $('#ce-ok').onclick = () => { c.hidden = true; rotear('meus'); };
}

// ---------------- Administração ----------------
export async function renderAdmin(view){
  if(!S.me?.perfil?.is_admin) return rotear('feed');
  aCarregar(view);
  let pend, reps; try{ [pend, reps] = await Promise.all([api.pendentes(), api.denuncias()]); }catch(e){ return estado(view, { pose: 'novelo', titulo: 'Enrolei-me um bocadinho', texto: esc(erroPT(e)), botao: 'Tentar de novo', acao: () => renderAdmin(view) }); }
  const s = pagina(view, `<div class="reveal"><h1 class="page-title">Administração</h1><p class="lead"><b class="count" data-n="${pend.length}">0</b> por aprovar · <b class="count" data-n="${reps.length}">0</b> denúncias abertas</p></div>
    <div class="card-s reveal"><h2>Por aprovar</h2>${pend.length ? pend.map(a => { const p = capa(a); return `<div class="item" data-id="${a.id}" style="box-shadow:none;background:var(--bg)">${p ? `<img class="th" src="${api.foto(p.path)}" alt="">` : '<span class="th"></span>'}
      <div><h3>${esc(a.name)}</h3><div class="small muted">${esc(a.city)}, ${esc(a.district)} · por ${esc(a.profiles?.display_name || 'protetor')}</div></div>
      <div class="acts2"><button class="btn2" data-ver>${icon('eye')}Ver</button><button class="btn2" data-ok>${icon('check')}Aprovar</button><button class="btn2 danger" data-no>${icon('trash')}Remover</button></div></div>`; }).join('')
      : '<div class="state-box" style="padding:12px"><span id="ad-rr"></span><span>Nada pendente.</span></div>'}</div>
    <div class="card-s reveal"><h2>Denúncias</h2>${reps.length ? reps.map(r => `<div class="item" data-r="${r.id}" style="grid-template-columns:1fr;box-shadow:none;background:var(--bg)"><div><b>${esc(r.animals?.name || 'Anúncio apagado')}</b><p style="margin:4px 0 0">${esc(r.reason)}</p></div>
      <div class="acts2">${r.animals ? `<button class="btn2" data-rver="${r.animals.id}">${icon('eye')}Ver</button><button class="btn2 danger" data-rdel="${r.animals.id}">${icon('trash')}Remover anúncio</button>` : ''}<button class="btn2" data-res>${icon('check')}Resolvida</button></div></div>`).join('')
      : '<p class="muted" style="margin:0">Sem denúncias abertas.</p>'}</div>`);
  if($('#ad-rr', s)) makeRonron($('#ad-rr', s), { size: 90, pose: 'ronronar', base: 'ronronar' });
  const by = Object.fromEntries(pend.map(a => [a.id, a]));
  $$('[data-id]', s).forEach(it => { const a = by[it.dataset.id];
    $('[data-ver]', it).onclick = () => abrirFicha(a);
    $('[data-ok]', it).onclick = async () => { const { error } = await api.sb.from('animals').update({ approved: true }).eq('id', a.id); if(error) return toast(erroPT(error), 'warning');
      await go(it, { opacity: [1, 0], x: [0, 40] }, { duration: .3 }).finished; toast(`${a.name} aprovad${art(a)}`, 'check'); renderAdmin(view); };
    $('[data-no]', it).onclick = async () => { if(!await dialogo({ titulo: `Remover ${a.name}?`, texto: 'O anúncio e as fotografias são apagados.', ok: 'Remover', perigo: true })) return;
      try{ await api.apagarAnimal(a.id); toast('Removido', 'trash'); renderAdmin(view); }catch(e){ toast(erroPT(e), 'warning'); } };
  });
  $$('[data-r]', s).forEach(it => {
    $('[data-res]', it).onclick = async () => { await api.sb.from('reports').update({ resolved: true }).eq('id', it.dataset.r); renderAdmin(view); };
    $('[data-rver]', it)?.addEventListener('click', async () => abrirFicha(await api.gato($('[data-rver]', it).dataset.rver)));
    $('[data-rdel]', it)?.addEventListener('click', async () => { if(!await dialogo({ titulo: 'Remover este anúncio?', ok: 'Remover', perigo: true })) return; try{ await api.apagarAnimal($('[data-rdel]', it).dataset.rdel); renderAdmin(view); }catch(e){ toast(erroPT(e), 'warning'); } });
  });
}

// ---------------- Ajuda e FeLV ----------------
export function renderAjuda(view){
  const s = pagina(view, `<div class="reveal" style="display:flex;gap:16px;align-items:center"><span class="st-rr"></span><div><h1 class="page-title">Ajuda</h1><p class="lead" style="margin:4px 0 0">Como funciona, as regras e o que é a FeLV.</p></div></div>
    <div class="card-s reveal"><h2>Como funciona</h2>
      <p style="margin:0"><b>Desliza para a direita</b> nos gatos de que gostas: ficam nos Favoritos. Para a esquerda, passas.</p>
      <p style="margin:0"><b>Quero conhecer</b> mostra o contacto de quem cuida do gato. Falam diretamente, sem intermediários.</p>
      <p style="margin:0"><b>Cuidas de gatos de rua?</b> Cria uma conta de protetor e publica-os.</p></div>
    <div class="card-s reveal"><h2>Regras</h2>
      <p style="margin:0">A adoção é <b>sempre gratuita</b>. Vender animais é proibido e leva à remoção da conta.</p>
      <p style="margin:0">Nunca pagues adiantado por transporte, vacinas ou "reserva". É a burla mais comum.</p>
      <p style="margin:0">Conhece o gato pessoalmente antes de adotar. Viste algo estranho? Usa "Denunciar anúncio".</p>
      <p style="margin:0">O contacto dos protetores só aparece a quem tem conta. Não publiques moradas exatas. O Ronron é só para maiores de 18 anos.</p></div>
    <div class="card-s reveal"><h2>O que é a FeLV?</h2>
      <p style="margin:0">É o vírus da leucemia felina. <b>Só passa entre gatos</b> (não passa para pessoas nem cães), sobretudo pela saliva, lambidelas e lutas.</p>
      <p style="margin:0">Um gato FeLV positivo pode viver vários anos feliz. Precisa de viver dentro de casa, ser o único gato ou viver só com outros FeLV positivos, e ir ao veterinário com mais regularidade.</p>
      <p style="margin:0" class="muted">Estes gatos são os que mais esperam por casa. Se puderes, dá-lhes uma oportunidade.</p></div>
    <div class="card-s reveal"><h2>Privacidade</h2>${linksPrivacidade()}</div>
    <p class="small muted reveal" style="text-align:center;margin:0">O Ronron só põe pessoas em contacto. A responsabilidade da adoção é de quem adota e de quem dá.</p>`);
  makeRonron($('.st-rr', s), { size: 96, pose: 'ler', base: 'ler' }).react('ficha');
}

// ---------------- Definições ----------------
export function renderDefinicoes(view){
  const s = pagina(view, `<div class="reveal"><h1 class="page-title">Definições</h1></div>
    <div class="card-s reveal"><h2>Aparência</h2><div class="field"><span>Tema</span><div class="seg" id="tema">${[['claro', 'Claro'], ['escuro', 'Escuro'], ['auto', 'Automático']].map(([v, t]) => `<button data-v="${v}" aria-pressed="${S.tema === v}">${t}</button>`).join('')}</div></div></div>
    <div class="card-s reveal"><h2>Ronron</h2><div style="display:flex;gap:16px;align-items:center"><span class="st-rr"></span><div class="seg" id="modo" style="flex:1">${[['ativo', 'Ativo'], ['calmo', 'Calmo'], ['desligado', 'Desligado']].map(([v, t]) => `<button data-v="${v}" aria-pressed="${RR.mode === v}">${t}</button>`).join('')}</div></div>
      <p class="small muted" style="margin:0">Calmo: sem saltos nem aparições espontâneas. Desligado: o Ronron fica quieto, como logo. De noite fica calmo sozinho.</p></div>
    ${nativo ? `<div class="card-s reveal"><h2>Notificações</h2><p class="small muted" style="margin:0">Avisamos-te quando um gato teu for aprovado.</p><div class="row-btns"><button class="btn2" id="notif">${icon('bell')}Permitir notificações</button></div></div>` : ''}
    ${S.me ? `<div class="card-s reveal"><h2>Conta</h2><button class="linkrow" id="sair2">${icon('sign-out')}<span class="grow" style="text-align:left">Terminar sessão</span></button>
      <button class="linkrow" id="apagar-conta" style="color:#B4432E">${icon('trash')}<span class="grow" style="text-align:left">Apagar a minha conta</span></button></div>` : ''}
    <div class="card-s reveal"><h2>Privacidade</h2>${linksPrivacidade()}</div>
    <div class="card-s reveal"><h2>Sobre</h2><p class="small muted" style="margin:0">Ronron ${__VERSAO__} · ${api.ENV.ambiente === 'staging' ? 'ambiente de testes' : 'produção'}</p></div>`);
  const rr = makeRonron($('.st-rr', s), { size: 72, pose: 'gente', base: 'gente' });
  $$('#tema button', s).forEach(b => b.onclick = () => { S.tema = b.dataset.v; LS.set('tema', S.tema); aplicarTema(); $$('#tema button', s).forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $$('#modo button', s).forEach(b => b.onclick = () => { definirModo(b.dataset.v); $$('#modo button', s).forEach(x => x.setAttribute('aria-pressed', x === b)); rr.react(b.dataset.v === 'ativo' ? 'brincar' : 'bocejar'); });
  $('#notif', s)?.addEventListener('click', async () => { const { LocalNotifications } = await import('@capacitor/local-notifications'); const p = await LocalNotifications.requestPermissions(); toast(p.display === 'granted' ? 'Notificações ligadas' : 'Notificações desligadas', 'bell'); });
  $('#sair2', s)?.addEventListener('click', async () => { await api.sairGoogle(); await api.sb.auth.signOut(); S.me = null; rotear('feed'); });
  $('#apagar-conta', s)?.addEventListener('click', async () => {
    const v = await dialogo({ titulo: 'Apagar a tua conta?', texto: 'Apagamos o teu perfil, os teus gatos, fotografias, favoritos e contactos. Não dá para desfazer. Escreve APAGAR para confirmar.', campo: { max: 10, obrigatorio: true, placeholder: 'APAGAR' }, ok: 'Apagar tudo', perigo: true });
    if(v === null) return; if(v.toUpperCase() !== 'APAGAR') return toast('Não apagámos nada.', 'info');
    try{ await api.apagarConta(S.me.user.id); S.me = null; LS.set('favs', []); S.favs = []; hdr.seq([['triste', 1600]], 'logo'); toast('Conta apagada. Obrigado por teres passado por cá.', 'check'); rotear('feed'); }
    catch(e){ toast(erroPT(e), 'warning'); }
  });
}

// ---------------- Apoiar (construído, desligado por omissão) ----------------
export function renderApoiar(view){
  if(!api.ENV.doacoes) return rotear('feed');
  pagina(view, `<div class="reveal"><h1 class="page-title">Apoiar</h1><p class="lead">Em preparação.</p></div>`);
}
