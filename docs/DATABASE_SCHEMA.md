# Schema de Banco de Dados e Políticas RLS — SGCT
### 🔄 v3 — Auxílio Financeiro (gate) e Convidados Inter-Estaca

> **Regra de ouro deste projeto:** nenhuma tabela vai para produção sem política RLS que respeite os DOIS níveis de isolamento (Estaca e Ala). Se uma tabela nova for criada e este documento não for atualizado com a policy correspondente, o PR não pode ser aprovado. Ver checklist na seção 10.
>
> **Mudança de versão (v3):** adiciona `aid_requests` (gate de aprovação de auxílio financeiro, D27) e `guest_transfer_confirmations` (repasse inter-Estaca, D28) — a segunda é a exceção formalmente documentada no Artigo II.d (constituição v3.0.0). `reservations.ward_id` passa a ser nullable (só para convidado). Ver `docs/DECISIONS.md` D27-D30.

## 1. Convenções

- Toda tabela sensível tem colunas `stake_id uuid` **e** `ward_id uuid` (ambas denormalizadas, nunca aceitas como input direto — sempre derivadas via trigger, seção 3).
- `auth.uid()` identifica o usuário autenticado.
- Custom claims injetados no JWT via Auth Hook: `role` (`member` | `admin_ala` | `admin_estaca` | `super_admin`), `stake_id` (nulo apenas para `super_admin`) e `ward_id` (apenas para `member`/`admin_ala`).
- RLS é habilitada e **forçada** (`FORCE ROW LEVEL SECURITY`) em toda tabela, sem exceção — inclusive contra conexões administrativas usadas incorretamente.

---

## 2. Tabelas Principais (DDL)

