-- Ronron 0.91 — fecho das falhas críticas e altas de segurança (ver docs/PLANO-V1.md, secção 1)
-- Aplicar sempre primeiro no projeto "Ronron Staging".

-- =====================================================================
-- 0. Schema privado (não exposto pela API) para funções e dados internos
-- =====================================================================
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;   -- necessário para as policies chamarem as funções

-- =====================================================================
-- 1. Admins fora do perfil e sem email fixo no código (N6)
-- =====================================================================
create table if not exists private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;
insert into private.admins (user_id) select id from public.profiles where is_admin on conflict do nothing;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;

create or replace function private.e_protetor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'protetor');
$$;

revoke all on function private.is_admin(), private.e_protetor() from public;
grant execute on function private.is_admin(), private.e_protetor() to anon, authenticated;

-- =====================================================================
-- 2. Remover tudo o que dependia de public.is_admin() e do email fixo
-- =====================================================================
drop policy if exists "perfis visiveis" on public.profiles;
drop policy if exists "criar o proprio perfil" on public.profiles;
drop policy if exists "editar o proprio perfil" on public.profiles;
drop policy if exists "contactos para utilizadores com sessao" on public.profile_contacts;
drop policy if exists "gerir o proprio contacto" on public.profile_contacts;
drop policy if exists "ver animais" on public.animals;
drop policy if exists "protetor cria animais" on public.animals;
drop policy if exists "dono ou admin edita" on public.animals;
drop policy if exists "dono ou admin apaga" on public.animals;
drop policy if exists "ver fotos" on public.animal_photos;
drop policy if exists "dono gere fotos" on public.animal_photos;
drop policy if exists "os meus swipes" on public.swipes;
drop policy if exists "denunciar" on public.reports;
drop policy if exists "admin le denuncias" on public.reports;
drop policy if exists "admin resolve" on public.reports;
drop policy if exists "upload na propria pasta" on storage.objects;
drop policy if exists "apagar na propria pasta" on storage.objects;

drop trigger if exists protect_profiles on public.profiles;
drop trigger if exists protect_animals on public.animals;
drop function if exists public.protect_profile();
drop function if exists public.protect_animal();
drop function if exists public.is_admin();

alter table public.profiles drop column if exists is_admin;
alter table public.profiles add column if not exists termos_aceites_em timestamptz;

-- =====================================================================
-- 3. Permissões mínimas (N8) — nada de TRUNCATE/DELETE por omissão
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant select on public.profiles, public.animals, public.animal_photos to anon, authenticated;
grant update (display_name, city, district, role) on public.profiles to authenticated;
grant select, insert, update on public.profile_contacts to authenticated;
grant insert, delete on public.animals to authenticated;
grant update (name, sex, age_months, color, sterilized, dewormed, felv, personality, good_with_cats,
              good_with_dogs, good_with_kids, unique_trait, description, city, district, lat, lng,
              status, approved) on public.animals to authenticated;
grant select, insert, update, delete on public.swipes to authenticated;
grant select, insert, update on public.reports to authenticated;
-- animal_photos: escrita só pela função guardar_fotos()

-- =====================================================================
-- 4. Validação de dados na base de dados (N5, N10)
-- =====================================================================
create or replace function private.distrito_valido(d text) returns boolean
language sql immutable set search_path = '' as $$
  select d in ('Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria',
               'Lisboa','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu','Madeira','Açores');
$$;
grant execute on function private.distrito_valido(text) to anon, authenticated;

alter table public.profiles
  add constraint profiles_nome_len check (char_length(display_name) between 1 and 40),
  add constraint profiles_cidade_len check (city is null or char_length(city) <= 60),
  add constraint profiles_distrito_ok check (district is null or private.distrito_valido(district));

alter table public.profile_contacts
  add constraint contactos_whatsapp_ok check (whatsapp is null or whatsapp ~ '^\+?[0-9 ]{9,20}$'),
  add constraint contactos_email_len check (email is null or (char_length(email) <= 254 and email like '%_@_%'));

alter table public.animals
  add constraint animals_nome_len check (char_length(name) between 1 and 40),
  add constraint animals_idade_ok check (age_months is null or age_months between 0 and 360),
  add constraint animals_cor_len check (color is null or char_length(color) <= 60),
  add constraint animals_perso_len check (personality is null or char_length(personality) <= 80),
  add constraint animals_unico_len check (unique_trait is null or char_length(unique_trait) <= 140),
  add constraint animals_desc_len check (description is null or char_length(description) <= 1500),
  add constraint animals_cidade_len check (char_length(city) between 1 and 60),
  add constraint animals_distrito_ok check (private.distrito_valido(district)),
  add constraint animals_coords_ok check ((lat is null or lat between 30 and 43) and (lng is null or lng between -32 and -6));

alter table public.animal_photos
  add constraint fotos_posicao_ok check (position between 0 and 5),
  add constraint fotos_path_len check (char_length(path) <= 200);

