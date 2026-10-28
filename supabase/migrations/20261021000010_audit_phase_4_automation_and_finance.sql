-- ==============================================================================
-- Migration: 20261021000010_audit_phase_4_automation_and_finance.sql
-- Fase 4 da Auditoria: Automação Operacional, Mensageria e Finanças (A11, M02, M03)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FILA DE NOTIFICAÇÕES (A11): Claim Atômico, Prioridade, Leases e Deduplicação
-- ------------------------------------------------------------------------------

-- Adicionar colunas necessárias na tabela notification_queue se não existirem
alter table public.notification_queue
  add column if not exists priority integer not null default 5,
  add column if not exists scheduled_for timestamptz default now(),
  add column if not exists lease_until timestamptz,
  add column if not exists dedup_key text;

-- Índice para busca e lock atômico de pendentes/leases expirados
create index if not exists idx_notification_queue_claim
  on public.notification_queue (status, scheduled_for, priority, created_at);

-- Índice único para deduplicação no banco por chave de idempotência
create unique index if not exists idx_notification_queue_dedup_key
  on public.notification_queue (dedup_key)
  where dedup_key is not null;

-- RPC de claim atômico com FOR UPDATE SKIP LOCKED
create or replace function public.claim_notification_queue_batch(
  p_batch_size integer default 10,
  p_lease_seconds integer default 120
)
returns setof public.notification_queue
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.notification_queue
  set
    status = 'processing',
    lease_until = clock_timestamp() + (p_lease_seconds || ' seconds')::interval,
    updated_at = clock_timestamp()
  where id in (
    select id
    from public.notification_queue
    where (status = 'pending' and (scheduled_for is null or scheduled_for <= clock_timestamp()))
       or (status = 'processing' and lease_until < clock_timestamp())
    order by priority asc, created_at asc
    limit p_batch_size
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_notification_queue_batch(integer, integer) from public;
grant execute on function public.claim_notification_queue_batch(integer, integer) to service_role;

-- RPC para verificação de cota diária por Estaca
create or replace function public.check_notification_daily_quota(
  p_stake_id uuid,
  p_max_daily integer default 1000
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select count(*) < p_max_daily
      from public.notification_queue
      where stake_id = p_stake_id
        and status = 'sent'
        and sent_at >= date_trunc('day', clock_timestamp())
    ),
    true
  );
$$;

revoke all on function public.check_notification_daily_quota(uuid, integer) from public;
grant execute on function public.check_notification_daily_quota(uuid, integer) to service_role;

-- ------------------------------------------------------------------------------
-- 2. RECONCILIAÇÃO FINANCEIRA (M02): Invariância no Embarque ('presente')
-- ------------------------------------------------------------------------------

-- Atualizar view v_ward_financial_summary para computar status 'presente'
create or replace view public.v_ward_financial_summary as
select
  stake_id,
  ward_id,
  caravan_id,
  count(*) filter (where status in ('confirmado', 'presente')) as confirmados,
  sum(payment_amount) filter (where status in ('pago_ala', 'confirmado', 'presente')) as total_arrecadado
from public.reservations
where (public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id))
group by stake_id, ward_id, caravan_id;

alter view public.v_ward_financial_summary set (security_invoker = true);

-- ------------------------------------------------------------------------------
-- 3. OBSERVABILIDADE DOS JOBS AGENDADOS (M03): cron_execution_logs
-- ------------------------------------------------------------------------------

create table if not exists public.cron_execution_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  records_affected integer default 0,
  details jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.cron_execution_logs is
  'Registro de telemetria, duração e integridade da execução dos crons (Spec 008/009 / M03).';

alter table public.cron_execution_logs enable row level security;
alter table public.cron_execution_logs force row level security;

-- Leitura permitida apenas a super_admin e admin_estaca para auditoria operacional
drop policy if exists cron_logs_select_admin on public.cron_execution_logs;
create policy cron_logs_select_admin on public.cron_execution_logs
  for select to authenticated
  using (
    public.current_role() in ('super_admin', 'admin_estaca')
  );

create index if not exists idx_cron_logs_job_started
  on public.cron_execution_logs (job_name, started_at desc);

-- ------------------------------------------------------------------------------
-- 4. AGENDAMENTO DE NO-SHOWS NO PG_CRON (M03)
-- ------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'mark-no-shows',
      '0 * * * *', -- Executa a cada hora cheia
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/mark-no-shows'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule mark-no-shows skipped in current environment: %', sqlerrm;
end;
$$;
