-- ============================================================
-- SPEC 005: Fila de Espera, Permuta e Crédito
-- 1. Função atômica: process_waitlist_atomic_promotion (T005.1 / T005.2)
-- 2. Job pg_cron: expire_credits, diário às 04:00 UTC (T005.8)
-- ============================================================

-- 1. Procedimento atômico para promoção da lista de espera + geração de crédito
create or replace function public.process_waitlist_atomic_promotion(
  p_vacated_reservation_id uuid,
  p_promoted_reservation_id uuid,
  p_assigned_seat_number int,
  p_credit_user_id uuid,
  p_credit_amount numeric,
  p_credit_source text,
  p_credit_expires_at timestamptz,
  p_credit_reason text default 'Promoção da fila de espera'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_vacated record;
  v_promoted record;
  v_credit record;
begin
  -- Atualiza reserva que desocupou a vaga para cancelada_com_credito
  update public.reservations
  set status = 'cancelada_com_credito'
  where id = p_vacated_reservation_id
  returning * into v_vacated;

  if not found then
    raise exception 'Reserva desocupada não encontrada: %', p_vacated_reservation_id;
  end if;

  -- Promove a reserva da lista de espera para o assento desocupado
  update public.reservations
  set status = 'confirmado',
      seat_number = p_assigned_seat_number,
      confirmed_at = now()
  where id = p_promoted_reservation_id
  returning * into v_promoted;

  if not found then
    raise exception 'Reserva da lista de espera não encontrada: %', p_promoted_reservation_id;
  end if;

  -- Gera o crédito correspondente no credit_ledger
  -- triggers cuidarão de derivar stake_id e ward_id a partir do profile
  insert into public.credit_ledger (
    user_id,
    amount,
    source,
    origin_reservation_id,
    expires_at,
    reason,
    status
  ) values (
    p_credit_user_id,
    p_credit_amount,
    p_credit_source,
    p_vacated_reservation_id,
    p_credit_expires_at,
    p_credit_reason,
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

-- 2. Agendamento do job diário de expiração de créditos via pg_cron (T005.8)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'expire-credits',
      '0 4 * * *',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/expire-credits'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule expire-credits skipped in current environment: %', sqlerrm;
end;
$$;
