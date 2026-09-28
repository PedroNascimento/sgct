-- ============================================================
-- SPEC 004: Workflow de Pagamento e Validação Semanal
-- Jobs pg_cron:
-- 1. validate_weekly_transfers: toda terça-feira às 06:00 UTC (T004.6)
-- 2. expire_pending_reservations: diariamente às 03:00 UTC (T004.8)
-- ============================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Job semanal: Terça às 06:00
    perform cron.schedule(
      'validate-weekly-transfers',
      '0 6 * * 2',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/validate-weekly-transfers'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );

    -- Job diário: Todos os dias às 03:00
    perform cron.schedule(
      'expire-pending-reservations',
      '0 3 * * *',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/expire-pending-reservations'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedules skipped in current environment: %', sqlerrm;
end;
$$;
