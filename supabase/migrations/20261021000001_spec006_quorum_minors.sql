-- ============================================================
-- SPEC 006: Quórum, Cancelamento de Caravana e Menores
-- 1. Job pg_cron: check-minimum-quorum, terça-feira às 05:00 UTC (T006.2)
-- 2. Storage bucket: minor-forms (privado) + RLS policies (T006.6, T006.9)
-- ============================================================

-- 1. Agendamento do job semanal de checagem de quórum via pg_cron
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'check-minimum-quorum',
      '0 5 * * 2',
      'select net.http_post(
        url := current_setting(''app.settings.service_url'', true) || ''/api/cron/check-minimum-quorum'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true)
        )
      );'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule check-minimum-quorum skipped in current environment: %', sqlerrm;
end;
$$;

-- 2. Criação do bucket privado 'minor-forms' caso não exista
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'minor-forms',
  'minor-forms',
  false,
  10485760, -- 10MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- 3. RLS para storage.objects no bucket minor-forms (DATABASE_SCHEMA.md 5.5)
-- O path é estruturado como: {stake_id}/{ward_id}/{reservation_id}/{filename}

drop policy if exists minor_forms_storage_select on storage.objects;
create policy minor_forms_storage_select on storage.objects
for select using (
  bucket_id = 'minor-forms' and (
    owner = auth.uid()
    or public.is_admin_ala_of(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
    or public.is_admin_estaca_of(
      ((storage.foldername(name))[1])::uuid
    )
  )
);

drop policy if exists minor_forms_storage_insert on storage.objects;
create policy minor_forms_storage_insert on storage.objects
for insert with check (
  bucket_id = 'minor-forms' and (
    auth.uid() is not null
    and exists (
      select 1 from public.reservations r
      where r.id = ((storage.foldername(name))[3])::uuid
        and r.user_id = auth.uid()
        and r.stake_id = ((storage.foldername(name))[1])::uuid
        and r.ward_id = ((storage.foldername(name))[2])::uuid
    )
  )
);

-- 4. Atualização da policy profiles_update_self
-- Permite que qualquer usuário autenticado (member, guest, admin_ala, admin_estaca)
-- atualize seus próprios dados cadastrais (nome, cpf, telefone, sexo).
-- Os campos sensíveis (role, stake_id, ward_id, is_active) continuam estritamente protegidos
-- pelo trigger trg_profiles_protect_security_fields.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());
