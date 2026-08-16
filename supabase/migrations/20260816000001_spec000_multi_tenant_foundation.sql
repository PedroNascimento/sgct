-- ============================================================
-- Migration 000: Fundação Multi-Tenant (Spec 000)
-- SGCT — Sistema de Gestão de Caravanas ao Templo
--
-- Implementa:
-- - Tabela stakes (T000.1)
-- - Coluna stake_id em todas as tabelas sensíveis (T000.2)
-- - Funções helper RLS (T000.3)
-- - Triggers de consistência de tenant (T000.4)
-- - Policies RLS de dois níveis (T000.5)
-- - Auth Hook custom_access_token_hook (T000.6)
--
-- Referência: docs/DATABASE_SCHEMA.md (v3)
-- Constituição: Artigos I, II, III, V, VI, IX
-- ============================================================

-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
create extension if not exists "pg_cron";

-- ============================================================
-- 2. TABELA STAKES (T000.1)
-- ============================================================
create table public.stakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.stakes is
  'Limite de tenant mais externo (Estaca). Vazamento cross-stake = incidente de segurança (Artigo II.a).';

-- ============================================================
-- 3. TABELAS PRINCIPAIS (T000.2)
-- ============================================================

-- WARDS
create table public.wards (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (stake_id, name)
);

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stake_id uuid references public.stakes(id),
  full_name text not null,
  cpf text,
  birth_date date not null,
  phone text,
  sexo text check (sexo in ('masculino', 'feminino')),
  ward_id uuid references public.wards(id),
  role text not null default 'member'
    check (role in ('member', 'admin_ala', 'admin_estaca', 'super_admin', 'guest')),
  home_stake_name text,
  home_ward_name text,
  -- is_minor: calculado no insert/update via trigger (age() não é imutável, não pode ser GENERATED STORED)
  is_minor boolean not null default false,
  guardian_id uuid references public.profiles(id),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  -- Constituição Artigo II.c: stake_id nulo APENAS para super_admin
  constraint chk_super_admin_no_stake
    check (role != 'super_admin' or stake_id is null),
  -- super_admin e admin_estaca não têm ward_id
  constraint chk_ward_by_role
    check (role not in ('super_admin', 'admin_estaca') or ward_id is null),
  -- Convidado não tem Ala (D28)
  constraint guest_has_no_ward
    check (role != 'guest' or ward_id is null),
  -- home_stake_name só para convidado (D28)
  constraint only_guest_has_home_stake
    check (role = 'guest' or home_stake_name is null)
);

-- CARAVANS
create table public.caravans (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  departure_date date not null,
  return_date date,
  price_standard numeric(10,2) not null,
  price_officiant numeric(10,2) not null,
  seat_limit int not null default 50,
  waitlist_limit int not null default 5,
  registration_deadline date not null,
  min_quorum int not null default 48,
  quorum_check_date date not null,
  status text not null default 'open'
    check (status in ('open', 'quorum_pending', 'confirmed', 'cancelled', 'completed')),
  caravan_leader_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- BOARDING POINTS
create table public.boarding_points (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references public.caravans(id) on delete cascade,
  stake_id uuid not null references public.stakes(id),
  name text not null,
  boarding_time timestamptz not null
);

-- RESERVATIONS
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  caravan_id uuid not null references public.caravans(id),
  user_id uuid not null references public.profiles(id),
  ward_id uuid references public.wards(id), -- null para convidado (D28)
  seat_number int not null,
  boarding_point_id uuid references public.boarding_points(id),
  category text not null default 'standard'
    check (category in ('standard', 'officiant')),
  participant_type text not null default 'adulto'
    check (participant_type in (
      'adulto', 'jovem', 'crianca', 'oficiante',
      'investidura', 'selamento', 'missionario_servico'
    )),
  funding_source text not null default 'membro'
    check (funding_source in (
      'membro', 'auxilio_area_investidura', 'auxilio_recem_converso',
      'auxilio_estaca_fundo_reserva', 'convidado_transferencia_interestaca'
    )),
  is_preferential_seating boolean not null default false,
  family_group_member_names text,
  companion_for_endowment_name text,
  status text not null default 'pendente' check (status in (
    'pendente', 'pago_ala', 'aguardando_auxilio', 'aguardando_transferencia_interestaca',
    'confirmado', 'presente',
    'no_show', 'cancelada_com_credito', 'cancelada_sem_credito',
    'expirada', 'lista_espera'
  )),
  payment_amount numeric(10,2) not null,
  confirmed_at timestamptz,
  confirmation_rank int,
  qr_token text,
  qr_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (caravan_id, seat_number)
);

