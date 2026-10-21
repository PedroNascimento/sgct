/**
 * Testes RLS para Relatórios Financeiros (T009.4 / Spec 009 / Artigo II).
 *
 * Garante que:
 * 1. Admin Ala enxerga dados financeiros EXCLUSIVAMENTE de sua própria Ala e Estaca.
 * 2. Admin Ala NÃO enxerga dados de outra Ala na view v_ward_financial_summary.
 * 3. Admin Estaca enxerga dados de todas as Alas de sua própria Estaca, mas NUNCA de outra Estaca (cross-stake).
 * 4. Membro comum recebe conjunto vazio ao tentar ler v_ward_financial_summary.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("RLS — Isolamento de Relatórios Financeiros (T009.4 / Spec 009)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;
  let wardBId: string;

  let memberA1UserId: string;
  let memberA2UserId: string;
  let adminAlaA1UserId: string;
  let adminEstacaAUserId: string;
  let adminEstacaBUserId: string;

  let clientMemberA1: SupabaseClient;
  let clientMemberA2: SupabaseClient;
  let clientAdminAlaA1: SupabaseClient;
  let clientAdminEstacaA: SupabaseClient;
  let clientAdminEstacaB: SupabaseClient;

  let caravanAId: string;
  let caravanBId: string;

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Criar Estacas A e B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: `Estaca A Relatorios ${ts}`,
        slug: `stake-a-rep-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: `Estaca B Relatorios ${ts}`,
        slug: `stake-b-rep-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Alas
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A1 Rep ${ts}` })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A2 Rep ${ts}` })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    const { data: wardB } = await svc
      .from("wards")
      .insert({ stake_id: stakeBId, name: `Ala B Rep ${ts}` })
      .select("id")
      .single();
    wardBId = wardB!.id;

    // 3. Criar Usuários
    const pw = "SenhaForte@123!";

    const createTestUser = async (email: string, role: string, wardId: string | null, stakeId: string) => {
      const { data: authUser, error: authErr } = await svc.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
        app_metadata: { role, stake_id: stakeId, ...(wardId ? { ward_id: wardId } : {}) },
      });
      if (authErr) throw authErr;

      await svc.from("profiles").insert({
        id: authUser.user.id,
        stake_id: stakeId,
        ward_id: wardId,
        full_name: `Usuario ${email}`,
        birth_date: "1990-01-01",
        role,
        is_active: true,
      });

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await client.auth.signInWithPassword({ email, password: pw });
      return { id: authUser.user.id, client };
    };

    const memberA1 = await createTestUser(`member.a1.${ts}@rep.test`, "member", wardA1Id, stakeAId);
    memberA1UserId = memberA1.id;
    clientMemberA1 = memberA1.client;

    const memberA2 = await createTestUser(`member.a2.${ts}@rep.test`, "member", wardA2Id, stakeAId);
    memberA2UserId = memberA2.id;
    clientMemberA2 = memberA2.client;

    const adminAlaA1 = await createTestUser(`admin.ala.a1.${ts}@rep.test`, "admin_ala", wardA1Id, stakeAId);
    adminAlaA1UserId = adminAlaA1.id;
    clientAdminAlaA1 = adminAlaA1.client;

    const adminEstacaA = await createTestUser(`admin.estaca.a.${ts}@rep.test`, "admin_estaca", null, stakeAId);
    adminEstacaAUserId = adminEstacaA.id;
    clientAdminEstacaA = adminEstacaA.client;

    const adminEstacaB = await createTestUser(`admin.estaca.b.${ts}@rep.test`, "admin_estaca", null, stakeBId);
    adminEstacaBUserId = adminEstacaB.id;
    clientAdminEstacaB = adminEstacaB.client;

    // 4. Criar Caravanas
    const { data: cA } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2026-11-20",
        return_date: "2026-11-22",
        price_standard: 130.0,
        price_officiant: 117.0,
        seat_limit: 50,
        registration_deadline: "2026-11-15",
        min_quorum: 48,
        quorum_check_date: "2026-11-10",
        created_by: adminEstacaAUserId,
      })
      .select("id")
      .single();
    caravanAId = cA!.id;

    const { data: cB } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeBId,
        departure_date: "2026-11-20",
        return_date: "2026-11-22",
        price_standard: 130.0,
        price_officiant: 117.0,
        seat_limit: 50,
        registration_deadline: "2026-11-15",
        min_quorum: 48,
        quorum_check_date: "2026-11-10",
        created_by: adminEstacaBUserId,
      })
      .select("id")
      .single();
    caravanBId = cB!.id;

    // 5. Inserir reservas nas Alas A1, A2 e B
    await svc.from("reservations").insert([
      {
        stake_id: stakeAId,
        ward_id: wardA1Id,
        caravan_id: caravanAId,
        user_id: memberA1UserId,
        seat_number: 1,
        status: "confirmado",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
      },
      {
        stake_id: stakeAId,
        ward_id: wardA2Id,
        caravan_id: caravanAId,
        user_id: memberA2UserId,
        seat_number: 2,
        status: "confirmado",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
      },
      {
        stake_id: stakeBId,
        ward_id: wardBId,
        caravan_id: caravanBId,
        user_id: adminEstacaBUserId,
        seat_number: 1,
        status: "confirmado",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
      },
    ]);
  });

  afterAll(async () => {
    if (stakeAId && stakeBId) {
      await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
    }
    for (const uid of [memberA1UserId, memberA2UserId, adminAlaA1UserId, adminEstacaAUserId, adminEstacaBUserId]) {
      if (uid) {
        await svc.auth.admin.deleteUser(uid);
      }
    }
  });

  it("Admin Ala A1 consegue ler dados da sua própria Ala A1", async () => {
    const { data } = await clientAdminAlaA1
      .from("v_ward_financial_summary")
      .select("*")
      .eq("ward_id", wardA1Id);

    expect(data ?? []).toHaveLength(1);
    expect(data![0].ward_id).toBe(wardA1Id);
    expect(Number(data![0].confirmados)).toBe(1);
  });

  it("Admin Ala A1 NÃO consegue ler dados da Ala A2 (mesma Estaca)", async () => {
    const { data } = await clientAdminAlaA1
      .from("v_ward_financial_summary")
      .select("*")
      .eq("ward_id", wardA2Id);

    expect(data ?? []).toHaveLength(0);
  });

  it("Admin Ala A1 NÃO consegue ler dados da Ala B (outra Estaca)", async () => {
    const { data } = await clientAdminAlaA1
      .from("v_ward_financial_summary")
      .select("*")
      .eq("ward_id", wardBId);

    expect(data ?? []).toHaveLength(0);
  });

  it("Admin Estaca A consegue ler dados consolidados de todas as Alas da Estaca A", async () => {
    const { data } = await clientAdminEstacaA
      .from("v_ward_financial_summary")
      .select("*")
      .eq("stake_id", stakeAId);

    expect(data ?? []).toHaveLength(2); // Ala A1 e Ala A2
  });

  it("Admin Estaca A NÃO consegue ler dados da Estaca B (cross-stake)", async () => {
    const { data } = await clientAdminEstacaA
      .from("v_ward_financial_summary")
      .select("*")
      .eq("stake_id", stakeBId);

    expect(data ?? []).toHaveLength(0);
  });

  it("Membro comum NÃO consegue ler dados agregados em v_ward_financial_summary", async () => {
    const { data } = await clientMemberA1
      .from("v_ward_financial_summary")
      .select("*");

    expect(data ?? []).toHaveLength(0);
  });
});
