-- ============================================================
-- AUDITORIA 21/10/2026 — FASE 1: REMEDIAÇÕES CRÍTICAS DE SEGURANÇA E BANCO
-- Itens: C01, C02, A05, A02, A14
-- ============================================================

-- ------------------------------------------------------------
-- 1. A05 — Substituição da constraint global por Índice Parcial de Assento Ativo
-- ------------------------------------------------------------
alter table public.reservations drop constraint if exists reservations_caravan_id_seat_number_key;

-- Permitir seat_number nulo para reservas em lista de espera
alter table public.reservations alter column seat_number drop not null;
alter table public.reservations drop constraint if exists reservations_seat_number_check;
alter table public.reservations add constraint reservations_seat_number_check
  check (status = 'lista_espera' or seat_number is not null);

create unique index if not exists idx_unique_active_seat_per_caravan
on public.reservations (caravan_id, seat_number)
where status in ('pendente', 'confirmado', 'pago_ala', 'presente');

-- ------------------------------------------------------------
-- 2. C01 — Remediação da RPC de Promoção da Fila de Espera
-- ------------------------------------------------------------
-- Revogar grants padrão amplos em novas funções
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

create or replace function public.process_waitlist_atomic_promotion(
  p_vacated_reservation_id uuid,
  p_promoted_reservation_id uuid,
  p_assigned_seat_number int default null,
  p_credit_user_id uuid default null,
  p_credit_amount numeric default null,
  p_credit_source text default 'waitlist_promotion',
  p_credit_expires_at timestamptz default null,
  p_credit_reason text default 'Promoção da fila de espera'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_vacated record;
  v_promoted record;
  v_credit record;
  v_effective_seat int;
  v_effective_amount numeric;
  v_effective_user uuid;
  v_expires_at timestamptz;
begin
  v_caller_id := auth.uid();

  -- 1. Lock e leitura da reserva desocupada
  select * into v_vacated
  from public.reservations
  where id = p_vacated_reservation_id
  for update;

  if not found then
    raise exception 'Reserva desocupada não encontrada: %', p_vacated_reservation_id;
  end if;

  -- 2. Verificação de autorização (apenas Admin Estaca, Admin Ala da reserva ou service_role)
  if auth.role() != 'service_role' then
    if v_caller_id is null then
      raise exception 'Acesso não autenticado.' using errcode = '42501';
    end if;

    if not (
      public.is_admin_estaca_of(v_vacated.stake_id) or
      public.is_admin_ala_of(v_vacated.stake_id, v_vacated.ward_id)
    ) then
      raise exception 'Acesso negado: operador não possui privilégios administrativos para esta caravana.'
        using errcode = '42501';
    end if;
  end if;

  -- 3. Validar se a reserva desocupada é elegível
  if v_vacated.status not in ('confirmado', 'pago_ala', 'pendente') then
    raise exception 'Apenas reservas ativas ou pagas podem ser canceladas para gerar crédito. Status atual: %', v_vacated.status;
  end if;

  -- 4. Lock e leitura da reserva promovida da lista de espera
  select * into v_promoted
  from public.reservations
  where id = p_promoted_reservation_id
  for update;

  if not found then
    raise exception 'Reserva da lista de espera não encontrada: %', p_promoted_reservation_id;
  end if;

  if v_promoted.caravan_id != v_vacated.caravan_id then
    raise exception 'As reservas devem pertencer à mesma caravana.';
  end if;

  if v_promoted.status != 'lista_espera' then
    raise exception 'Apenas reservas em status lista_espera podem ser promovidas. Status atual: %', v_promoted.status;
  end if;

  -- 5. Derivar valores reais da entidade confiável do banco
  v_effective_user := v_vacated.user_id;
  v_effective_amount := v_vacated.payment_amount;
  v_effective_seat := coalesce(p_assigned_seat_number, v_vacated.seat_number);
  v_expires_at := coalesce(p_credit_expires_at, now() + interval '1 year');

  -- 6. Atualizar a reserva desocupada para cancelada_com_credito
  update public.reservations
  set status = 'cancelada_com_credito'
  where id = p_vacated_reservation_id
  returning * into v_vacated;

  -- 7. Promover a reserva da lista de espera para o assento desocupado
  update public.reservations
  set status = 'confirmado',
      seat_number = v_effective_seat,
      confirmed_at = now()
  where id = p_promoted_reservation_id
  returning * into v_promoted;

  -- 8. Gerar o crédito real no credit_ledger
  insert into public.credit_ledger (
    stake_id,
    ward_id,
    user_id,
    amount,
    source,
    origin_reservation_id,
    expires_at,
    reason,
    status
  ) values (
    v_vacated.stake_id,
    v_vacated.ward_id,
    v_effective_user,
    v_effective_amount,
    'waitlist_promotion',
    p_vacated_reservation_id,
    v_expires_at,
    coalesce(p_credit_reason, 'Promoção da fila de espera'),
    'active'
  )
  returning * into v_credit;

  return jsonb_build_object(
    'vacated', to_jsonb(v_vacated),
    'promoted', to_jsonb(v_promoted),
    'credit', to_jsonb(v_credit)
  );
end;
$$;

revoke all on function public.process_waitlist_atomic_promotion(uuid, uuid, int, uuid, numeric, text, timestamptz, text) from public, anon;
grant execute on function public.process_waitlist_atomic_promotion(uuid, uuid, int, uuid, numeric, text, timestamptz, text) to authenticated, service_role;

-- ------------------------------------------------------------
-- 3. C02 & A02 — Triggers de Integridade e Máquina de Estados em Reservations
-- ------------------------------------------------------------

-- Trigger BEFORE INSERT para garantir invariantes de reserva
create or replace function public.enforce_reservation_insert_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caravan record;
begin
  -- Buscar a caravana vinculada
  select * into v_caravan
  from public.caravans
  where id = new.caravan_id;

  if not found then
    raise exception 'Caravana não encontrada: %', new.caravan_id;
  end if;

  -- Usuário comum (não service_role e não admin de estaca) deve ter status inicial controlado
  if auth.role() != 'service_role' and not public.is_admin_estaca_of(new.stake_id) then
    -- Se a reserva estiver sendo criada como lista de espera, preserva lista_espera
    if new.status != 'lista_espera' then
      new.status := 'pendente';
    end if;

    -- Forçar preço conforme categoria da caravana (impede payment_amount = 0 ou arbitrário)
    if new.category = 'officiant' then
      new.payment_amount := v_caravan.price_officiant;
    else
      new.payment_amount := v_caravan.price_standard;
    end if;

    -- Validar assento dentro da capacidade da caravana
    if new.seat_number is not null then
      if new.seat_number < 1 or new.seat_number > v_caravan.seat_limit then
        raise exception 'Número de assento inválido. Deve estar entre 1 e %', v_caravan.seat_limit;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservations_insert_integrity on public.reservations;
create trigger trg_reservations_insert_integrity
  before insert on public.reservations
  for each row execute function public.enforce_reservation_insert_integrity();


-- Trigger BEFORE UPDATE para garantir máquina de estados e imutabilidade de campos chave
create or replace function public.enforce_reservation_update_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 1. Imutabilidade da caravana
  if old.caravan_id != new.caravan_id then
    raise exception 'Não é permitido alterar a caravana de uma reserva existente.';
  end if;

  -- 2. Imutabilidade do titular (exceto via service_role em procedimentos autorizados)
  if old.user_id != new.user_id and auth.role() != 'service_role' then
    raise exception 'Não é permitido alterar o usuário titular de uma reserva diretamente.';
  end if;

  -- 3. Validação de transição de status para usuários normais e admins
  if auth.role() != 'service_role' then
    -- Transição para 'pago_ala' exige admin de ala ou admin de estaca
    if old.status != 'pago_ala' and new.status = 'pago_ala' then
      if not (public.is_admin_ala_of(old.stake_id, old.ward_id) or public.is_admin_estaca_of(old.stake_id)) then
        raise exception 'Apenas administradores de Ala ou Estaca podem marcar status como pago_ala.'
          using errcode = '42501';
      end if;
    end if;

    -- Transição para 'confirmado' exige admin de estaca
    if old.status != 'confirmado' and new.status = 'confirmado' then
      if not public.is_admin_estaca_of(old.stake_id) then
        raise exception 'Apenas administradores de Estaca podem confirmar reservas.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservations_update_integrity on public.reservations;
create trigger trg_reservations_update_integrity
  before update on public.reservations
  for each row execute function public.enforce_reservation_update_integrity();

-- ------------------------------------------------------------
-- 4. A14 — Rate Limiter Atômico com Advisory Lock
-- ------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  cutoff_time timestamptz;
  current_events_count integer;
  oldest_event_in_window timestamptz;
  calculated_retry_after integer := 0;
  v_safe_limit integer;
  v_safe_window integer;
begin
  if p_key is null or trim(p_key) = '' then
    return jsonb_build_object('allowed', false, 'error', 'Parametro key obrigatorio');
  end if;

  -- Normalizar e proteger limites para evitar parâmetros arbitrários maliciosos
  v_safe_limit := greatest(1, least(coalesce(p_limit, 10), 1000));
  v_safe_window := greatest(1, least(coalesce(p_window_seconds, 60), 86400));

  -- Lock consultivo exclusivo baseado no hash da chave para serializar chamadas concorrentes
  perform pg_advisory_xact_lock(hashtext(p_key));

  cutoff_time := now() - (v_safe_window || ' seconds')::interval;

  -- 1. Limpeza oportunista de eventos expirados para esta chave
  delete from public.rate_limit_events
  where key = p_key and created_at < cutoff_time;

  -- 2. Contar eventos dentro da janela deslizante
  select count(*), min(created_at)
  into current_events_count, oldest_event_in_window
  from public.rate_limit_events
  where key = p_key and created_at >= cutoff_time;

  -- 3. Se atingiu ou ultrapassou o limite: bloqueia e calcula retry_after
  if current_events_count >= v_safe_limit then
    if oldest_event_in_window is not null then
      calculated_retry_after := greatest(1, ceil(extract(epoch from (oldest_event_in_window + (v_safe_window || ' seconds')::interval - now())))::integer);
    else
      calculated_retry_after := v_safe_window;
    end if;

    return jsonb_build_object(
      'allowed', false,
      'retry_after', calculated_retry_after,
      'current_count', current_events_count
    );
  end if;

  -- 4. Dentro do limite: insere novo evento
  insert into public.rate_limit_events (key, created_at)
  values (p_key, now());

  return jsonb_build_object(
    'allowed', true,
    'current_count', current_events_count + 1
  );
end;
$$;
