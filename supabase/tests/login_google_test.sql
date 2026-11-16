-- Testes do login com Google: primeiro login, sem junção automática de contas e apagar conta Google.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(12);
create temp table r(n serial, t text); grant all on r to public; grant all on sequence r_n_seq to public;

-- conta Google nova (sem papel, sem termos) e conta email+palavra-passe já existente
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-0000000000c1','gina@gmail.com','{"name":"Gina Silva","email":"gina@gmail.com","email_verified":true}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000c2','rui@gmail.com','{"role":"adotante","display_name":"Rui","termos":"true"}','authenticated','authenticated');
insert into auth.identities (provider_id, user_id, identity_data, provider) values
 ('1111','00000000-0000-0000-0000-0000000000c1','{"sub":"1111","email":"gina@gmail.com"}','google'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c2','{"sub":"00000000-0000-0000-0000-0000000000c2","email":"rui@gmail.com"}','email');

insert into r(t) select is((select display_name from profiles where id='00000000-0000-0000-0000-0000000000c1'), 'Gina', 'conta Google: nome inicial é o primeiro nome, não o email');
insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('2222','00000000-0000-0000-0000-0000000000c2','{"sub":"2222","email":"rui@gmail.com"}','google')$$,
  'P0003', null, 'login Google não se junta a conta com palavra-passe do mesmo email');
insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','{"sub":"x"}','email')$$,
  'P0003', null, 'palavra-passe não se junta a conta Google');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
insert into r(t) select is((select perfil_completo from meu_perfil()), false, 'conta Google começa com o perfil por completar');
insert into r(t) select throws_ok($$select completar_perfil('protetor','Gina','Porto','Porto','912 345 678', false)$$, '22023', null, 'sem 18+ e regras não completa');
insert into r(t) select throws_ok($$select completar_perfil('admin','Gina','Porto','Porto',null, true)$$, '22023', null, 'papel inventado é recusado');
insert into r(t) select throws_ok($$select completar_perfil('adotante','Gina','Narnia','Porto',null, true)$$, '22023', null, 'distrito inventado é recusado');
insert into r(t) select lives_ok($$select completar_perfil('protetor','Gina','Porto','Porto','912 345 678', true)$$, 'primeiro login completo como protetor');
insert into r(t) select is((select format('%s|%s|%s|%s', perfil_completo, role, whatsapp, email) from meu_perfil()), 't|protetor|912 345 678|gina@gmail.com', 'perfil completo com WhatsApp e email nos contactos');
insert into r(t) select throws_ok($$select completar_perfil('adotante','Gina','Porto','Porto',null, true)$$, '22023', null, 'primeiro login só acontece uma vez');
insert into r(t) select lives_ok($$select apagar_conta()$$, 'conta Google apaga-se a si própria');
reset role;
insert into r(t) select is((select count(*)::int from auth.identities where user_id='00000000-0000-0000-0000-0000000000c1'), 0, 'identidade Google desaparece com a conta');

select count(*) total, count(*) filter (where t like 'ok%') passaram, string_agg(t, E'\n') filter (where t not like 'ok%') falharam from r;
