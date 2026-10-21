-- Migration Spec 013: Ajuste de trigger de consistência para guest_transfer_confirmations (T013.1)
-- Como guest_transfer_confirmations não possui coluna ward_id (Artigo II.d),
-- a trigger herda exclusivamente stake_id da reserva associada.

create or replace function public.enforce_guest_transfer_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select r.stake_id into new.stake_id
  from public.reservations r where r.id = new.reservation_id;
  if new.stake_id is null then
    raise exception 'Reserva inválida (stake_id não resolvido)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guest_transfer_tenant_consistency on public.guest_transfer_confirmations;

create trigger trg_guest_transfer_tenant_consistency
  before insert on public.guest_transfer_confirmations
  for each row execute function public.enforce_guest_transfer_tenant_consistency();