```sql
-- ============================================================
-- STAKES (Estacas) — 🔄 NOVO: limite de tenant mais externo
-- ============================================================
create table stakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,              -- usado na rota pública /[estaca_slug]
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WARDS (Alas)
-- ============================================================
create table wards (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references stakes(id),   -- 🔄 NOVO
  name text not null,
  created_at timestamptz not null default now(),
  unique (stake_id, name)
);

-- ============================================================
-- PROFILES (estende auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stake_id uuid references stakes(id),            -- 🔄 NOVO; nulo apenas para super_admin
  full_name text not null,
  cpf text,
  birth_date date not null,
  phone text,
  sexo text check (sexo in ('masculino', 'feminino')),  -- 🔄 NOVO, perguntado uma vez no cadastro
  ward_id uuid references wards(id),                -- null para admin_estaca, super_admin E convidado
  role text not null default 'member'
    check (role in ('member', 'admin_ala', 'admin_estaca', 'super_admin', 'guest')), -- 🔄 guest (D28)
  home_stake_name text,                              -- 🔄 NOVO — só para role='guest', texto livre (D28)
  home_ward_name text,                                -- 🔄 NOVO — só para role='guest', texto livre (D28)
  is_minor boolean generated always as
    (extract(year from age(birth_date)) < 18) stored,
  guardian_id uuid references profiles(id),         -- opcional, nunca obrigatório para menores 12-17
  is_active boolean not null default true,           -- inativação automática (24 meses)
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guest_has_no_ward check (role != 'guest' or ward_id is null),               -- 🔄 NOVO
  constraint only_guest_has_home_stake check (role = 'guest' or home_stake_name is null) -- 🔄 NOVO
);

-- ============================================================
-- CARAVANS
-- ============================================================
create table caravans (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references stakes(id),    -- 🔄 NOVO
  departure_date date not null,
  return_date date,
  price_standard numeric(10,2) not null,
  price_officiant numeric(10,2) not null,
  seat_limit int not null default 50,
  waitlist_limit int not null default 5,
  registration_deadline date not null,              -- domingo anterior ao embarque
  min_quorum int not null default 48,
  quorum_check_date date not null,                  -- terça anterior ao embarque
  status text not null default 'open'
    check (status in ('open', 'quorum_pending', 'confirmed', 'cancelled', 'completed')),
  caravan_leader_id uuid references profiles(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table boarding_points (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references caravans(id) on delete cascade,
  stake_id uuid not null references stakes(id),    -- 🔄 NOVO (derivado via trigger)
  name text not null,
  boarding_time timestamptz not null
);

-- ============================================================
-- RESERVATIONS
-- ============================================================
create table reservations (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null references stakes(id),      -- 🔄 NOVO
  caravan_id uuid not null references caravans(id),
  user_id uuid not null references profiles(id),
  ward_id uuid references wards(id),                  -- 🔧 CORRIGIDO: nullable — null apenas para reserva de convidado (D28)
  seat_number int not null,
  boarding_point_id uuid references boarding_points(id),
  category text not null default 'standard'
    check (category in ('standard', 'officiant')),   -- autodeclarado pelo membro; define o PREÇO (D12)
  participant_type text not null default 'adulto'    -- metadado de logística, NÃO redefine preço (D29)
    check (participant_type in (
      'adulto', 'jovem', 'crianca', 'oficiante', 'investidura', 'selamento', 'missionario_servico'
    )),
  funding_source text not null default 'membro'       -- 🔧 CORRIGIDO (era payment_aid_type) — quem paga, não quanto (D30)
    check (funding_source in (
      'membro', 'auxilio_area_investidura', 'auxilio_recem_converso',
      'auxilio_estaca_fundo_reserva', 'convidado_transferencia_interestaca'
    )),
  is_preferential_seating boolean not null default false,  -- sem restrição de quais assentos, só um flag
  family_group_member_names text,                      -- texto livre, sem garantia de quarto (D18)
  companion_for_endowment_name text,                    -- opcional, logística interna do Templo
  status text not null default 'pendente' check (status in (
    'pendente', 'pago_ala', 'aguardando_auxilio', 'aguardando_transferencia_interestaca', -- 🔄 2 status novos
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

create index idx_reservations_stake on reservations (stake_id);   -- 🔄 índice primário de tenant
create index idx_reservations_stake_ward on reservations (stake_id, ward_id);
create index idx_reservations_caravan on reservations (caravan_id);

-- ============================================================
-- PASSENGER MANIFEST (crianças de colo)
-- ============================================================
create table passenger_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- 🔄 NOVO (derivado via trigger)
  ward_id uuid not null,
  reservation_id uuid not null references reservations(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  filiation text not null
);

-- ============================================================
-- MINOR APPROVAL FORMS
-- ============================================================
create table minor_approval_forms (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- 🔄 NOVO
  ward_id uuid not null,
  reservation_id uuid not null references reservations(id) on delete cascade,
  storage_path text not null,                          -- bucket privado, path prefixado por stake_id/ward_id
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references profiles(id),
  approved_at timestamptz
);

-- ============================================================
-- AID REQUESTS (auxílio financeiro) — 🔄 NOVO (D27, spec 012)
-- Mesmo padrão de gate do minor_approval_forms: aprovação bloqueante
-- antes de a reserva poder avançar para 'pago_ala'.
-- ============================================================
create table aid_requests (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- derivado da reservation via trigger
  ward_id uuid not null,
  reservation_id uuid not null references reservations(id) on delete cascade,
  aid_type text not null check (aid_type in (
    'auxilio_area_investidura', 'auxilio_recem_converso', 'auxilio_estaca_fundo_reserva'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid not null references profiles(id),  -- Admin Ala que registra o pedido (D27: "o líder preenche")
  approved_by uuid references profiles(id),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  notes text
);

-- ============================================================
-- GUEST TRANSFER CONFIRMATIONS (convidado inter-Estaca) — 🔄 NOVO (D28, spec 013)
-- Confirma o recebimento do repasse Ala origem → Estaca origem → Estaca anfitriã.
-- Só o Admin Estaca da Estaca ANFITRIÃ (stake_id desta linha) confirma.
-- ============================================================
create table guest_transfer_confirmations (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- Estaca ANFITRIÃ (derivada da reservation)
  reservation_id uuid not null references reservations(id) on delete cascade,
  origin_stake_name text not null,                     -- texto livre — Estaca de origem do convidado
  origin_ward_name text not null,                      -- texto livre — Ala de origem do convidado
  amount numeric(10,2) not null,
  confirmed_by uuid references profiles(id),           -- Admin Estaca anfitrião
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEAT SWAP REQUESTS (permuta)
-- ============================================================
create table seat_swap_requests (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- 🔄 NOVO
  ward_id uuid not null,
  original_reservation_id uuid not null references reservations(id),
  new_holder_full_name text not null,
  new_holder_document text,
  requested_by uuid not null references profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CREDIT LEDGER
-- ============================================================
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- 🔄 NOVO
  ward_id uuid not null,
  user_id uuid not null references profiles(id),
  amount numeric(10,2) not null,
  source text not null check (source in (
    'waitlist_promotion', 'caravan_cancelled', 'exceptional_grant'
  )),
  origin_reservation_id uuid references reservations(id),
  granted_by uuid references profiles(id),
  reason text,
  expires_at timestamptz not null,
  used_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'used', 'expired')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CHECK-INS
-- ============================================================
create table checkins (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid not null,                             -- 🔄 NOVO
  ward_id uuid not null,
  reservation_id uuid not null references reservations(id),
  direction text not null check (direction in ('ida', 'volta')),
  checked_in_by uuid not null references profiles(id),
  checked_in_at timestamptz not null default now(),
  synced_offline boolean not null default false,
  unique (reservation_id, direction)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  stake_id uuid,                                       -- 🔄 NOVO; nulo só para ações de super_admin (criação de Estaca)
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

---

## 3. Triggers de Consistência — `stake_id`/`ward_id` Nunca São Input do Client 🔄

Esta é a defesa mais importante contra vazamento cross-*stake*: mesmo que um client malicioso envie um `stake_id` forjado no payload, o valor gravado é **sempre recalculado a partir da entidade pai**, ignorando o que veio na requisição.

```sql
-- reservations.stake_id e .ward_id vêm da caravana e do perfil do usuário, nunca do payload
create or replace function enforce_reservation_tenant_consistency()
returns trigger language plpgsql as $$
declare
  profile_role text;