alter table public.reports
  alter column reporter_id set default auth.uid(),
  add constraint reports_motivo_len check (char_length(reason) between 3 and 500);
alter table public.reports add constraint reports_um_por_anuncio unique (reporter_id, animal_id);

-- =====================================================================
-- 5. Policies (com (select auth.uid()) para performance — N13)
-- =====================================================================
-- Perfis: só o próprio, os protetores com anúncios aprovados (nome público) e o admin (N9)
create policy "perfis visiveis" on public.profiles for select using (
  id = (select auth.uid()) or (select private.is_admin())
  or exists (select 1 from public.animals a where a.owner_id = profiles.id and a.approved));
create policy "editar o proprio perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Contactos: cada um só vê e gere o seu (N1). Os outros chegam só por revelar_contacto().
create policy "o meu contacto" on public.profile_contacts for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "ver animais" on public.animals for select
  using (approved or owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "protetor cria animais" on public.animals for insert to authenticated
  with check (owner_id = (select auth.uid()) and approved = false and (select private.e_protetor()));
create policy "dono ou admin edita" on public.animals for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "dono ou admin apaga" on public.animals for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

create policy "ver fotos" on public.animal_photos for select
  using (exists (select 1 from public.animals a where a.id = animal_id
                 and (a.approved or a.owner_id = (select auth.uid()) or (select private.is_admin()))));

create policy "os meus swipes" on public.swipes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "denunciar" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "admin le denuncias" on public.reports for select to authenticated using ((select private.is_admin()));
create policy "admin resolve" on public.reports for update to authenticated using ((select private.is_admin()));

-- =====================================================================
-- 6. Triggers de proteção: aprovação, re-moderação (N4) e limites (anti-spam)
-- =====================================================================

create or replace function private.limitar_denuncias() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Limite de denúncias por dia atingido' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger limitar_denuncias before insert on public.reports
for each row execute function private.limitar_denuncias();

-- =====================================================================
-- 7. Revelar contacto (N1): só do dono de um anúncio aprovado, com limite e registo
-- =====================================================================
create table if not exists public.contact_reveals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, animal_id)
);
create index if not exists contact_reveals_animal_idx on public.contact_reveals (animal_id);
alter table public.contact_reveals enable row level security;
grant select on public.contact_reveals to authenticated;
create policy "os meus pedidos de contacto" on public.contact_reveals for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.animals a where a.id = animal_id and a.owner_id = (select auth.uid())));

create or replace function public.revelar_contacto(p_animal uuid)
returns table (whatsapp text, email text, nome text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Precisas de conta para ver o contacto' using errcode = '42501'; end if;
  select a.owner_id into v_owner from public.animals a
   where a.id = p_animal and a.approved and a.status <> 'adotado';
  if v_owner is null then raise exception 'Anúncio indisponível' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.contact_reveals r where r.user_id = v_uid and r.animal_id = p_animal)
     and (select count(*) from public.contact_reveals r where r.user_id = v_uid and r.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Limite diário de contactos atingido. Tenta amanhã.' using errcode = 'P0001';
  end if;
  insert into public.contact_reveals (user_id, animal_id) values (v_uid, p_animal) on conflict do nothing;
  return query
    select c.whatsapp, c.email, p.display_name
      from public.profiles p left join public.profile_contacts c on c.profile_id = p.id
     where p.id = v_owner;
end; $$;
revoke all on function public.revelar_contacto(uuid) from public, anon;
grant execute on function public.revelar_contacto(uuid) to authenticated;

-- =====================================================================
-- 8. O meu perfil (substitui o is_admin no perfil)
-- =====================================================================
create or replace function public.meu_perfil()
returns table (id uuid, role public.user_role, display_name text, city text, district text,
               is_admin boolean, whatsapp text, email text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.role, p.display_name, p.city, p.district, private.is_admin(), c.whatsapp, c.email
    from public.profiles p left join public.profile_contacts c on c.profile_id = p.id
   where p.id = (select auth.uid());
$$;
revoke all on function public.meu_perfil() from public, anon;
grant execute on function public.meu_perfil() to authenticated;

-- =====================================================================
-- 9. Guardar fotos de forma atómica (item 8) e com caminho validado (N10)
--    Devolve os caminhos que deixaram de ser usados, para o cliente os apagar do Storage.
-- =====================================================================
create or replace function public.guardar_fotos(p_animal uuid, p_fotos jsonb)
returns setof text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_antigos text[];
  v_novos text[];
  f jsonb;
  i int := 0;
begin
  select owner_id into v_owner from public.animals where id = p_animal;
  if v_owner is null or (v_owner <> v_uid and not private.is_admin()) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_fotos) <> 'array' or jsonb_array_length(p_fotos) not between 1 and 6 then
    raise exception 'Entre 1 e 6 fotos' using errcode = '22023';
  end if;
  select coalesce(array_agg(path), '{}') into v_antigos from public.animal_photos where animal_id = p_animal;
  select coalesce(array_agg(x->>'path'), '{}') into v_novos from jsonb_array_elements(p_fotos) x;
  if exists (select 1 from unnest(v_novos) p where p is null or p not like v_owner::text || '/' || p_animal::text || '/%') then
    raise exception 'Caminho de foto inválido' using errcode = '22023';
  end if;
  delete from public.animal_photos where animal_id = p_animal;
  for f in select * from jsonb_array_elements(p_fotos) loop
    insert into public.animal_photos (animal_id, path, position, is_video)
    values (p_animal, f->>'path', i, coalesce((f->>'is_video')::boolean, false));
    i := i + 1;
  end loop;
  -- fotos novas num anúncio aprovado voltam à moderação
  if not private.is_admin() and exists (select 1 from unnest(v_novos) p where p <> all (v_antigos)) then
    update public.animals set approved = false where id = p_animal and approved;
  end if;
  return query select p from unnest(v_antigos) p where p <> all (v_novos);
end; $$;
revoke all on function public.guardar_fotos(uuid, jsonb) from public, anon;
grant execute on function public.guardar_fotos(uuid, jsonb) to authenticated;

-- Proteção de anúncios: o dono nunca se aprova; alterações a um anúncio aprovado voltam à moderação;
-- o dono pode tirar a aprovação (é o que guardar_fotos faz), nunca dá-la.
create or replace function private.proteger_animal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.animals where owner_id = new.owner_id and created_at > now() - interval '24 hours') >= 5 then
      raise exception 'Limite de 5 anúncios por dia atingido' using errcode = 'P0001';
    end if;
    if (select count(*) from public.animals where owner_id = new.owner_id and status <> 'adotado') >= 40 then
      raise exception 'Limite de 40 anúncios ativos atingido' using errcode = 'P0001';
    end if;
    new.approved := false;
    return new;
  end if;
  -- o dono pode tirar a aprovação (re-moderação), nunca dá-la
  if not (old.approved and not new.approved) then new.approved := old.approved; end if;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.species := old.species;
  if old.approved and (new.name, new.description, new.personality, new.unique_trait, new.color, new.city, new.district)
     is distinct from (old.name, old.description, old.personality, old.unique_trait, old.color, old.city, old.district) then
    new.approved := false;
  end if;
  return new;
