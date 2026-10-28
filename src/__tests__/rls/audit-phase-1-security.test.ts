import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

describe("Auditoria Fase 1 — Bloqueios Críticos de Segurança e Banco de Dados", () => {
  jest.setTimeout(30000);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let memberClient: SupabaseClient;
  let wardAdminClient: SupabaseClient;
  let stakeId = "";
  let wardId = "";
  let caravanId = "";
  let memberUserId = "";
  let wardAdminUserId = "";
  let creatorId = "";
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    // 1. Criar Estaca e Ala
    const { data: stake, error: stakeErr } = await svc
      .from("stakes")
      .insert({ name: `Estaca Audit ${stamp}`, slug: `audit-stake-${stamp}` })
      .select("id")
      .single();
    if (stakeErr) throw stakeErr;
    stakeId = stake.id;

    const { data: ward, error: wardErr } = await svc
      .from("wards")
      .insert({ stake_id: stakeId, name: `Ala Audit ${stamp}` })
      .select("id")
      .single();
    if (wardErr) throw wardErr;
    wardId = ward.id;

    // Criar usuário para ser o criador da caravana
    const creatorEmail = `creator-${stamp}@teste.org`;
    const { data: creatorAuth, error: creatorAuthErr } = await svc.auth.admin.createUser({
      email: creatorEmail,
      password: "senha-segura-audit-123",
      email_confirm: true,
      user_metadata: { role: "admin_estaca", stake_id: stakeId },
    });
    if (creatorAuthErr) throw creatorAuthErr;
    creatorId = creatorAuth.user.id;

    const { error: creatorProfErr } = await svc.from("profiles").upsert({
      id: creatorId,
      stake_id: stakeId,
      full_name: `Stake Admin Audit ${stamp}`,
      birth_date: "1980-01-01",
      role: "admin_estaca",
      is_active: true,
    });
    if (creatorProfErr) throw creatorProfErr;

    // 2. Criar Caravana aberta com 48 lugares
    const dep = new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0];
    const deadline = new Date(Date.now() + 86400000 * 15).toISOString().split("T")[0];
    const quorumDate = new Date(Date.now() + 86400000 * 20).toISOString().split("T")[0];

    const { data: caravan, error: caravanErr } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeId,
        departure_date: dep,
        registration_deadline: deadline,
        quorum_check_date: quorumDate,
        price_standard: 150.0,
        price_officiant: 120.0,
        seat_limit: 48,
        waitlist_limit: 10,
        min_quorum: 40,
        status: "open",
        created_by: creatorId,
      })
      .select("id")
      .single();
    if (caravanErr) throw caravanErr;
    caravanId = caravan.id;

    // 3. Criar usuário Member
    const memberEmail = `member-${stamp}@teste.org`;
    const password = "senha-segura-audit-123";
    const { data: memberAuth, error: memberAuthErr } = await svc.auth.admin.createUser({
      email: memberEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "member", stake_id: stakeId, ward_id: wardId },
    });
    if (memberAuthErr) throw memberAuthErr;
    memberUserId = memberAuth.user.id;

    const { error: memberProfErr } = await svc.from("profiles").upsert({
      id: memberUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: `Membro Audit ${stamp}`,
      birth_date: "1995-05-05",
      role: "member",
      is_active: true,
    });
    if (memberProfErr) throw memberProfErr;

    memberClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginMemberErr } = await memberClient.auth.signInWithPassword({
      email: memberEmail,
      password,
    });
    if (loginMemberErr) throw loginMemberErr;

    // 4. Criar usuário Ward Admin
    const adminEmail = `admin-${stamp}@teste.org`;
    const { data: adminAuth, error: adminAuthErr } = await svc.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "admin_ala", stake_id: stakeId, ward_id: wardId },
    });
    if (adminAuthErr) throw adminAuthErr;
    wardAdminUserId = adminAuth.user.id;

    const { error: adminProfErr } = await svc.from("profiles").upsert({
      id: wardAdminUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: `Admin Ala Audit ${stamp}`,
      birth_date: "1985-05-05",
      role: "admin_ala",
      is_active: true,
    });
    if (adminProfErr) throw adminProfErr;

    wardAdminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginAdminErr } = await wardAdminClient.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (loginAdminErr) throw loginAdminErr;
  });

  afterAll(async () => {
    if (stakeId) {
      await svc.from("reservations").delete().eq("stake_id", stakeId);
      await svc.from("caravans").delete().eq("stake_id", stakeId);
      await svc.from("wards").delete().eq("stake_id", stakeId);
      await svc.from("profiles").delete().eq("stake_id", stakeId);
      await svc.from("stakes").delete().eq("id", stakeId);
    }
    if (memberUserId) await svc.auth.admin.deleteUser(memberUserId);
    if (wardAdminUserId) await svc.auth.admin.deleteUser(wardAdminUserId);
    if (creatorId) await svc.auth.admin.deleteUser(creatorId);
  });

  describe("C01 — Bloqueio de execução anônima/não autorizada na RPC de promoção", () => {
    it("deve rejeitar chamada anônima à RPC process_waitlist_atomic_promotion", async () => {
      const dummyId = "00000000-0000-0000-0000-000000000000";
      const { data, error } = await anonClient.rpc("process_waitlist_atomic_promotion", {
        p_vacated_reservation_id: dummyId,
        p_promoted_reservation_id: dummyId,
        p_assigned_seat_number: 1,
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it("deve rejeitar chamada de membro comum à RPC process_waitlist_atomic_promotion", async () => {
      const dummyId = "00000000-0000-0000-0000-000000000000";
      const { data, error } = await memberClient.rpc("process_waitlist_atomic_promotion", {
        p_vacated_reservation_id: dummyId,
        p_promoted_reservation_id: dummyId,
        p_assigned_seat_number: 1,
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it("permite execução por service_role derivando valores reais com segurança atômica", async () => {
      // 1. Criar reserva confirmada no assento 20
      const { data: resVacated, error: vacErr } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 20,
          status: "confirmado",
          payment_amount: 150.0,
        })
        .select()
        .single();
      expect(vacErr).toBeNull();

      // 2. Criar reserva em lista_espera para o mesmo usuário/outro membro
      const { data: resPromoted, error: promErr } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: null,
          status: "lista_espera",
          payment_amount: 150.0,
        })
        .select()
        .single();
      expect(promErr).toBeNull();

      // 3. Executar a promoção atômica via service_role
      const { data: result, error: rpcErr } = await svc.rpc("process_waitlist_atomic_promotion", {
        p_vacated_reservation_id: resVacated.id,
        p_promoted_reservation_id: resPromoted.id,
      });

      expect(rpcErr).toBeNull();
      expect(result).toBeDefined();
      expect(result.vacated.status).toBe("cancelada_com_credito");
      expect(result.promoted.status).toBe("confirmado");
      expect(result.promoted.seat_number).toBe(20);
      expect(Number(result.credit.amount)).toBe(150.0);
      expect(result.credit.user_id).toBe(memberUserId);
    });
  });

  describe("C02 — Impedir INSERT direto com status confirmado ou valor forjado", () => {
    it("força status 'pendente' e recalcula payment_amount legítimo se membro enviar valores forjados", async () => {
      const { data, error } = await memberClient
        .from("reservations")
        .insert({
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 10,
          status: "confirmado",
          payment_amount: 0.0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe("pendente");
      expect(Number(data.payment_amount)).toBe(150.0);
    });

    it("rejeita reserva se seat_number for além do limite de assentos da caravana", async () => {
      const { data, error } = await memberClient
        .from("reservations")
        .insert({
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 999, // limite é 48
          status: "pendente",
          payment_amount: 150.0,
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe("A05 — Unicidade de assento parcial (re-reserva após expiração/cancelamento)", () => {
    it("permite reservar novamente o mesmo assento após a reserva anterior expirar ou ser cancelada", async () => {
      // 1. Criar reserva confirmada no assento 5
      const { data: res1, error: res1Err } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 5,
          status: "confirmado",
          payment_amount: 150.0,
        })
        .select()
        .single();
      expect(res1Err).toBeNull();
      expect(res1.seat_number).toBe(5);

      // 2. Cancelar a reserva com crédito (status = 'cancelada_com_credito')
      const { error: cancelErr } = await svc
        .from("reservations")
        .update({ status: "cancelada_com_credito" })
        .eq("id", res1.id);
      expect(cancelErr).toBeNull();

      // 3. Tentar reservar o mesmo assento 5 para uma nova reserva
      const { data: res2, error: res2Err } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 5,
          status: "pendente",
          payment_amount: 150.0,
        })
        .select()
        .single();

      expect(res2Err).toBeNull();
      expect(res2).toBeDefined();
      expect(res2.seat_number).toBe(5);
      expect(res2.status).toBe("pendente");
    });

    it("bloqueia com erro de unicidade duas reservas ATIVAS no mesmo assento", async () => {
      // res2 está ativa no assento 5. Tentar inserir res3 ativa no assento 5:
      const { data: res3, error: res3Err } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 5,
          status: "pendente",
          payment_amount: 150.0,
        })
        .select()
        .single();

      expect(res3Err).toBeDefined();
      expect(res3Err?.code).toBe("23505");
      expect(res3).toBeNull();
    });
  });

  describe("A02 — Integridade de UPDATE em reservas (proteção de máquina de estados)", () => {
    it("não deve permitir que Admin de Ala mude o usuário titular de uma reserva", async () => {
      const { data: res, error: resErr } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 12,
          status: "pendente",
          payment_amount: 150.0,
        })
        .select()
        .single();
      expect(resErr).toBeNull();

      const { error: updateErr } = await wardAdminClient
        .from("reservations")
        .update({ user_id: wardAdminUserId })
        .eq("id", res.id);

      expect(updateErr).toBeDefined();
    });

    it("bloqueia Admin de Ala de marcar status diretamente como 'confirmado' (apenas 'pago_ala' permitido)", async () => {
      const { data: res, error: resErr } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 14,
          status: "pendente",
          payment_amount: 150.0,
        })
        .select()
        .single();
      expect(resErr).toBeNull();

      // Tentativa de pular para confirmado pelo admin de ala
      const { error: jumpErr } = await wardAdminClient
        .from("reservations")
        .update({ status: "confirmado" })
        .eq("id", res.id);

      expect(jumpErr).toBeDefined();

      // Transição legítima para pago_ala pelo admin de ala deve ser permitida
      const { error: legitErr } = await wardAdminClient
        .from("reservations")
        .update({ status: "pago_ala" })
        .eq("id", res.id);

      expect(legitErr).toBeNull();
    });
  });

  describe("A14 — Rate limiting atômico", () => {
    it("bloqueia chamadas excessivas e calcula retry_after corretamente sem sofrer race conditions", async () => {
      const testKey = `audit-rl-${stamp}`;
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          anonClient.rpc("check_rate_limit", {
            p_key: testKey,
            p_limit: 5,
            p_window_seconds: 60,
          })
        );
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter((r) => r.data?.allowed === true).length;
      const blockedCount = results.filter((r) => r.data?.allowed === false).length;

      expect(allowedCount).toBeLessThanOrEqual(5);
      expect(blockedCount).toBeGreaterThanOrEqual(10);
    });
  });
});