create index idx_reservations_stake on public.reservations (stake_id);
create index idx_reservations_stake_ward on public.reservations (stake_id, ward_id);
create index idx_reservations_caravan on public.reservations (caravan_id);

-- PASSENGER MANIFEST
create table public.passenger_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  filiation text not null
);

-- MINOR APPROVAL FORMS
create table public.minor_approval_forms (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz
);

-- AID REQUESTS (spec 012)
create table public.aid_requests (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  aid_type text not null check (aid_type in (
    'auxilio_area_investidura', 'auxilio_recem_converso', 'auxilio_estaca_fundo_reserva'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  notes text
);

-- GUEST TRANSFER CONFIRMATIONS (spec 013 — exceção documentada Artigo II.d)
create table public.guest_transfer_confirmations (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  origin_stake_name text not null,
  origin_ward_name text not null,
  amount numeric(10,2) not null,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- SEAT SWAP REQUESTS
create table public.seat_swap_requests (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  original_reservation_id uuid not null references public.reservations(id),
  new_holder_full_name text not null,
  new_holder_document text,
  requested_by uuid not null references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- CREDIT LEDGER
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  user_id uuid not null references public.profiles(id),
  amount numeric(10,2) not null,
  source text not null check (source in (
    'waitlist_promotion', 'caravan_cancelled', 'exceptional_grant'
  )),
  origin_reservation_id uuid references public.reservations(id),
  granted_by uuid references public.profiles(id),
  reason text,
  expires_at timestamptz not null,
  used_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'used', 'expired')),
  created_at timestamptz not null default now()
);

-- CHECKINS
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references public.stakes(id),
  ward_id uuid not null references public.wards(id),
  reservation_id uuid not null references public.reservations(id),
  direction text not null check (direction in ('ida', 'volta')),
  checked_in_by uuid not null references public.profiles(id),
  checked_in_at timestamptz not null default now(),
  synced_offline boolean not null default false,
  unique (reservation_id, direction)
);

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid references public.stakes(id), -- null para ações de super_admin
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3.5. TRIGGER is_minor — age() não é imutável, calcula na escrita
-- ============================================================

create or replace function public.compute_is_minor()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.is_minor := (date_part('year', age(now(), new.birth_date::date)) < 18);
  return new;
end;
$$;

create trigger trg_profiles_compute_is_minor
  before insert or update of birth_date on public.profiles
  for each row execute function public.compute_is_minor();

-- ============================================================
-- 4. FUNÇÕES HELPER RLS (T000.3)
-- DATABASE_SCHEMA.md seção 4
-- ============================================================

create or replace function public.current_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'anon');
$$;

create or replace function public.current_stake_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'stake_id', '')::uuid;
$$;

create or replace function public.current_ward_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'ward_id', '')::uuid;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_role() = 'super_admin';
$$;

