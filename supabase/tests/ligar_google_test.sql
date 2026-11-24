-- Testes da ligação explícita da conta Google (migração 20261124010000). Correr no Staging.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(13);
create temp table r(n serial, t text); grant all on r to public; grant all on sequence r_n_seq to public;

-- u1: email e palavra-passe · u2: só Google (sub 100000000000000000002) · u3: email e palavra-passe (para o teste do prazo)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-0000000000d1','ana@gmail.com','{"role":"adotante","display_name":"Ana","termos":"true"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d2','rui@gmail.com','{"name":"Rui"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d3','eva@gmail.com','{"role":"adotante","display_name":"Eva","termos":"true"}','authenticated','authenticated');
insert into auth.identities (provider_id, user_id, identity_data, provider) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1','{"sub":"d1"}','email'),
 ('100000000000000000002','00000000-0000-0000-0000-0000000000d2','{"sub":"100000000000000000002"}','google'),
 ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000d3','{"sub":"d3"}','email');

insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('100000000000000000001','00000000-0000-0000-0000-0000000000d1','{"sub":"100000000000000000001"}','google')$$,
  'P0003', null, 'sem autorização, o Google não se junta à conta com palavra-passe');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into r(t) select throws_ok($$select preparar_ligacao_google('100000000000000000001')$$, '42501', null, 'visitante sem conta não pode pedir ligação');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into r(t) select throws_ok($$select preparar_ligacao_google('abc')$$, '22023', null, 'identificador Google inválido é recusado');
insert into r(t) select throws_ok($$select preparar_ligacao_google('100000000000000000002')$$, '22023', null, 'conta Google já ligada a outra pessoa é recusada');
insert into r(t) select lives_ok($$select preparar_ligacao_google('100000000000000000001')$$, 'com sessão, pede a ligação da sua conta Google');
reset role;

insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('100000000000000000009','00000000-0000-0000-0000-0000000000d1','{"sub":"100000000000000000009"}','google')$$,
  'P0003', null, 'autorização não serve para outra conta Google');
insert into r(t) select lives_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('100000000000000000001','00000000-0000-0000-0000-0000000000d1','{"sub":"100000000000000000001"}','google')$$,
  'a conta Google pedida liga-se à conta da própria pessoa');
insert into r(t) select is((select count(*)::int from private.ligacoes_google where user_id = '00000000-0000-0000-0000-0000000000d1'), 0, 'a autorização só serve uma vez');
insert into r(t) select is((select count(*)::int from auth.identities where user_id = '00000000-0000-0000-0000-0000000000d1'), 2, 'a conta fica com email e Google');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into r(t) select throws_ok($$select preparar_ligacao_google('100000000000000000005')$$, '22023', null, 'quem já tem o Google ligado não pede outra ligação');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
insert into r(t) select lives_ok($$select preparar_ligacao_google('100000000000000000003')$$, 'outra pessoa pede a ligação');
reset role;
update private.ligacoes_google set expira_em = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-0000000000d3';
insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('100000000000000000003','00000000-0000-0000-0000-0000000000d3','{"sub":"100000000000000000003"}','google')$$,
  'P0003', null, 'autorização expirada (mais de 5 minutos) já não serve');
insert into r(t) select throws_ok($$insert into auth.identities (provider_id, user_id, identity_data, provider) values ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000d2','{"sub":"d2"}','email')$$,
  'P0003', null, 'palavra-passe continua sem se juntar a conta Google');

select count(*) total, count(*) filter (where t like 'ok%') passaram, string_agg(t, E'\n') filter (where t not like 'ok%') falharam from r;
