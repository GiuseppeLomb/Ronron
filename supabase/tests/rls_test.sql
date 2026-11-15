-- Testes de segurança (pgTAP). Correr com: supabase test db   (ou colar no SQL Editor do Staging)
-- Tudo dentro de uma transação que é desfeita no fim: não deixa dados.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

-- ---------- utilizadores de teste ----------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','adotante@teste.pt','{"role":"adotante","display_name":"Ana","district":"Lisboa","termos":"true"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b1','protetor1@teste.pt','{"role":"protetor","display_name":"Rui","district":"Porto","whatsapp":"912 345 678"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b2','protetor2@teste.pt','{"role":"protetor","display_name":"Sara","district":"Faro","whatsapp":"<script>"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000ad','admin@teste.pt','{"role":"adotante","display_name":"Admin"}','authenticated','authenticated');
insert into private.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

-- registo
select is((select email from profile_contacts where profile_id='00000000-0000-0000-0000-0000000000a1'), null, 'adotante: email não fica nos contactos');
select is((select email from profile_contacts where profile_id='00000000-0000-0000-0000-0000000000b1'), 'protetor1@teste.pt', 'protetor: email fica nos contactos');
select is((select whatsapp from profile_contacts where profile_id='00000000-0000-0000-0000-0000000000b2'), null, 'WhatsApp inválido é descartado');
select isnt((select termos_aceites_em from profiles where id='00000000-0000-0000-0000-0000000000a1'), null, 'aceitação dos termos registada');
select hasnt_column('public','profiles','is_admin', 'perfil já não tem is_admin');

-- ---------- protetor 1 publica ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select lives_ok($$insert into animals (id, owner_id, name, city, district) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Tareco','Porto','Porto')$$, 'protetor publica um gato');
insert into animals (id, owner_id, name, city, district, approved) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b1','Auto','Porto','Porto',true);
select is((select approved from animals where id='10000000-0000-0000-0000-000000000002'), false, 'publicar como já aprovado fica por aprovar');
select throws_ok($$insert into animals (owner_id, name, city, district) values ('00000000-0000-0000-0000-0000000000b1',repeat('x',41),'Porto','Porto')$$, '23514', null, 'nome com mais de 40 caracteres é recusado');
select throws_ok($$insert into animals (owner_id, name, city, district) values ('00000000-0000-0000-0000-0000000000b1','X','Porto','Narnia')$$, '23514', null, 'distrito inventado é recusado');
update animals set approved = true where id = '10000000-0000-0000-0000-000000000001';
select is((select approved from animals where id='10000000-0000-0000-0000-000000000001'), false, 'protetor não se aprova a si próprio');
select ok(private.pode_carregar('00000000-0000-0000-0000-0000000000b1/10000000-0000-0000-0000-000000000001/a.webp'), 'protetor pode carregar na pasta do seu gato');
select ok(not private.pode_carregar('00000000-0000-0000-0000-0000000000b1/99999999-0000-0000-0000-000000000000/a.webp'), 'não carrega para gato inexistente');
select throws_ok($$select guardar_fotos('10000000-0000-0000-0000-000000000001','[{"path":"00000000-0000-0000-0000-0000000000b2/x/a.webp"}]')$$, '22023', null, 'não aponta fotos para pasta alheia');
select lives_ok($$select guardar_fotos('10000000-0000-0000-0000-000000000001','[{"path":"00000000-0000-0000-0000-0000000000b1/10000000-0000-0000-0000-000000000001/a.webp"}]')$$, 'guarda fotos na própria pasta');

-- limite de 5 anúncios por dia
select lives_ok($$insert into animals (owner_id, name, city, district) select '00000000-0000-0000-0000-0000000000b1','G'||g,'Porto','Porto' from generate_series(1,3) g$$, 'até 5 anúncios por dia');
select throws_ok($$insert into animals (owner_id, name, city, district) values ('00000000-0000-0000-0000-0000000000b1','Sexto','Porto','Porto')$$, 'P0001', null, 'sexto anúncio no mesmo dia é recusado');

-- ---------- admin aprova ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
update animals set approved = true where id = '10000000-0000-0000-0000-000000000001';
select is((select approved from animals where id='10000000-0000-0000-0000-000000000001'), true, 'admin aprova');
select is((select is_admin from meu_perfil()), true, 'admin reconhecido');

-- ---------- adotante ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from profile_contacts), 1, 'adotante só vê o seu próprio contacto');
select is((select count(*)::int from profile_contacts where profile_id='00000000-0000-0000-0000-0000000000b1'), 0, 'adotante não lê o contacto do protetor diretamente');
select is((select whatsapp from revelar_contacto('10000000-0000-0000-0000-000000000001')), '912 345 678', 'contacto revelado para gato aprovado');
select throws_ok($$select * from revelar_contacto((select id from animals where name='G1'))$$, 'P0002', null, 'gato por aprovar: contacto não é revelado');
select throws_ok($$insert into animals (owner_id, name, city, district) values ('00000000-0000-0000-0000-0000000000a1','X','Lisboa','Lisboa')$$, '42501', null, 'adotante não publica');
select ok(not private.pode_carregar('00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001/a.webp'), 'adotante não carrega ficheiros');
select is((select is_admin from meu_perfil()), false, 'adotante não é admin');
select lives_ok($$insert into reports (animal_id, reason) values ('10000000-0000-0000-0000-000000000001','Estão a pedir dinheiro')$$, 'adotante denuncia');
select throws_ok($$insert into reports (animal_id, reason) values ('10000000-0000-0000-0000-000000000001','outra vez')$$, '23505', null, 'denúncia repetida é recusada');
select is((select count(*)::int from reports), 0, 'adotante não lê denúncias');

-- ---------- protetor edita gato aprovado: volta à moderação ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
update animals set description = 'Vendo por 50 euros' where id = '10000000-0000-0000-0000-000000000001';
select is((select approved from animals where id='10000000-0000-0000-0000-000000000001'), false, 'edição de anúncio aprovado volta à moderação');

-- ---------- visitante sem conta ----------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select * from profile_contacts$$, '42501', null, 'visitante não lê contactos');

reset role;
select * from finish();
rollback;