begin
  select c.stake_id into new.stake_id from caravans c where c.id = new.caravan_id;
  select p.ward_id, p.role into new.ward_id, profile_role from profiles p where p.id = new.user_id;
  if new.stake_id is null then
    raise exception 'Caravana inválida para esta reserva';
  end if;
  -- 🔄 CORRIGIDO: ward_id só é obrigatório para member/admin_ala/admin_estaca;
  -- reserva de convidado (profile.role = 'guest') tem ward_id null por design (D28).
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
  before insert on reservations
  for each row execute function enforce_reservation_tenant_consistency();

-- profiles.stake_id vem do ward escolhido no cadastro, nunca do payload direto
create or replace function enforce_profile_tenant_consistency()
returns trigger language plpgsql as $$
begin
  if new.role = 'super_admin' then
    new.stake_id := null; -- super_admin é intencionalmente global
    return new;
  end if;
  if new.role = 'guest' then
    -- 🔄 NOVO: convidado não tem Ala para derivar stake_id. O `stake_id` é resolvido
    -- SERVER-SIDE pela Server Action de cadastro de convidado, a partir do [estaca_slug]
    -- da rota (contexto confiável, nunca do payload livre do form) — ver spec 013.
    new.ward_id := null;
    if new.stake_id is null then
      raise exception 'stake_id da Estaca anfitriã é obrigatório para cadastro de convidado';
    end if;
    return new;
  end if;
  if new.ward_id is not null then
    select w.stake_id into new.stake_id from wards w where w.id = new.ward_id;
  end if;
  if new.stake_id is null then
    raise exception 'Ala inválida ou Estaca não resolvida para este perfil';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_tenant_consistency
  before insert on profiles
  for each row execute function enforce_profile_tenant_consistency();

-- Padrão idêntico se replica em boarding_points, passenger_manifest_entries,
-- minor_approval_forms, seat_swap_requests, credit_ledger, checkins:
-- stake_id/ward_id sempre = os da reservation_id (ou caravan_id) referenciada,
-- nunca aceitos do payload de INSERT. Ver checklist da seção 10.
```

---

## 4. Funções Helper para RLS (dois níveis)

```sql
create or replace function current_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member');
$$;

create or replace function current_stake_id() returns uuid          -- 🔄 NOVO
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'stake_id', '')::uuid;
$$;

create or replace function current_ward_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'ward_id', '')::uuid;
$$;

create or replace function is_super_admin() returns boolean          -- 🔄 NOVO
language sql stable as $$
  select current_role() = 'super_admin';
$$;

create or replace function is_admin_estaca_of(target_stake uuid) returns boolean  -- 🔄 assinatura muda: agora recebe stake
language sql stable as $$
  select current_role() = 'admin_estaca' and current_stake_id() = target_stake;
$$;

create or replace function is_admin_ala_of(target_stake uuid, target_ward uuid) returns boolean -- 🔄 assinatura muda
language sql stable as $$
  select current_role() = 'admin_ala'
    and current_stake_id() = target_stake
    and current_ward_id() = target_ward;
