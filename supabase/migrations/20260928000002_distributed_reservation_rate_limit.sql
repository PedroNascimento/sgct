-- Rate limit distribuído para criação de reservas (Spec 003 / T003.5).
-- Uma única linha por usuário mantém o contador consistente entre todas as
-- instâncias da aplicação. A tabela não é acessível diretamente via Data API.

create table public.reservation_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.reservation_rate_limits enable row level security;
alter table public.reservation_rate_limits force row level security;

revoke all on table public.reservation_rate_limits from anon, authenticated;

create or replace function public.check_reservation_rate_limit()
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  updated_count integer;
begin
  if actor_id is null then
    return false;
  end if;

  insert into public.reservation_rate_limits as limits (
    user_id,
    window_started_at,
    request_count
  ) values (
    actor_id,
    now(),
    1
  )
  on conflict (user_id) do update
  set
    window_started_at = case
      when limits.window_started_at <= now() - interval '1 minute' then now()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= now() - interval '1 minute' then 1
      else limits.request_count + 1
    end
  returning request_count into updated_count;

  return updated_count <= 10;
end;
$$;

revoke all on function public.check_reservation_rate_limit() from public;
grant execute on function public.check_reservation_rate_limit() to authenticated;
