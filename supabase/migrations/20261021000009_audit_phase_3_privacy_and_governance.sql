-- ==============================================================================
-- Migration: 20261021000009_audit_phase_3_privacy_and_governance.sql
-- Fase 3 da Auditoria: Privacidade, Governança e LGPD (A01, M01, A08, A12, A13, A15, A16)
-- ==============================================================================

-- 1. TRIGGER DE ATIVIDADE: Sincronizar profiles.last_login_at a partir de auth.users (A16)
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles
    set last_login_at = new.last_sign_in_at
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_sign_in on auth.users;
create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_user_sign_in();

-- 2. REFORÇO DE POLICIES RLS: Verificar is_active = true para administradores (A16)
create or replace function public.is_admin_estaca_of(target_stake uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_role() = 'admin_estaca'
     and public.current_stake_id() = target_stake
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid()
         and p.is_active = true
     );
$$;

create or replace function public.is_admin_ala_of(target_stake uuid, target_ward uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_role() = 'admin_ala'
     and public.current_stake_id() = target_stake
     and public.current_ward_id() = target_ward
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid()
         and p.is_active = true
     );
$$;

-- 3. PROJEÇÃO PÚBLICA SEGURA: DTO para calendário público sem dados de auxílio e sem PII (M01 / Artigo II.g)
drop function if exists public.get_public_caravan_subscribers(uuid[]);

create or replace function public.get_public_caravan_subscribers(p_caravan_ids uuid[])
returns table (
  id uuid,
  caravan_id uuid,
  full_name text,
  ward_name text,
  public_status text,
  confirmation_rank integer,
  created_at timestamptz
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.caravan_id,
    p.full_name,
    coalesce(w.name, 'Convidado') as ward_name,
    case
      when r.status in ('confirmado', 'presente') then 'Confirmado'
      when r.status in ('pago_ala', 'aguardando_auxilio', 'aguardando_transferencia_interestaca') then 'Em validação'
      when r.status = 'pendente' then 'Pendente'
      when r.status = 'lista_espera' then 'Lista de espera'
      else 'Inscrito'
    end as public_status,
    r.confirmation_rank,
    r.created_at
  from public.reservations r
  inner join public.profiles p on p.id = r.user_id
  left join public.wards w on w.id = r.ward_id
  where r.caravan_id = any(p_caravan_ids)
    and r.status not in ('cancelada_com_credito', 'cancelada_sem_credito', 'expirada', 'no_show')
  order by r.created_at asc;
$$;

revoke all on function public.get_public_caravan_subscribers(uuid[]) from public;
grant execute on function public.get_public_caravan_subscribers(uuid[]) to anon, authenticated;

-- 4. RETENÇÃO E EXPURGO LGPD: Suporte a COALESCE(return_date, departure_date) (A12)
create or replace function public.get_expired_minor_forms(p_cutoff_date date)
returns table (
  id uuid,
  stake_id uuid,
  storage_path text,
  caravan_departure_date text,
  caravan_return_date text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    f.id,
    f.stake_id,
    f.storage_path,
    c.departure_date::text as caravan_departure_date,
    c.return_date::text as caravan_return_date
  from public.minor_approval_forms f
  inner join public.reservations r on r.id = f.reservation_id
  inner join public.caravans c on c.id = r.caravan_id
  where coalesce(c.return_date, c.departure_date) <= p_cutoff_date;
$$;

create or replace function public.purge_expired_manifest_entries(p_cutoff_date date)
returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  with target_entries as (
    select e.id
    from public.passenger_manifest_entries e
    inner join public.reservations r on r.id = e.reservation_id
    inner join public.caravans c on c.id = r.caravan_id
    where coalesce(c.return_date, c.departure_date) <= p_cutoff_date
  )
  delete from public.passenger_manifest_entries
  where id in (select id from target_entries);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.get_expired_minor_forms(date) from public;
revoke all on function public.purge_expired_manifest_entries(date) from public;
grant execute on function public.get_expired_minor_forms(date) to service_role;
grant execute on function public.purge_expired_manifest_entries(date) to service_role;
