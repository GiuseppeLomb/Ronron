// Ligação ao Supabase e consultas da app. Só chaves públicas: a segurança está nas regras da base de dados (RLS) e nas funções.
import { createClient } from '@supabase/supabase-js';

export const ENV = {
  url: import.meta.env.VITE_SB_URL,
  key: import.meta.env.VITE_SB_KEY,
  turnstile: import.meta.env.VITE_TURNSTILE || '',
  ambiente: import.meta.env.VITE_AMBIENTE || 'staging',
  doacoes: import.meta.env.VITE_DOACOES === 'true',   // apoio a uma associação: desligado por omissão
  google: import.meta.env.VITE_GOOGLE_WEB_CLIENT || '',  // cliente Web do Google (público): audiência do token
  privacidade: import.meta.env.VITE_URL_PRIVACIDADE || '',
  apagarConta: import.meta.env.VITE_URL_APAGAR || '',
};
export const sb = createClient(ENV.url, ENV.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ronron.sessao' },
});
export const foto = p => `${ENV.url}/storage/v1/object/public/animal-photos/${p}`;
export const DISTRITOS = ['Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria','Lisboa','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu','Madeira','Açores'];

const SEL = '*, animal_photos(path,position,is_video), profiles!animals_owner_id_fkey(display_name)';
const ordena = a => { if(a) a.animal_photos = (a.animal_photos || []).sort((x, y) => x.position - y.position); return a; };

function filtra(q, f){
  q = q.eq('approved', true).neq('status', 'adotado');
  if(f.district) q = q.eq('district', f.district);
  if(f.felvNeg) q = q.eq('felv', 'negativo');
  if(f.young) q = q.lte('age_months', 24);
  if(f.cats) q = q.eq('good_with_cats', true);
  if(f.vac) q = q.eq('vaccinated', true);
  if(f.dew) q = q.eq('dewormed', true);
  if(f.ster) q = q.eq('sterilized', true);
  return q;
}
export async function feed(f){
  const { data, error } = await filtra(sb.from('animals').select(SEL), f).order('created_at', { ascending: false }).limit(80);
  if(error) throw error; return data.map(ordena);
}
export async function contar(f){
  const { count, error } = await filtra(sb.from('animals').select('id', { count: 'exact', head: true }), f);
  if(error) throw error; return count ?? 0;
}
export async function gato(id){
  const { data, error } = await sb.from('animals').select(SEL).eq('id', id).maybeSingle();
  if(error) throw error; return ordena(data);
}
export async function gatos(ids){
  if(!ids.length) return [];
  const { data, error } = await sb.from('animals').select(SEL).in('id', ids);
  if(error) throw error; return data.map(ordena);
}
export async function meusGatos(uid){
  const { data, error } = await sb.from('animals').select(SEL).eq('owner_id', uid).order('created_at', { ascending: false });
  if(error) throw error; return data.map(ordena);
}
export async function pendentes(){
  const { data, error } = await sb.from('animals').select(SEL).eq('approved', false).order('created_at');
  if(error) throw error; return data.map(ordena);
}
export async function denuncias(){
  const { data, error } = await sb.from('reports').select('*, animals(id,name)').eq('resolved', false).order('created_at', { ascending: false });
  if(error) throw error; return data;
}
export async function meuPerfil(){
  const { data, error } = await sb.rpc('meu_perfil'); if(error) throw error; return data?.[0] || null;
}
export async function revelarContacto(animalId){
  const { data, error } = await sb.rpc('revelar_contacto', { p_animal: animalId }); if(error) throw error; return data?.[0] || null;
}
export async function gostos(){
  const { data, error } = await sb.from('swipes').select('animal_id,liked,created_at').order('created_at', { ascending: false }).limit(1000);
  if(error) throw error; return data;
}
export async function registarSwipe(uid, animalId, liked){
  return sb.from('swipes').upsert({ user_id: uid, animal_id: animalId, liked });
}
export async function apagarAnimal(id){
  const { data: fotos } = await sb.from('animal_photos').select('path').eq('animal_id', id);
  const { error } = await sb.from('animals').delete().eq('id', id);
  if(error) throw error;
  if(fotos?.length) await sb.storage.from('animal-photos').remove(fotos.map(f => f.path));
}
export async function apagarConta(uid){
  // primeiro os ficheiros (o Storage não permite apagar por SQL), depois o utilizador e tudo em cascata
  const { data: meus } = await sb.from('animals').select('id').eq('owner_id', uid);
  for(const a of meus || []){
    const { data: fs } = await sb.storage.from('animal-photos').list(`${uid}/${a.id}`);
    if(fs?.length) await sb.storage.from('animal-photos').remove(fs.map(f => `${uid}/${a.id}/${f.name}`));
  }
  const { error } = await sb.rpc('apagar_conta'); if(error) throw error;
  await sairGoogle();
  await sb.auth.signOut({ scope: 'local' });
}

// ---------- Login com Google (nativo no Android, Credential Manager) ----------
// O Google assina um token com o nonce em SHA-256; o Supabase recebe o nonce original e confirma que o token é novo e para o Ronron.
let googlePronto = null;
async function google(){
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if(!googlePronto) googlePronto = SocialLogin.initialize({ google: { webClientId: ENV.google, mode: 'online', skipAuthOnlyAuthorizationAfterSignIn: true } });
  await googlePronto; return SocialLogin;
}
const sha256 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
export async function entrarGoogle(captchaToken){
  const SocialLogin = await google();
  const nonce = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  let res;
  try{ res = await SocialLogin.login({ provider: 'google', options: { nonce: await sha256(nonce) } }); }
  catch(e){ const m = String(e?.message || e); if(/cancel/i.test(m)) return { cancelado: true }; throw new Error('google_falhou: ' + m); }
  const token = res?.result?.idToken; if(!token) throw new Error('google_falhou: sem token');
  const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token, nonce, options: captchaToken ? { captchaToken } : {} });
  if(error){ try{ await SocialLogin.logout({ provider: 'google' }); }catch{} throw error; }
  return data;
}
export async function sairGoogle(){ try{ if(ENV.google) await (await google()).logout({ provider: 'google' }); }catch{} }
export async function completarPerfil(v){
  const { error } = await sb.rpc('completar_perfil', { p_role: v.role, p_nome: v.nome, p_distrito: v.distrito, p_cidade: v.cidade, p_whatsapp: v.whatsapp || null, p_adulto_e_regras: v.adulto });
  if(error) throw error;
}
