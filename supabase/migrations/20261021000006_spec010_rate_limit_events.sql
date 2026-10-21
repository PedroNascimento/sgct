-- Migration: Spec 010 - Rate Limiting Distribuído com Janela Deslizante (T010.1 / docs/SECURITY.md seção 3)
-- Artigo V da Constituição: Segurança por Padrão

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_events_key_created
  on public.rate_limit_events (key, created_at desc);

alter table public.rate_limit_events enable row level security;
alter table public.rate_limit_events force row level security;

-- Tabela não acessível diretamente pela Data API
revoke all on table public.rate_limit_events from anon, authenticated;

-- Função atômica com janela deslizante
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  cutoff_time timestamptz;
  current_events_count integer;
  oldest_event_in_window timestamptz;
  calculated_retry_after integer := 0;
begin
  if p_key is null or trim(p_key) = '' or p_limit <= 0 or p_window_seconds <= 0 then
    return jsonb_build_object('allowed', false, 'error', 'Parametros de rate limit invalidos');
  end if;

  cutoff_time := now() - (p_window_seconds || ' seconds')::interval;

  -- 1. Limpeza oportunista de eventos expirados para esta key
  delete from public.rate_limit_events
  where key = p_key and created_at < cutoff_time;

  -- 2. Contar eventos dentro da janela deslizante
  select count(*), min(created_at)
  into current_events_count, oldest_event_in_window
  from public.rate_limit_events
  where key = p_key and created_at >= cutoff_time;

  -- 3. Se atingiu ou ultrapassou o limite: bloqueia e calcula retry_after
  if current_events_count >= p_limit then
    if oldest_event_in_window is not null then
      calculated_retry_after := greatest(1, ceil(extract(epoch from (oldest_event_in_window + (p_window_seconds || ' seconds')::interval - now())))::integer);
    else
      calculated_retry_after := p_window_seconds;
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

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
