-- ============================================================
-- SPEC 008: Notificações por E-mail
-- Tabela notification_queue + RLS (service_role apenas)
-- RPC de agregação de métricas para Admin Estaca
-- ============================================================

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id) on delete cascade,
  event_type text not null,
  recipient_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_queue is
  'Fila assíncrona de e-mails transacionais. Acesso estrito por service_role (Spec 008 / Artigo II).';

-- Habilitar e forçar RLS
alter table public.notification_queue enable row level security;
alter table public.notification_queue force row level security;

-- Nenhuma policy permissiva é criada para anon ou authenticated.
-- O Supabase rejeitará qualquer SELECT/INSERT/UPDATE/DELETE vindo de usuários finais.
-- Apenas service_role possui permissão de leitura/escrita na fila.

-- Índices de performance e consulta
create index if not exists idx_notification_queue_status_created
  on public.notification_queue (status, created_at);

create index if not exists idx_notification_queue_stake_created
  on public.notification_queue (stake_id, created_at);

create index if not exists idx_notification_queue_dedup
  on public.notification_queue (event_type, recipient_email, created_at);

-- Função de agregação de métricas diárias para Admin Estaca (T008.8)
create or replace function public.get_notification_metrics(p_stake_id uuid)
returns table (
  send_date date,
  total_count bigint,
  sent_count bigint,
  failed_count bigint,
  pending_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_estaca_of(p_stake_id) then
    raise exception 'Acesso negado: apenas o administrador da estaca pode consultar metricas de notificacao';
  end if;

  return query
  select
    date_trunc('day', nq.created_at)::date as send_date,
    count(*)::bigint as total_count,
    count(*) filter (where nq.status = 'sent')::bigint as sent_count,
    count(*) filter (where nq.status = 'failed')::bigint as failed_count,
    count(*) filter (where nq.status in ('pending', 'processing'))::bigint as pending_count
  from public.notification_queue nq
  where nq.stake_id = p_stake_id
  group by date_trunc('day', nq.created_at)::date
  order by send_date desc
  limit 30;
end;
$$;

-- Agendamento do job de processamento da fila de notificações via pg_cron (a cada 5 minutos)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'process-notification-queue',
      '*/5 * * * *',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/process-notifications'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule process-notification-queue skipped in current environment: %', sqlerrm;
end;
$$;
