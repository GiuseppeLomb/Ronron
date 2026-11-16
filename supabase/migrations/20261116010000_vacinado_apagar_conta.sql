-- Ronron 1.0 — campo "vacinado" (Sim / Não / Não sei = true / false / null) e apagar conta dentro da app.

alter table public.animals add column if not exists vaccinated boolean;
grant update (vaccinated) on public.animals to authenticated;
create index if not exists animals_feed_idx on public.animals (approved, status, created_at desc);

-- Apagar a própria conta: apaga as denúncias feitas e o utilizador (perfil, contactos, gatos, fotos na base de dados, gostos em cascata).
-- Os ficheiros no Storage são apagados pela app antes de chamar esta função (o Storage não permite apagar por SQL).
create or replace function public.apagar_conta()
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sem sessão' using errcode = '42501'; end if;
  delete from public.reports where reporter_id = v_uid;   -- denúncias feitas por esta pessoa
  delete from auth.users where id = v_uid;               -- perfil, contactos, gatos, fotos (registos), swipes e pedidos de contacto saem em cascata
end; $$;
revoke all on function public.apagar_conta() from public, anon;
grant execute on function public.apagar_conta() to authenticated;