$$;
```

⚠️ **Nota de segurança:** `is_admin_ala_of` e `is_admin_estaca_of` agora exigem **os dois** IDs (stake e ward/stake) — isso é intencional. Comparar só `ward_id` seria suficiente em teoria (um ward pertence a um único stake), mas checar os dois explicitamente é defesa em profundidade e melhora o plano de execução (o Postgres filtra primeiro pelo `stake_id`, altamente seletivo entre muitos tenants, antes de checar `ward_id`).

---

## 5. Políticas RLS — Padrão de 4 Camadas

O padrão abaixo (`reservations`) é replicado em `passenger_manifest_entries`, `minor_approval_forms`, `seat_swap_requests`, `credit_ledger`, `checkins` — todas com `stake_id` + `ward_id` e a mesma regra de **4 camadas**: **dono → Admin Ala (própria Ala + própria Estaca) → Admin Estaca (própria Estaca, qualquer Ala) → `super_admin` NÃO tem acesso a estas tabelas.**

```sql
alter table reservations enable row level security;
alter table reservations force row level security;

create policy reservations_select on reservations
for select using (
  user_id = auth.uid()
  or is_admin_ala_of(stake_id, ward_id)
  or is_admin_estaca_of(stake_id)
  -- 🔄 NOTE: super_admin NÃO aparece aqui — least privilege (Artigo II.f da constituição)
);

create policy reservations_insert on reservations
for insert with check (
  user_id = auth.uid()
  -- stake_id/ward_id não são checados aqui pois o trigger da seção 3 os recalcula
  -- antes da avaliação do WITH CHECK; a policy garante apenas que o usuário
  -- só cria reserva para si mesmo.
);

create policy reservations_update_admin on reservations
for update using (
  is_admin_ala_of(stake_id, ward_id) or is_admin_estaca_of(stake_id)
) with check (
  is_admin_ala_of(stake_id, ward_id) or is_admin_estaca_of(stake_id)
);

-- Nenhuma policy de DELETE — bloqueado por padrão.
```

### 5.1. `stakes` — 🔄 NOVO

```sql
alter table stakes enable row level security;
alter table stakes force row level security;

-- Leitura pública (nome/slug não são sensíveis; necessário para resolver a rota /[estaca_slug])
create policy stakes_select_public on stakes for select using (true);

-- Escrita: SOMENTE super_admin
create policy stakes_write_super_admin on stakes
for all using (is_super_admin()) with check (is_super_admin());
```

### 5.2. `profiles`

```sql
alter table profiles enable row level security;
alter table profiles force row level security;

create policy profiles_select on profiles
for select using (
  id = auth.uid()
  or is_admin_ala_of(stake_id, ward_id)
  or is_admin_estaca_of(stake_id)
  -- super_admin não lê profiles de membros/admin_ala; só o INSERT abaixo, para bootstrap
);

create policy profiles_update_self on profiles
for update using (id = auth.uid())
with check (id = auth.uid() and role = 'member'); -- usuário não se autopromove

-- 🔄 super_admin pode inserir (bootstrap) o primeiro admin_estaca de uma Estaca nova
create policy profiles_insert_bootstrap on profiles
for insert with check (
  auth.uid() = id  -- autocadastro normal (member/admin_ala via signup)
  or (is_super_admin() and role = 'admin_estaca') -- bootstrap do 1º admin de uma Estaca
);
```

### 5.3. `wards`

```sql
alter table wards enable row level security;
alter table wards force row level security;

create policy wards_select on wards
for select using (
  stake_id = current_stake_id()   -- qualquer usuário autenticado da própria Estaca
  or is_super_admin()
);

create policy wards_write on wards
for all using (
  is_admin_estaca_of(stake_id) or is_super_admin()
) with check (
  is_admin_estaca_of(stake_id) or is_super_admin()
);
```

### 5.4. `caravans` / `boarding_points`

```sql
alter table caravans enable row level security;
alter table caravans force row level security;

-- Dado público (sem PII) do calendário — mas SEMPRE filtrado por stake_id na query da
-- aplicação (resolvido a partir do /[estaca_slug]), mesmo sendo tecnicamente "select using (true)".
create policy caravans_select_public on caravans for select using (true);

