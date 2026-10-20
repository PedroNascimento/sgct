-- ============================================================
-- SPEC 006 / CORREÇÃO: Fallback de ward_id para reservas de admin_estaca
-- Garante que admin_estaca (cujo ward_id no profile é null por chk_ward_by_role)
-- consiga realizar reservas herdando a primeira Ala da Estaca como sede.
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

  -- Se for admin_estaca e new.ward_id estiver nulo, vincula à primeira Ala da Estaca
  if new.ward_id is null and profile_role = 'admin_estaca' then
    select w.id into new.ward_id
    from public.wards w
    where w.stake_id = new.stake_id
    order by w.created_at asc
    limit 1;
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
