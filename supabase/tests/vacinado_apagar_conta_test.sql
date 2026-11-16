-- Testes da migração 20261116010000 (vacinado + apagar conta). Correr no Staging depois de aplicar a migração.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);
select has_column('public','animals','vaccinated','animals tem o campo vacinado');
select col_type_is('public','animals','vaccinated','boolean','vacinado é Sim/Não/Não sei (boolean com nulo)');
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-0000000000c1','apagar@teste.pt','{"role":"protetor","display_name":"Apagar","district":"Porto","whatsapp":"912 345 678"}','authenticated','authenticated');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok($$insert into animals (id, owner_id, name, city, district, vaccinated) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Teste','Porto','Porto',true)$$, 'protetor publica com vacinado = Sim');
select lives_ok($$update animals set vaccinated = null where id = '40000000-0000-0000-0000-000000000001'$$, 'protetor muda vacinado para Não sei');
select lives_ok($$insert into reports (animal_id, reason) values ('40000000-0000-0000-0000-000000000001','teste de denúncia')$$, 'denúncia feita pela conta');
select lives_ok($$select apagar_conta()$$, 'utilizador apaga a própria conta');
reset role;
select is((select count(*)::int from animals where owner_id = '00000000-0000-0000-0000-0000000000c1') + (select count(*)::int from profiles where id = '00000000-0000-0000-0000-0000000000c1') + (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000c1'), 0, 'conta, perfil e gatos apagados');
select * from finish();
rollback;
