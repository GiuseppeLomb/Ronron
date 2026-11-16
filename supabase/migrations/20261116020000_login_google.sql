-- Ronron 1.0 — login com Google (signInWithIdToken), primeiro login e sem junção automática de contas pelo email.
-- Aplicar sempre primeiro no projeto "Ronron Staging".

-- 1. Nome inicial para contas Google: primeiro nome do Google, nunca o email (o nome dos protetores é público).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r public.user_role := case when m->>'role' = 'protetor' then 'protetor'::public.user_role else 'adotante'::public.user_role end;
  d text := case when private.distrito_valido(m->>'district') then m->>'district' end;
  w text := nullif(regexp_replace(coalesce(m->>'whatsapp',''), '[^0-9+ ]', '', 'g'), '');
  n text := coalesce(nullif(trim(m->>'display_name'),''),
                     nullif(split_part(trim(coalesce(m->>'name', m->>'full_name', '')), ' ', 1), ''),
                     'Amigo dos gatos');
begin
  if w is not null and w !~ '^\+?[0-9 ]{9,20}$' then w := null; end if;
  insert into public.profiles (id, role, display_name, city, district, termos_aceites_em)
  values (new.id, r, left(n, 40), left(nullif(trim(m->>'city'),''), 60), d,
          case when m->>'termos' = 'true' then now() end);
  insert into public.profile_contacts (profile_id, whatsapp, email)
  values (new.id, w, case when r = 'protetor' then new.email end);
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. O meu perfil passa a dizer se o primeiro login já foi concluído (regras e 18+ aceites).
drop function if exists public.meu_perfil();
create function public.meu_perfil()
returns table (id uuid, role public.user_role, display_name text, city text, district text,
               is_admin boolean, whatsapp text, email text, perfil_completo boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.role, p.display_name, p.city, p.district, private.is_admin(), c.whatsapp, c.email,
         p.termos_aceites_em is not null
    from public.profiles p left join public.profile_contacts c on c.profile_id = p.id
   where p.id = (select auth.uid());
$$;
revoke all on function public.meu_perfil() from public, anon;
grant execute on function public.meu_perfil() to authenticated;

-- 3. Primeiro login (contas Google): papel, nome, distrito, cidade, WhatsApp (protetores), 18+ e regras. Só uma vez.
create or replace function public.completar_perfil(p_role text, p_nome text, p_distrito text, p_cidade text,
                                                   p_whatsapp text, p_adulto_e_regras boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
  v_tel text := nullif(regexp_replace(coalesce(p_whatsapp,''), '[^0-9+ ]', '', 'g'), '');
begin
  if v_uid is null then raise exception 'Sem sessão' using errcode = '42501'; end if;
  if p_adulto_e_regras is not true then raise exception 'Para usar o Ronron tens de ter 18 anos ou mais e aceitar as regras.' using errcode = '22023'; end if;
  if p_role not in ('adotante', 'protetor') then raise exception 'Escolhe se queres adotar ou se cuidas de gatos.' using errcode = '22023'; end if;
  if not private.distrito_valido(p_distrito) then raise exception 'Escolhe o teu distrito.' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_nome,''))) not between 1 and 40 then raise exception 'Escreve o teu nome (até 40 letras).' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_cidade,''))) not between 1 and 60 then raise exception 'Escreve a tua cidade.' using errcode = '22023'; end if;
  if v_tel is not null and v_tel !~ '^\+?[0-9 ]{9,20}$' then raise exception 'Número de WhatsApp inválido.' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where id = v_uid and termos_aceites_em is not null) then
    raise exception 'O teu perfil já está completo.' using errcode = '22023';
  end if;
  v_role := p_role::public.user_role;
  update public.profiles
     set role = v_role, display_name = trim(p_nome), district = p_distrito, city = trim(p_cidade), termos_aceites_em = now()
   where id = v_uid;
  insert into public.profile_contacts (profile_id, whatsapp, email)
  values (v_uid, case when v_role = 'protetor' then v_tel end,
          case when v_role = 'protetor' then (select email from auth.users where id = v_uid) end)
  on conflict (profile_id) do update set whatsapp = excluded.whatsapp, email = excluded.email;
end; $$;
revoke all on function public.completar_perfil(text, text, text, text, text, boolean) from public, anon;
grant execute on function public.completar_perfil(text, text, text, text, text, boolean) to authenticated;

-- 4. Sem junção automática de contas pelo email: uma conta criada com email e palavra-passe não ganha
--    um login Google (nem o contrário). Quem tenta recebe um erro e entra pelo método com que criou a conta.
create or replace function private.bloquear_juncao_contas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.identities i where i.user_id = new.user_id and i.provider <> new.provider) then
    raise exception 'ronron_conta_existente' using errcode = 'P0003';
  end if;
  return new;
end; $$;
revoke all on function private.bloquear_juncao_contas() from public, anon, authenticated;
drop trigger if exists bloquear_juncao_contas on auth.identities;
create trigger bloquear_juncao_contas before insert on auth.identities
for each row execute function private.bloquear_juncao_contas();