create or replace function public.is_admin_estaca_of(target_stake uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_role() = 'admin_estaca'
     and public.current_stake_id() = target_stake;
$$;

create or replace function public.is_admin_ala_of(target_stake uuid, target_ward uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_role() = 'admin_ala'
     and public.current_stake_id() = target_stake
     and public.current_ward_id() = target_ward;
$$;

-- ============================================================
-- 5. TRIGGERS DE CONSISTÊNCIA DE TENANT (T000.4)
-- DATABASE_SCHEMA.md seção 3
-- Artigo II.c: stake_id/ward_id NUNCA aceitos do client — sempre derivados
-- ============================================================

-- profiles.stake_id: derivado do ward ou null para super_admin
create or replace function public.enforce_profile_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.role = 'super_admin' then
    new.stake_id := null;
    return new;
  end if;
  if new.role = 'guest' then
    new.ward_id := null;
    if new.stake_id is null then
      raise exception 'stake_id da Estaca anfitriã é obrigatório para cadastro de convidado';
    end if;
    return new;
  end if;
  if new.ward_id is not null then
    select w.stake_id into new.stake_id
    from public.wards w
    where w.id = new.ward_id;
  end if;
  if new.stake_id is null then
    raise exception 'Ala inválida ou Estaca não resolvida para este perfil';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_tenant_consistency
  before insert on public.profiles
  for each row execute function public.enforce_profile_tenant_consistency();

-- reservations.stake_id: derivado da caravana; ward_id: derivado do profile do usuário
create or replace function public.enforce_reservation_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_role text;
begin
  select c.stake_id into new.stake_id
  from public.caravans c where c.id = new.caravan_id;

  select p.ward_id, p.role into new.ward_id, profile_role
  from public.profiles p where p.id = new.user_id;

  if new.stake_id is null then
    raise exception 'Caravana inválida para esta reserva';
  end if;
  -- ward_id obrigatório exceto para convidados (D28)
  if new.ward_id is null and profile_role != 'guest' then
    raise exception 'Perfil inválido para esta reserva (ward_id ausente e não é convidado)';
  end if;
  if profile_role = 'guest' then
    new.funding_source := 'convidado_transferencia_interestaca';
  end if;
  return new;
end;
$$;

create trigger trg_reservations_tenant_consistency
  before insert on public.reservations
  for each row execute function public.enforce_reservation_tenant_consistency();

-- boarding_points.stake_id: derivado da caravana
create or replace function public.enforce_boarding_point_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select c.stake_id into new.stake_id
  from public.caravans c where c.id = new.caravan_id;
  if new.stake_id is null then
    raise exception 'Caravana inválida para este ponto de embarque';
  end if;
  return new;
end;
$$;

create trigger trg_boarding_points_tenant_consistency
  before insert on public.boarding_points
  for each row execute function public.enforce_boarding_point_tenant_consistency();

-- Função genérica: tabelas derivadas de reservations herdam stake_id + ward_id
create or replace function public.enforce_reservation_derived_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select r.stake_id, r.ward_id into new.stake_id, new.ward_id
  from public.reservations r where r.id = new.reservation_id;
  if new.stake_id is null then
    raise exception 'Reserva inválida (stake_id não resolvido)';
  end if;
  return new;
end;
$$;

-- Aplicar trigger nas tabelas derivadas de reservations
create trigger trg_manifest_tenant_consistency
  before insert on public.passenger_manifest_entries
  for each row execute function public.enforce_reservation_derived_tenant_consistency();

create trigger trg_minor_forms_tenant_consistency
  before insert on public.minor_approval_forms
  for each row execute function public.enforce_reservation_derived_tenant_consistency();

create trigger trg_aid_requests_tenant_consistency
  before insert on public.aid_requests
  for each row execute function public.enforce_reservation_derived_tenant_consistency();

create trigger trg_guest_transfer_tenant_consistency
  before insert on public.guest_transfer_confirmations
  for each row execute function public.enforce_reservation_derived_tenant_consistency();

-- seat_swap_requests: stake_id/ward_id da reserva original
create or replace function public.enforce_swap_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select r.stake_id, r.ward_id into new.stake_id, new.ward_id
  from public.reservations r where r.id = new.original_reservation_id;
  if new.stake_id is null then
    raise exception 'Reserva original inválida para permuta';
  end if;
  return new;
end;
$$;

create trigger trg_swap_tenant_consistency
  before insert on public.seat_swap_requests
  for each row execute function public.enforce_swap_tenant_consistency();

-- credit_ledger: stake_id/ward_id do profile do beneficiário
create or replace function public.enforce_credit_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select p.stake_id, p.ward_id into new.stake_id, new.ward_id
  from public.profiles p where p.id = new.user_id;
  if new.stake_id is null then
    raise exception 'Perfil inválido para crédito (stake_id não resolvido)';
  end if;
  return new;
end;
$$;

create trigger trg_credit_tenant_consistency
  before insert on public.credit_ledger
  for each row execute function public.enforce_credit_tenant_consistency();

-- checkins: stake_id/ward_id da reserva
create or replace function public.enforce_checkin_tenant_consistency()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select r.stake_id, r.ward_id into new.stake_id, new.ward_id
  from public.reservations r where r.id = new.reservation_id;
  if new.stake_id is null then
    raise exception 'Reserva inválida para check-in';
  end if;
  return new;
end;
$$;

create trigger trg_checkin_tenant_consistency
  before insert on public.checkins
  for each row execute function public.enforce_checkin_tenant_consistency();

-- ============================================================
-- 6. HABILITAR RLS (T000.5) — FORCE em todas as tabelas
-- "FORCE" garante que nem conexões administrativas burlem as policies
-- ============================================================

alter table public.stakes enable row level security;
alter table public.stakes force row level security;

alter table public.wards enable row level security;
alter table public.wards force row level security;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.caravans enable row level security;
alter table public.caravans force row level security;

alter table public.boarding_points enable row level security;
alter table public.boarding_points force row level security;

alter table public.reservations enable row level security;
alter table public.reservations force row level security;

alter table public.passenger_manifest_entries enable row level security;
alter table public.passenger_manifest_entries force row level security;

alter table public.minor_approval_forms enable row level security;
alter table public.minor_approval_forms force row level security;

alter table public.aid_requests enable row level security;
alter table public.aid_requests force row level security;

alter table public.guest_transfer_confirmations enable row level security;
alter table public.guest_transfer_confirmations force row level security;

alter table public.seat_swap_requests enable row level security;
alter table public.seat_swap_requests force row level security;

alter table public.credit_ledger enable row level security;
alter table public.credit_ledger force row level security;

alter table public.checkins enable row level security;
alter table public.checkins force row level security;

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

-- ============================================================
-- 7. POLICIES RLS — PADRÃO DE 4 CAMADAS (T000.5)
-- DATABASE_SCHEMA.md seção 5
-- super_admin NUNCA aparece em tabelas sensíveis (Artigo II.f)
-- ============================================================

-- ── stakes (5.1) ────────────────────────────────────────────
-- Leitura pública (nome/slug não são PII; necessário para resolver /[estaca_slug])
create policy stakes_select_public on public.stakes
  for select using (true);

-- Escrita: SOMENTE super_admin
create policy stakes_write_super_admin on public.stakes
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── profiles (5.2) ──────────────────────────────────────────
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
    -- super_admin NÃO lê profiles de membros (Artigo II.f)
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'member');

-- super_admin pode inserir o primeiro admin_estaca de uma Estaca nova (bootstrap)
create policy profiles_insert_bootstrap on public.profiles
  for insert with check (
    auth.uid() = id
    or (public.is_super_admin() and role = 'admin_estaca')
  );

-- ── wards (5.3) ─────────────────────────────────────────────
create policy wards_select on public.wards
  for select using (
    stake_id = public.current_stake_id()
    or public.is_super_admin()
  );

create policy wards_write on public.wards
  for all using (
    public.is_admin_estaca_of(stake_id) or public.is_super_admin()
  )
  with check (
    public.is_admin_estaca_of(stake_id) or public.is_super_admin()
  );

-- ── caravans + boarding_points (5.4) ────────────────────────
-- Dado público (calendário) — filtrado pelo stake_id na query da aplicação
create policy caravans_select_public on public.caravans
  for select using (true);

create policy caravans_write_admin_estaca on public.caravans
  for all using (public.is_admin_estaca_of(stake_id))
  with check (public.is_admin_estaca_of(stake_id));

create policy boarding_points_select_public on public.boarding_points
  for select using (true);

create policy boarding_points_write_admin_estaca on public.boarding_points
  for all using (public.is_admin_estaca_of(stake_id))
  with check (public.is_admin_estaca_of(stake_id));

-- ── reservations (5.0 — padrão de referência) ───────────────
create policy reservations_select on public.reservations
  for select using (
    user_id = auth.uid()
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
    -- super_admin NÃO aparece aqui (Artigo II.f)
  );

create policy reservations_insert on public.reservations
  for insert with check (user_id = auth.uid());

create policy reservations_update_admin on public.reservations
  for update using (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  )
  with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── passenger_manifest_entries ──────────────────────────────
create policy manifest_select on public.passenger_manifest_entries
  for select using (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy manifest_insert on public.passenger_manifest_entries
  for insert with check (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
  );

-- ── minor_approval_forms (5.5) ──────────────────────────────
create policy minor_forms_select on public.minor_approval_forms
  for select using (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy minor_forms_write_admin on public.minor_approval_forms
  for all using (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  )
  with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── aid_requests (5.5bis) ───────────────────────────────────
create policy aid_requests_select on public.aid_requests
  for select using (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy aid_requests_write_admin on public.aid_requests
  for all using (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  )
  with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── guest_transfer_confirmations (5.5ter) ───────────────────
create policy guest_transfer_select on public.guest_transfer_confirmations
  for select using (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
    or public.is_admin_estaca_of(stake_id)
    -- is_admin_ala_of NÃO concede acesso (convidado não pertence a Ala — Artigo II.d)
  );

create policy guest_transfer_write_admin_estaca on public.guest_transfer_confirmations
  for all using (public.is_admin_estaca_of(stake_id))
  with check (public.is_admin_estaca_of(stake_id));

-- ── seat_swap_requests ──────────────────────────────────────
create policy swap_select on public.seat_swap_requests
  for select using (
    requested_by = auth.uid()
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy swap_insert on public.seat_swap_requests
  for insert with check (requested_by = auth.uid());

create policy swap_update_admin on public.seat_swap_requests
  for update using (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  )
  with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── credit_ledger (5.6) ─────────────────────────────────────
create policy credit_select on public.credit_ledger
  for select using (
    user_id = auth.uid()
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy credit_insert_admin on public.credit_ledger
  for insert with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── checkins ────────────────────────────────────────────────
create policy checkins_select on public.checkins
  for select using (
    exists (select 1 from public.reservations r
            where r.id = reservation_id and r.user_id = auth.uid())
    or public.is_admin_ala_of(stake_id, ward_id)
    or public.is_admin_estaca_of(stake_id)
  );

create policy checkins_insert_leader on public.checkins
  for insert with check (
    public.is_admin_ala_of(stake_id, ward_id) or public.is_admin_estaca_of(stake_id)
  );

-- ── audit_logs (5.7) ────────────────────────────────────────
-- Admin Estaca vê logs da própria Estaca; super_admin vê SÓ logs de bootstrap (stake_id IS NULL)
create policy audit_select on public.audit_logs
  for select using (
    public.is_admin_estaca_of(stake_id)
    or (public.is_super_admin() and stake_id is null)
  );

-- Apenas service_role pode inserir em audit_logs (evita falsificação de log)
create policy audit_insert_service on public.audit_logs
  for insert with check (auth.role() = 'service_role');

-- ============================================================
-- 8. AUTH HOOK — custom_access_token_hook (T000.6)
-- DATABASE_SCHEMA.md seção 8
-- Injeta role, stake_id, ward_id no JWT como app_metadata
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_role text;
  user_stake uuid;
  user_ward uuid;
begin
  select role, stake_id, ward_id
  into user_role, user_stake, user_ward
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{app_metadata,role}',
              to_jsonb(coalesce(user_role, 'member')));
  claims := jsonb_set(claims, '{app_metadata,stake_id}',
              to_jsonb(user_stake));
  claims := jsonb_set(claims, '{app_metadata,ward_id}',
              to_jsonb(user_ward));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Conceder permissão para o Auth Hook chamar a função
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ============================================================
-- 9. VIEWS (DATABASE_SCHEMA.md seções 6 e 7)
-- ============================================================

-- View financeira por Ala (escopada por RLS via security_invoker)
create view public.v_ward_financial_summary as
select
  stake_id, ward_id, caravan_id,
  count(*) filter (where status = 'confirmado') as confirmados,
  sum(payment_amount) filter (where status in ('pago_ala','confirmado')) as total_arrecadado
from public.reservations
group by stake_id, ward_id, caravan_id;

alter view public.v_ward_financial_summary set (security_invoker = true);

-- View de ocupação de assentos (única exceção de isolamento documentada — D09)
create view public.v_seat_occupancy as
select
  stake_id, caravan_id, seat_number,
  case when status in ('pendente','pago_ala','confirmado','presente')
       then 'ocupado' else 'livre' end as occupancy_status
from public.reservations;

grant select on public.v_seat_occupancy to authenticated;
alter view public.v_seat_occupancy set (security_invoker = true);
