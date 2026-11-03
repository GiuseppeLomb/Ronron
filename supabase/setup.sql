-- Ronron: configuração completa da base de dados (correr uma vez num projeto Supabase novo)

create type public.user_role as enum ('protetor','adotante');
create type public.species as enum ('gato','cao');
create type public.animal_status as enum ('disponivel','reservado','adotado');
create type public.felv_status as enum ('negativo','positivo','desconhecido');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'adotante',
  display_name text not null,
  city text,
  district text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  whatsapp text,
  email text
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  species public.species not null default 'gato' check (species = 'gato'),
  name text not null,
  sex text check (sex in ('macho','femea','desconhecido')) default 'desconhecido',
  age_months int,
  color text,
  sterilized boolean,
  dewormed boolean,
  felv public.felv_status not null default 'desconhecido',
  personality text,
  good_with_cats boolean,
  good_with_dogs boolean,
  good_with_kids boolean,
  unique_trait text,
  description text,
  city text not null,
  district text not null,
  lat double precision,
  lng double precision,
  status public.animal_status not null default 'disponivel',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.animals (approved, status, district);

create table public.animal_photos (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  path text not null,
  position int not null default 0,
  is_video boolean not null default false
);
create index on public.animal_photos (animal_id, position);

create table public.swipes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, animal_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  animal_id uuid references public.animals(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.animals enable row level security;
alter table public.animal_photos enable row level security;
alter table public.swipes enable row level security;
alter table public.reports enable row level security;

create policy "perfis visiveis" on public.profiles for select using (true);
create policy "criar o proprio perfil" on public.profiles for insert to authenticated
  with check (id = auth.uid() and is_admin = false);
create policy "editar o proprio perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "contactos para utilizadores com sessao" on public.profile_contacts for select to authenticated using (true);
create policy "gerir o proprio contacto" on public.profile_contacts for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "ver animais" on public.animals for select
  using (approved or owner_id = auth.uid() or public.is_admin());
create policy "protetor cria animais" on public.animals for insert to authenticated
  with check (owner_id = auth.uid() and approved = false);
create policy "dono ou admin edita" on public.animals for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "dono ou admin apaga" on public.animals for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "ver fotos" on public.animal_photos for select
  using (exists (select 1 from public.animals a where a.id = animal_id and (a.approved or a.owner_id = auth.uid() or public.is_admin())));
create policy "dono gere fotos" on public.animal_photos for all to authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id and (a.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.animals a where a.id = animal_id and (a.owner_id = auth.uid() or public.is_admin())));

create policy "os meus swipes" on public.swipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "denunciar" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admin le denuncias" on public.reports for select to authenticated using (public.is_admin());
create policy "admin resolve" on public.reports for update to authenticated using (public.is_admin());

-- impedir que alguém se torne admin ou aprove os próprios gatos
create function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end; $$;

create function public.protect_animal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.approved := old.approved;
    new.owner_id := old.owner_id;
  end if;
  return new;
end; $$;

create trigger protect_profiles before update on public.profiles for each row execute function public.protect_profile();
create trigger protect_animals before update on public.animals for each row execute function public.protect_animal();

-- perfil criado automaticamente no registo; o dono da plataforma fica admin
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.user_role := coalesce(nullif(new.raw_user_meta_data->>'role','')::public.user_role, 'adotante');
begin
  insert into public.profiles (id, role, display_name, city, district, is_admin)
  values (new.id, r,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'city',
          new.raw_user_meta_data->>'district',
          lower(new.email) = 'giuseppe.teles@gmail.com');
  insert into public.profile_contacts (profile_id, whatsapp, email)
  values (new.id, new.raw_user_meta_data->>'whatsapp', new.email);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.protect_profile() from anon, authenticated, public;
revoke execute on function public.protect_animal() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

grant select on public.profiles, public.animals, public.animal_photos to anon;

-- fotos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animal-photos','animal-photos', true, 20971520,
  array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']);

create policy "upload na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "apagar na propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