create policy caravans_write_admin_estaca on caravans
for all using (is_admin_estaca_of(stake_id)) with check (is_admin_estaca_of(stake_id));
```

⚠️ **Nota:** `caravans`/`boarding_points`/`stakes` (nome/slug) são dados de **calendário público**, não PII — por isso a policy de SELECT é permissiva. A aplicação (Server Component da rota `/[estaca_slug]`) **sempre** filtra explicitamente `WHERE stake_id = <resolvido do slug>` — nunca lista caravanas de todas as Estacas numa mesma tela. Isso é documentado aqui para não ser confundido com uma falha de isolamento: dado não-sensível pode ter RLS permissiva; dado sensível (reservas, financeiro, menores) nunca pode.

### 5.5. `minor_approval_forms` + Storage

```sql
alter table minor_approval_forms enable row level security;
alter table minor_approval_forms force row level security;

create policy minor_forms_select on minor_approval_forms
for select using (
  exists (select 1 from reservations r where r.id = reservation_id and r.user_id = auth.uid())
  or is_admin_ala_of(stake_id, ward_id)
  or is_admin_estaca_of(stake_id)
);

-- Storage bucket "minor-forms" — path prefixado como {stake_id}/{ward_id}/{reservation_id}/arquivo.pdf
create policy minor_forms_storage_select on storage.objects
for select using (
  bucket_id = 'minor-forms' and (
    owner = auth.uid()
    or is_admin_ala_of((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid)
    or is_admin_estaca_of((storage.foldername(name))[1]::uuid)
  )
);
```

Toda leitura de documento de menor por um admin grava `audit_logs` (`action = 'VIEW_MINOR_DOCUMENT'`, `stake_id` preenchido) na camada de aplicação.

### 5.5bis. `aid_requests` — 🔄 NOVO (mesmo padrão de `minor_approval_forms`)

```sql
alter table aid_requests enable row level security;
alter table aid_requests force row level security;

create policy aid_requests_select on aid_requests
for select using (
  exists (select 1 from reservations r where r.id = reservation_id and r.user_id = auth.uid())
  or is_admin_ala_of(stake_id, ward_id)
  or is_admin_estaca_of(stake_id)
);

-- Só Admin Ala/Estaca registram e aprovam — o membro não cria o próprio pedido (D27: "o líder preenche")
create policy aid_requests_write_admin on aid_requests
for all using (
  is_admin_ala_of(stake_id, ward_id) or is_admin_estaca_of(stake_id)
) with check (
  is_admin_ala_of(stake_id, ward_id) or is_admin_estaca_of(stake_id)
);
```

### 5.5ter. `guest_transfer_confirmations` — 🔄 NOVO (exceção documentada do Artigo II.d)

```sql
alter table guest_transfer_confirmations enable row level security;
alter table guest_transfer_confirmations force row level security;

-- Sem ward_id (convidado não pertence a nenhuma Ala) — só dono e Admin Estaca ANFITRIÃO
create policy guest_transfer_select on guest_transfer_confirmations
for select using (
  exists (select 1 from reservations r where r.id = reservation_id and r.user_id = auth.uid())
  or is_admin_estaca_of(stake_id)
  -- NOTA: is_admin_ala_of nunca concede acesso aqui, mesmo intencionalmente —
  -- reserva de convidado não pertence a nenhuma Ala (Artigo II.d).
);

-- Só o Admin Estaca da Estaca anfitriã confirma o recebimento do repasse
create policy guest_transfer_write_admin_estaca on guest_transfer_confirmations
for all using (is_admin_estaca_of(stake_id)) with check (is_admin_estaca_of(stake_id));
```

### 5.6. `credit_ledger`

```sql
alter table credit_ledger enable row level security;
alter table credit_ledger force row level security;

create policy credit_select on credit_ledger
for select using (
  user_id = auth.uid()
  or is_admin_ala_of(stake_id, ward_id)
  or is_admin_estaca_of(stake_id)
);

create policy credit_insert_admin on credit_ledger
for insert with check (
  is_admin_ala_of(stake_id, ward_id) or is_admin_estaca_of(stake_id)
);
```

### 5.7. `audit_logs`

```sql
alter table audit_logs enable row level security;
alter table audit_logs force row level security;

-- Admin Estaca vê os logs da própria Estaca; super_admin vê só logs de ações
-- de bootstrap (stake_id IS NULL), nunca logs operacionais de uma Estaca.
create policy audit_select on audit_logs
for select using (
  is_admin_estaca_of(stake_id)
  or (is_super_admin() and stake_id is null)
);

create policy audit_insert_service on audit_logs
for insert with check (auth.role() = 'service_role');
```

---

## 6. Relatórios Financeiros (Views Escopadas)

> 🔄 Reservas de convidado (`ward_id is null`) **não aparecem** em `v_ward_financial_summary` — isso é automático (o `group by ward_id` simplesmente não as inclui em nenhuma Ala) e correto: convidados não pertencem a nenhuma Ala anfitriã. O relatório consolidado de Admin Estaca deve somar separadamente uma linha "Convidados" a partir de `guest_transfer_confirmations`, ver spec `013-convidados-interestaca`.

```sql
create view v_ward_financial_summary as
select
  stake_id, ward_id, caravan_id,
  count(*) filter (where status = 'confirmado') as confirmados,
  sum(payment_amount) filter (where status in ('pago_ala','confirmado')) as total_arrecadado
from reservations
group by stake_id, ward_id, caravan_id;

alter view v_ward_financial_summary set (security_invoker = true);
-- RLS de reservations já se aplica via security_invoker — restringe automaticamente
-- por stake_id + ward_id sem precisar de policy própria na view.
```

---

## 7. View de Ocupação de Assentos (única exceção de isolamento)

```sql
create view v_seat_occupancy as
select
  stake_id, caravan_id, seat_number,     -- 🔄 stake_id incluído para a query da app filtrar corretamente
  case when status in ('pendente','pago_ala','confirmado','presente')
       then 'ocupado' else 'livre' end as occupancy_status
from reservations;

grant select on v_seat_occupancy to authenticated;
alter view v_seat_occupancy set (security_invoker = true);
```

A aplicação sempre filtra esta view por `stake_id = current_stake_id()` (o usuário só participa de reservas da própria Estaca de qualquer forma) — o campo existe na view por clareza e para permitir o teste de schema descrito em `docs/TESTING.md`.

---

## 8. Custom Claims (Auth Hook) — 🔄 inclui `stake_id`

```sql
create or replace function custom_access_token_hook(event jsonb)
returns jsonb language plpgsql as $$
declare
  claims jsonb;
  user_role text;
  user_stake uuid;
  user_ward uuid;
begin
  select role, stake_id, ward_id into user_role, user_stake, user_ward
  from profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(coalesce(user_role, 'member')));
  claims := jsonb_set(claims, '{app_metadata,stake_id}', to_jsonb(user_stake));
  claims := jsonb_set(claims, '{app_metadata,ward_id}', to_jsonb(user_ward));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

