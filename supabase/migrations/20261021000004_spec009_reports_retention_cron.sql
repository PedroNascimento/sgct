-- ============================================================
-- SPEC 009: Relatórios Financeiros e Conformidade LGPD
-- 1. View v_ward_financial_summary protegida para administradores (Admin Ala e Admin Estaca)
-- 2. Agendamento pg_cron:
--    a. purge_expired_minor_data (semanal, domingos às 03:00 UTC)
--    b. deactivate_inactive_accounts (semanal, domingos às 03:30 UTC)
-- ============================================================

-- 1. View financeira por Ala restrita a administradores (Admin Ala e Admin Estaca)
create or replace view public.v_ward_financial_summary as
select
  stake_id, ward_id, caravan_id,
  count(*) filter (where status = 'confirmado') as confirmados,
  sum(payment_amount) filter (where status in ('pago_ala','confirmado')) as total_arrecadado
from public.reservations
where (public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id))
group by stake_id, ward_id, caravan_id;

alter view public.v_ward_financial_summary set (security_invoker = true);


-- 1. Job pg_cron: Expurgo semanal de dados de menores (>90 dias pós-viagem) (T009.6 / Artigo VI)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-expired-minor-data',
      '0 3 * * 0',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/purge-expired-minor-data'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule purge-expired-minor-data skipped in current environment: %', sqlerrm;
end;
$$;

-- 2. Job pg_cron: Inativação semanal de contas inativas (>24 meses sem login) (T009.8 / D14)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'deactivate-inactive-accounts',
      '30 3 * * 0',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/deactivate-inactive-accounts'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule deactivate-inactive-accounts skipped in current environment: %', sqlerrm;
end;
$$;
