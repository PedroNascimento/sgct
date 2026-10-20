/**
 * Testes RLS para Isolamento de Credit Ledger e Seat Swap Requests (T005.6).
 *
 * Artigo II da Constituição (Isolamento em Dois Níveis: Estaca e Ala):
 * - Membro só lê seus próprios créditos e seus próprios pedidos de permuta.
 * - Membro de outra Ala/Estaca tentando ler crédito ou permuta de terceiros -> vazio.
 * - Admin Ala só enxerga créditos e permutas da SUA PRÓPRIA Ala e Estaca.
 * - Admin Ala de outra Ala da mesma Estaca -> vazio.
 * - Admin Ala de outra Estaca -> vazio.
 * - Admin Estaca enxerga créditos e permutas de TODAS as Alas da sua Estaca.
 * - Admin Estaca de outra Estaca -> vazio.
 * - super_admin NÃO tem acesso de leitura a credit_ledger nem a seat_swap_requests (Artigo II.f).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("RLS — Isolamento de Credit Ledger e Seat Swap Requests (T005.6)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;
  let wardB1Id: string;

  let memberA1Id: string;
  let memberA2Id: string;
  let adminA1Id: string;
  let adminA2Id: string;
  let adminEstacaAId: string;
  let adminB1Id: string;
  let superAdminId: string;

  let clientMemberA1: SupabaseClient;
  let clientMemberA2: SupabaseClient;
  let clientAdminA1: SupabaseClient;
  let clientAdminA2: SupabaseClient;
  let clientAdminEstacaA: SupabaseClient;
  let clientAdminB1: SupabaseClient;
  let clientSuperAdmin: SupabaseClient;

  let caravanAId: string;
  let reservationA1Id: string;
  let creditEntryA1Id: string;
  let swapRequestA1Id: string;

  const timestamp = Date.now();
  const PWD = "senha-segura-rls-123";

  beforeAll(async () => {
    // 1. Criar Estaca A e Estaca B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: "Estaca A Crédito",
        slug: `stake-a-credit-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: "Estaca B Crédito",
        slug: `stake-b-credit-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Alas
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A1 ${timestamp}` })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A2 ${timestamp}` })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    const { data: wardB1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeBId, name: `Ala B1 ${timestamp}` })
      .select("id")
      .single();
    wardB1Id = wardB1!.id;

    // Função auxiliar para criar usuário
    async function createUser(
      email: string,
      role: "member" | "admin_ala" | "admin_estaca" | "super_admin",
      stakeId: string | null,
      wardId: string | null,
      fullName: string
    ): Promise<{ id: string; client: SupabaseClient }> {
      const { data: authUser, error: authErr } = await svc.auth.admin.createUser({
        email,
        password: PWD,
        email_confirm: true,
        app_metadata: { role, stake_id: stakeId, ward_id: wardId },
      });
      if (authErr) throw authErr;
      const uid = authUser.user!.id;

      await svc.from("profiles").insert({
        id: uid,
        stake_id: stakeId,
        ward_id: wardId,
        role,
        full_name: fullName,
        cpf: `cpf-${timestamp}-${uid.slice(0, 8)}`,
        birth_date: "1990-01-01",
        phone: "(84) 99999-9999",
        sexo: "masculino",
        is_active: true,
      });

      const userClient = anonClient();
      await userClient.auth.signInWithPassword({ email, password: PWD });
      return { id: uid, client: userClient };
    }

    // 3. Criar os perfis e clientes
    const m1 = await createUser(`member-a1-${timestamp}@sgct.dev`, "member", stakeAId, wardA1Id, "Membro A1");
    memberA1Id = m1.id;
    clientMemberA1 = m1.client;

    const m2 = await createUser(`member-a2-${timestamp}@sgct.dev`, "member", stakeAId, wardA2Id, "Membro A2");
    memberA2Id = m2.id;
    clientMemberA2 = m2.client;

    const aA1 = await createUser(`admin-a1-${timestamp}@sgct.dev`, "admin_ala", stakeAId, wardA1Id, "Admin Ala A1");
    adminA1Id = aA1.id;
    clientAdminA1 = aA1.client;

    const aA2 = await createUser(`admin-a2-${timestamp}@sgct.dev`, "admin_ala", stakeAId, wardA2Id, "Admin Ala A2");
    adminA2Id = aA2.id;
    clientAdminA2 = aA2.client;

    const aEstA = await createUser(`admin-est-a-${timestamp}@sgct.dev`, "admin_estaca", stakeAId, null, "Admin Estaca A");
    adminEstacaAId = aEstA.id;
    clientAdminEstacaA = aEstA.client;

    const aB1 = await createUser(`admin-b1-${timestamp}@sgct.dev`, "admin_ala", stakeBId, wardB1Id, "Admin Ala B1");
    adminB1Id = aB1.id;
    clientAdminB1 = aB1.client;

    const sAdmin = await createUser(`super-admin-${timestamp}@sgct.dev`, "super_admin", null, null, "Super Admin");
    superAdminId = sAdmin.id;
    clientSuperAdmin = sAdmin.client;

    // 4. Criar Caravana e Reserva em A1
    const { data: caravanA, error: caravanErr } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2026-11-01",
        return_date: "2026-11-02",
        price_standard: 130,
        price_officiant: 117,
        seat_limit: 50,
        waitlist_limit: 5,
        registration_deadline: "2026-10-25",
        min_quorum: 48,
        quorum_check_date: "2026-10-27",
        status: "open",
        created_by: adminEstacaAId,
      })
      .select("id")
      .single();
    if (caravanErr) throw caravanErr;
    caravanAId = caravanA!.id;

    const { data: resA1 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        caravan_id: caravanAId,
        user_id: memberA1Id,
        seat_number: 10,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        status: "confirmado",
        payment_amount: 130,
      })
      .select("id")
      .single();
    reservationA1Id = resA1!.id;

    // 5. Inserir registro em credit_ledger e seat_swap_requests para memberA1
    const { data: creditEntry } = await svc
      .from("credit_ledger")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        user_id: memberA1Id,
        amount: 130,
        source: "waitlist_promotion",
        origin_reservation_id: reservationA1Id,
        expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        status: "active",
      })
      .select("id")
      .single();
    creditEntryA1Id = creditEntry!.id;

    const { data: swapEntry } = await svc
      .from("seat_swap_requests")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        original_reservation_id: reservationA1Id,
        new_holder_full_name: "Novo Passageiro RLS",
        requested_by: memberA1Id,
        status: "pending",
      })
      .select("id")
      .single();
    swapRequestA1Id = swapEntry!.id;
  });

  afterAll(async () => {
    // Limpeza
    if (swapRequestA1Id) await svc.from("seat_swap_requests").delete().eq("id", swapRequestA1Id);
    if (creditEntryA1Id) await svc.from("credit_ledger").delete().eq("id", creditEntryA1Id);
    if (reservationA1Id) await svc.from("reservations").delete().eq("id", reservationA1Id);
    if (caravanAId) await svc.from("caravans").delete().eq("id", caravanAId);

    const userIds = [memberA1Id, memberA2Id, adminA1Id, adminA2Id, adminEstacaAId, adminB1Id, superAdminId].filter(Boolean);
    for (const uid of userIds) {
      await svc.from("profiles").delete().eq("id", uid);
      await svc.auth.admin.deleteUser(uid);
    }
    if (wardA1Id) await svc.from("wards").delete().eq("id", wardA1Id);
    if (wardA2Id) await svc.from("wards").delete().eq("id", wardA2Id);
    if (wardB1Id) await svc.from("wards").delete().eq("id", wardB1Id);
    if (stakeAId) await svc.from("stakes").delete().eq("id", stakeAId);
    if (stakeBId) await svc.from("stakes").delete().eq("id", stakeBId);
  });

  describe("credit_ledger — Isolamento Multi-Tenant", () => {
    it("membro titular (A1) enxerga seu próprio crédito", async () => {
      const { data } = await clientMemberA1
        .from("credit_ledger")
        .select("id, amount, status")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(creditEntryA1Id);
    });

    it("outro membro (A2) NÃO enxerga o crédito de A1", async () => {
      const { data } = await clientMemberA2
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Ala A1 enxerga crédito de membro da sua Ala", async () => {
      const { data } = await clientAdminA1
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(1);
    });

    it("Admin Ala A2 (mesma Estaca, outra Ala) NÃO enxerga crédito de A1 (cross-Ala)", async () => {
      const { data } = await clientAdminA2
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Ala B1 (outra Estaca) NÃO enxerga crédito de A1 (cross-Estaca)", async () => {
      const { data } = await clientAdminB1
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Estaca A enxerga crédito de qualquer Ala da sua Estaca", async () => {
      const { data } = await clientAdminEstacaA
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(1);
    });

    it("super_admin NÃO tem acesso de leitura a credit_ledger (Artigo II.f)", async () => {
      const { data } = await clientSuperAdmin
        .from("credit_ledger")
        .select("id")
        .eq("id", creditEntryA1Id);

      expect(data).toHaveLength(0);
    });
  });

  describe("seat_swap_requests — Isolamento Multi-Tenant", () => {
    it("membro solicitante (A1) enxerga sua própria solicitação de permuta", async () => {
      const { data } = await clientMemberA1
        .from("seat_swap_requests")
        .select("id, status")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(swapRequestA1Id);
    });

    it("outro membro (A2) NÃO enxerga a solicitação de A1", async () => {
      const { data } = await clientMemberA2
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Ala A1 enxerga solicitação de permuta de membro da sua Ala", async () => {
      const { data } = await clientAdminA1
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(1);
    });

    it("Admin Ala A2 (mesma Estaca, outra Ala) NÃO enxerga permuta de A1 (cross-Ala)", async () => {
      const { data } = await clientAdminA2
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Ala B1 (outra Estaca) NÃO enxerga permuta de A1 (cross-Estaca)", async () => {
      const { data } = await clientAdminB1
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(0);
    });

    it("Admin Estaca A enxerga permutas de qualquer Ala da sua Estaca", async () => {
      const { data } = await clientAdminEstacaA
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(1);
    });

    it("super_admin NÃO tem acesso de leitura a seat_swap_requests (Artigo II.f)", async () => {
      const { data } = await clientSuperAdmin
        .from("seat_swap_requests")
        .select("id")
        .eq("id", swapRequestA1Id);

      expect(data).toHaveLength(0);
    });
  });
});