---

## 9. Teste Obrigatório de Vazamento (RLS) — Dois Níveis

Para **cada** tabela sensível, `npm run test:rls` cobre, no mínimo (fixtures com **2 Estacas distintas**, não só 2 Alas — ver Decisão D26):

1. **Cross-*stake*** (o mais crítico): Admin Estaca da Estaca A tenta `SELECT`/`INSERT`/`UPDATE` em qualquer dado da Estaca B → vazio/bloqueado.
2. **Cross-Ala dentro da mesma Estaca**: Admin Ala da Ala X tenta acessar dado da Ala Y, mesma Estaca → vazio/bloqueado.
3. **`super_admin` tentando ler `reservations`/`credit_ledger`/`minor_approval_forms`** de qualquer Estaca → vazio (confirma least privilege do Artigo II.f).
4. Membro tentando `SELECT` dado de outro membro → vazio.
5. Tentativa de forjar `stake_id` no payload de `INSERT` (ex: `reservations`) → o trigger da seção 3 sobrescreve com o valor correto, não com o forjado (teste verifica o valor gravado, não apenas se o INSERT foi aceito).
6. `v_seat_occupancy`: schema da resposta contém **apenas** `stake_id`, `caravan_id`, `seat_number`, `occupancy_status`.

---

## 10. Checklist Obrigatório Antes de Mergear Qualquer Migration

- [ ] `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` aplicados
- [ ] Tabela tem `stake_id` **e** `ward_id` se contém dado de reserva/membro (ambos indexados, `stake_id` primeiro)
- [ ] `stake_id`/`ward_id` são derivados por trigger `BEFORE INSERT`, nunca aceitos do payload
- [ ] Policy de `SELECT` cobre as 4 camadas corretas (confirmar se `super_admin` deve ou não ter acesso — default é **não**, salvo `stakes`/bootstrap de `profiles`)
- [ ] Nenhuma policy usa `USING (true)` em tabela com dado sensível (só permitido em `stakes`/`caravans`/`boarding_points`, que são dados públicos não-PII, documentado na seção 5.4)
- [ ] Teste de vazamento cross-*stake* **e** cross-Ala escrito em `test:rls` antes do merge
- [ ] Transições de status sensíveis passam por Server Action/Edge Function, não por UPDATE livre do client
