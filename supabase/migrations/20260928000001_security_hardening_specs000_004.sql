-- ============================================================
-- HARDENING DE SEGURANÇA — SPECS 000-004
-- Fecha caminhos de escrita cross-stake e reduz privilégios do super_admin.
-- ============================================================

create or replace function public.enforce_reservation_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_role text;
  profile_stake_id uuid;
begin
  select c.stake_id into new.stake_id
  from public.caravans c
  where c.id = new.caravan_id;

  select p.stake_id, p.ward_id, p.role
    into profile_stake_id, new.ward_id, profile_role
  from public.profiles p
  where p.id = new.user_id
    and p.is_active = true;

  if new.stake_id is null then
    raise exception 'Caravana inválida para esta reserva';
  end if;

  if profile_role is null then
    raise exception 'Perfil inválido ou inativo para esta reserva';
  end if;

  -- O profile de convidado pertence à Estaca anfitriã. Nenhum papel pode
  -- reservar uma caravana de outra Estaca usando a mesma identidade.
  if profile_stake_id is distinct from new.stake_id then
    raise exception 'Perfil e caravana pertencem a Estacas diferentes';
  end if;

  if new.ward_id is null and profile_role <> 'guest' then
    raise exception 'Perfil inválido para esta reserva (ward_id ausente e não é convidado)';
  end if;

  if profile_role = 'guest' then
    new.funding_source := 'convidado_transferencia_interestaca';
  end if;

  return new;
end;
$$;

-- Um usuário comum nunca pode criar para si um papel administrativo.
drop policy if exists profiles_insert_bootstrap on public.profiles;
create policy profiles_insert_bootstrap on public.profiles
  for insert with check (
    (auth.uid() = id and role in ('member', 'guest'))
    or (public.is_super_admin() and role = 'admin_estaca')
  );

-- super_admin é restrito à criação de Estacas e do primeiro admin_estaca.
drop policy if exists wards_write on public.wards;
create policy wards_write on public.wards
  for all using (public.is_admin_estaca_of(stake_id))
  with check (public.is_admin_estaca_of(stake_id));

-- Leituras públicas estritamente minimizadas. As funções expõem somente os
-- campos necessários, sem abrir SELECT cross-tenant nas tabelas sensíveis.
create or replace function public.get_public_wards(target_stake_slug text)
returns table (id uuid, name text)
language sql stable security definer
set search_path = ''
as $$
  select w.id, w.name
  from public.wards w
  join public.stakes s on s.id = w.stake_id
  where s.slug = target_stake_slug
    and s.is_active = true
  order by w.name;
$$;

create or replace function public.get_public_caravan_counts(target_caravan_id uuid)
returns table (confirmed_seats bigint, validating_seats bigint, waitlist_seats bigint)
language sql stable security definer
set search_path = ''
as $$
  select
    count(*) filter (where r.status in ('confirmado', 'presente')),
    count(*) filter (where r.status in (
      'pendente', 'pago_ala', 'aguardando_auxilio',
      'aguardando_transferencia_interestaca'
    )),
    count(*) filter (where r.status = 'lista_espera')
  from public.reservations r
  join public.caravans c on c.id = r.caravan_id
  where c.id = target_caravan_id;
$$;

create or replace function public.get_seat_occupancy(target_caravan_id uuid)
returns table (
  stake_id uuid,
  caravan_id uuid,
  seat_number integer,
  occupancy_status text
)
language sql stable security definer
set search_path = ''
as $$
  select
    r.stake_id,
    r.caravan_id,
    r.seat_number,
    case
      when r.status in ('pendente', 'pago_ala', 'confirmado', 'presente',
                        'aguardando_auxilio', 'aguardando_transferencia_interestaca')
      then 'ocupado'
      else 'livre'
    end
  from public.reservations r
  join public.caravans c on c.id = r.caravan_id
  where r.caravan_id = target_caravan_id
    and c.stake_id = public.current_stake_id();
$$;

revoke all on function public.get_public_wards(text) from public;
revoke all on function public.get_public_caravan_counts(uuid) from public;
revoke all on function public.get_seat_occupancy(uuid) from public;
grant execute on function public.get_public_wards(text) to anon, authenticated;
grant execute on function public.get_public_caravan_counts(uuid) to anon, authenticated;
grant execute on function public.get_seat_occupancy(uuid) to authenticated;

-- O ranking e os estados financeiros da caravana são persistidos como uma
-- unidade indivisível. SECURITY INVOKER preserva todas as políticas RLS do
-- chamador (Admin Estaca ou job autorizado com service_role).
create or replace function public.update_reservations_batch(updates_payload jsonb)
returns setof public.reservations
language sql volatile security invoker
set search_path = ''
as $$
  update public.reservations as r
  set
    status = payload.status,
    confirmation_rank = payload.confirmation_rank,
    confirmed_at = payload.confirmed_at
  from jsonb_to_recordset(updates_payload) as payload(
    id uuid,
    status text,
    confirmation_rank integer,
    confirmed_at timestamptz
  )
  where r.id = payload.id
  returning r.*;
$$;

revoke all on function public.update_reservations_batch(jsonb) from public;
grant execute on function public.update_reservations_batch(jsonb) to authenticated, service_role;

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id then
    new.role := old.role;
    new.stake_id := old.stake_id;
    new.ward_id := old.ward_id;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_security_fields on public.profiles;
create trigger trg_profiles_protect_security_fields
  before update on public.profiles
  for each row execute function public.protect_profile_security_fields();

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() and role in ('member', 'guest'))
  with check (id = auth.uid() and role in ('member', 'guest'));

