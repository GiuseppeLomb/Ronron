-- Ronron 1.0.1 — ligar a conta Google a uma conta criada com email e palavra-passe, de forma explícita e segura.
-- A junção automática pelo email continua bloqueada (proteção contra nOAuth). A única exceção é uma ligação pedida pela
-- própria pessoa, com sessão iniciada, para ESSA conta Google (identificador "sub" do Google), nos últimos 5 minutos.
-- Fluxo na app: login Google nativo -> preparar_ligacao_google(sub) -> supabase.auth.linkIdentity(id_token) -> o trigger
-- aceita a identidade e apaga a autorização (só serve uma vez).
-- Requer, no Supabase: Authentication > Sign In / Providers > "Allow manual linking" ligado.

create table if not exists private.ligacoes_google (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text not null,
  expira_em timestamptz not null
);
revoke all on private.ligacoes_google from public, anon, authenticated;

create or replace function public.preparar_ligacao_google(p_sub text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sem sessão' using errcode = '42501'; end if;
  if p_sub is null or p_sub !~ '^[0-9]{5,40}$' then raise exception 'Conta Google inválida.' using errcode = '22023'; end if;
  if exists (select 1 from auth.identities where user_id = v_uid and provider = 'google') then
    raise exception 'A tua conta já tem o Google ligado.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.identities where provider = 'google' and provider_id = p_sub) then
    raise exception 'Esta conta Google já está ligada a outra conta do Ronron.' using errcode = '22023';
  end if;
  insert into private.ligacoes_google (user_id, google_sub, expira_em) values (v_uid, p_sub, now() + interval '5 minutes')
  on conflict (user_id) do update set google_sub = excluded.google_sub, expira_em = excluded.expira_em;
end; $$;
revoke all on function public.preparar_ligacao_google(text) from public, anon;
grant execute on function public.preparar_ligacao_google(text) to authenticated;

create or replace function private.bloquear_juncao_contas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.identities i where i.user_id = new.user_id and i.provider <> new.provider) then
    -- exceção: ligação pedida pelo próprio, com sessão, para esta conta Google exata, ainda dentro do prazo
    if new.provider = 'google' and exists (
         select 1 from private.ligacoes_google l
          where l.user_id = new.user_id and l.google_sub = new.provider_id and l.expira_em > now()) then
      delete from private.ligacoes_google where user_id = new.user_id;
      return new;
    end if;
    raise exception 'ronron_conta_existente' using errcode = 'P0003';
  end if;
  return new;
end; $$;
revoke all on function private.bloquear_juncao_contas() from public, anon, authenticated;
