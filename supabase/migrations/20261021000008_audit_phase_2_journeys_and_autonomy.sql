-- ============================================================
-- AUDITORIA 21/10/2026 — FASE 2: FECHAMENTO DE JORNADAS REAIS E AUTONOMIA
-- Itens: A03, A04, A06, A07, A09, A10
-- ============================================================

-- ------------------------------------------------------------
-- 1. A03 — Políticas RLS para Membros e Convidados (Upload, Convidado, Auxílio, QR)
-- ------------------------------------------------------------

-- 1.1 minor_approval_forms: Membro titular pode inserir termo para sua reserva
drop policy if exists minor_forms_insert_member on public.minor_approval_forms;
create policy minor_forms_insert_member on public.minor_approval_forms
  for insert with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = auth.uid()
    )
  );

-- 1.2 guest_transfer_confirmations: Convidado titular pode inserir transferência
drop policy if exists guest_transfer_insert_guest on public.guest_transfer_confirmations;
create policy guest_transfer_insert_guest on public.guest_transfer_confirmations
  for insert with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = auth.uid()
    )
  );

-- 1.3 aid_requests: Membro titular pode inserir solicitação de auxílio
drop policy if exists aid_requests_insert_member on public.aid_requests;
create policy aid_requests_insert_member on public.aid_requests
  for insert with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = auth.uid()
    )
  );

-- 1.4 reservations: Membro titular pode atualizar qr_token de reserva confirmada
drop policy if exists reservations_update_qr_member on public.reservations;
create policy reservations_update_qr_member on public.reservations
  for update using (
    user_id = auth.uid() and status in ('confirmado', 'presente')
  )
  with check (
    user_id = auth.uid() and status in ('confirmado', 'presente')
  );

-- 1.5 reservations: Líder designado pode visualizar reservas da sua caravana (A09)
drop policy if exists reservations_select_leader on public.reservations;
create policy reservations_select_leader on public.reservations
  for select using (
    exists (
      select 1 from public.caravans c
      where c.id = reservations.caravan_id
        and c.caravan_leader_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. A09 — Autorização Restrita de Check-in para Líder Designado e Admin Estaca
-- ------------------------------------------------------------
create or replace function public.is_caravan_leader_or_stake_admin(p_reservation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.reservations r
    join public.caravans c on c.id = r.caravan_id
    where r.id = p_reservation_id
      and (c.caravan_leader_id = auth.uid() or public.is_admin_estaca_of(r.stake_id))
  );
$$;

revoke all on function public.is_caravan_leader_or_stake_admin(uuid) from public, anon;
grant execute on function public.is_caravan_leader_or_stake_admin(uuid) to authenticated, service_role;

drop policy if exists checkins_select_leader on public.checkins;
create policy checkins_select_leader on public.checkins
  for select using (
    public.is_caravan_leader_or_stake_admin(reservation_id)
  );

drop policy if exists checkins_insert_leader on public.checkins;
create policy checkins_insert_leader on public.checkins
  for insert with check (
    public.is_caravan_leader_or_stake_admin(reservation_id)
  );

-- ------------------------------------------------------------
-- 3. A04 — Procedimento Atômico para Aplicação de Crédito
-- ------------------------------------------------------------
create or replace function public.apply_credit_to_reservation(
  p_credit_id uuid,
  p_reservation_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_credit record;
  v_reservation record;
  v_new_amount numeric;
  v_new_status text;
begin
  -- 1. Validar autenticação
  if auth.role() != 'service_role' and auth.uid() != p_user_id then
    raise exception 'Acesso negado: titularidade inválida.' using errcode = '42501';
  end if;

  -- 2. Lock e verificação do crédito
  select * into v_credit
  from public.credit_ledger
  where id = p_credit_id
  for update;

  if not found then
    raise exception 'Crédito não encontrado: %', p_credit_id;
  end if;

  if v_credit.user_id != p_user_id then
    raise exception 'Crédito pertence a outro membro.';
  end if;

  if v_credit.status != 'active' then
    raise exception 'Crédito não está ativo. Status atual: %', v_credit.status;
  end if;

  if v_credit.expires_at <= now() then
    raise exception 'Crédito expirado.';
  end if;

  -- 3. Lock e verificação da reserva
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada: %', p_reservation_id;
  end if;

  if v_reservation.user_id != p_user_id then
    raise exception 'Reserva pertence a outro membro.';
  end if;

  if v_reservation.status != 'pendente' then
    raise exception 'Apenas reservas com status pendente podem receber abatimento via crédito.';
  end if;

  -- 4. Cálculo do abatimento
  v_new_amount := greatest(0, v_reservation.payment_amount - v_credit.amount);
  v_new_status := case when v_new_amount = 0 then 'pago_ala' else 'pendente' end;

  -- 5. Atualizar reserva com payment_amount persistido
  update public.reservations
  set payment_amount = v_new_amount,
      status = v_new_status
  where id = p_reservation_id
  returning * into v_reservation;

  -- 6. Marcar crédito como used com data de uso
  update public.credit_ledger
  set status = 'used',
      used_at = now()
  where id = p_credit_id
  returning * into v_credit;

  return jsonb_build_object(
    'credit', to_jsonb(v_credit),
    'reservation', to_jsonb(v_reservation)
  );
end;
$$;

revoke all on function public.apply_credit_to_reservation(uuid, uuid, uuid) from public, anon;
grant execute on function public.apply_credit_to_reservation(uuid, uuid, uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- 4. A07 — Colunas de Titularidade Substituta na Permuta de Assento
-- ------------------------------------------------------------
alter table public.reservations
  add column if not exists transferred_to_name text,
  add column if not exists transferred_to_document text;