end; $$;

create trigger proteger_animal before insert or update on public.animals
for each row execute function private.proteger_animal();

-- =====================================================================
-- 10. Registo: sem admin automático, email só para protetores, dados validados
-- =====================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r public.user_role := case when m->>'role' = 'protetor' then 'protetor'::public.user_role else 'adotante'::public.user_role end;
  d text := case when private.distrito_valido(m->>'district') then m->>'district' end;
  w text := nullif(regexp_replace(coalesce(m->>'whatsapp',''), '[^0-9+ ]', '', 'g'), '');
begin
  if w is not null and w !~ '^\+?[0-9 ]{9,20}$' then w := null; end if;
  insert into public.profiles (id, role, display_name, city, district, termos_aceites_em)
  values (new.id, r,
          left(coalesce(nullif(trim(m->>'display_name'),''), split_part(new.email,'@',1)), 40),
          left(nullif(trim(m->>'city'),''), 60), d,
          case when m->>'termos' = 'true' then now() end);
  insert into public.profile_contacts (profile_id, whatsapp, email)
  values (new.id, w, case when r = 'protetor' then new.email end);
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- adotantes não precisam de email guardado nos contactos (minimização RGPD)
update public.profile_contacts c set email = null
  from public.profiles p where p.id = c.profile_id and p.role = 'adotante';

-- =====================================================================
-- 11. Storage (N3): só protetores, só na pasta de um anúncio seu, com quota
-- =====================================================================
update storage.buckets
   set file_size_limit = 10485760,  -- 10 MB
       allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
 where id = 'animal-photos';

create or replace function private.pode_carregar(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.e_protetor()
     and (storage.foldername(p_nome))[1] = (select auth.uid())::text
     and exists (select 1 from public.animals a
                  where a.id::text = (storage.foldername(p_nome))[2] and a.owner_id = (select auth.uid()))
     and (select count(*) from storage.objects o
           where o.bucket_id = 'animal-photos' and o.owner_id = (select auth.uid())::text) < 150
     and (select count(*) from storage.objects o
           where o.bucket_id = 'animal-photos' and (storage.foldername(o.name))[2] = (storage.foldername(p_nome))[2]) < 12;
$$;
revoke all on function private.pode_carregar(text) from public;
grant execute on function private.pode_carregar(text) to authenticated;

create policy "protetor carrega fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos' and private.pode_carregar(name));
create policy "dono ou admin apaga fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin())));
create policy "dono ou admin lista fotos" on storage.objects for select to authenticated
  using (bucket_id = 'animal-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin())));

-- =====================================================================
-- 12. Índices em falta (advisors)
-- =====================================================================
create index if not exists animals_owner_idx on public.animals (owner_id);
create index if not exists reports_animal_idx on public.reports (animal_id);
create index if not exists swipes_animal_idx on public.swipes (animal_id);
