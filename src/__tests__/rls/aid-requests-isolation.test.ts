/**
 * Testes RLS para Isolamento de Pedidos de Auxílio Financeiro (aid_requests) (T012.8 / Spec 012).
 *
 * Artigo II da Constituição (Isolamento em Dois Níveis: Estaca e Ala):
 * - Membro dono da reserva pode ler seu próprio pedido de auxílio.
 * - Membro NÃO tem permissão de escrita/aprovação (write restrito a admin).
 * - Admin Ala enxerga e gerencia auxílios da SUA PRÓPRIA Ala e Estaca.
 * - Admin Ala de outra Ala da mesma Estaca -> bloqueado.
 * - Admin Ala de outra Estaca -> bloqueado.
 * - Admin Estaca enxerga e gerencia auxílios de TODAS as Alas da sua Estaca.
 * - Admin Estaca de outra Estaca -> bloqueado.
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

describe("RLS — Isolamento de Pedidos de Auxílio Financeiro (T012.8 / Spec 012)", () => {
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
  let adminAlaA2UserId: string;
  let adminEstacaAUserId: string;
  let adminEstacaBUserId: string;

  let clientMemberA1: SupabaseClient;
  let clientAdminAlaA1: SupabaseClient;
  let clientAdminAlaA2: SupabaseClient;
  let clientAdminEstacaA: SupabaseClient;
  let clientAdminEstacaB: SupabaseClient;

  let caravanAId: string;
  let caravanBId: string;
  let reservationA1Id: string;
  let reservationA2Id: string;
  let reservationBId: string;

  let aidA1Id: string;
  let aidA2Id: string;
  let aidBId: string;

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Criar Estacas A e B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: `Estaca A Auxilio ${ts}`,
        slug: `stake-a-aid-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: `Estaca B Auxilio ${ts}`,
        slug: `stake-b-aid-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Alas
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A1 Aid ${ts}` })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A2 Aid ${ts}` })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    const { data: wardB } = await svc
      .from("wards")
      .insert({ stake_id: stakeBId, name: `Ala B Aid ${ts}` })
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

    const memberA1 = await createTestUser(`member.a1.${ts}@aid.test`, "member", wardA1Id, stakeAId);
    memberA1UserId = memberA1.id;
    clientMemberA1 = memberA1.client;

    const memberA2 = await createTestUser(`member.a2.${ts}@aid.test`, "member", wardA2Id, stakeAId);
    memberA2UserId = memberA2.id;

    const adminAlaA1 = await createTestUser(`admin.ala.a1.${ts}@aid.test`, "admin_ala", wardA1Id, stakeAId);
    adminAlaA1UserId = adminAlaA1.id;
    clientAdminAlaA1 = adminAlaA1.client;

    const adminAlaA2 = await createTestUser(`admin.ala.a2.${ts}@aid.test`, "admin_ala", wardA2Id, stakeAId);
    adminAlaA2UserId = adminAlaA2.id;
    clientAdminAlaA2 = adminAlaA2.client;

    const adminEstacaA = await createTestUser(`admin.estaca.a.${ts}@aid.test`, "admin_estaca", null, stakeAId);
    adminEstacaAUserId = adminEstacaA.id;
    clientAdminEstacaA = adminEstacaA.client;

    const adminEstacaB = await createTestUser(`admin.estaca.b.${ts}@aid.test`, "admin_estaca", null, stakeBId);
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

    // 5. Inserir reservas com auxílio financeiro
    const { data: rA1 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        caravan_id: caravanAId,
        user_id: memberA1UserId,
        seat_number: 1,
        status: "aguardando_auxilio",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "auxilio_area_investidura",
      })
      .select("id")
      .single();
    reservationA1Id = rA1!.id;

    const { data: rA2 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA2Id,
        caravan_id: caravanAId,
        user_id: memberA2UserId,
        seat_number: 2,
        status: "aguardando_auxilio",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "auxilio_recem_converso",
      })
      .select("id")
      .single();
    reservationA2Id = rA2!.id;

    const { data: rB } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeBId,
        ward_id: wardBId,
        caravan_id: caravanBId,
        user_id: adminEstacaBUserId,
        seat_number: 1,
        status: "aguardando_auxilio",
        payment_amount: 130.0,
        category: "standard",
        participant_type: "adulto",
        funding_source: "auxilio_estaca_fundo_reserva",
      })
      .select("id")
      .single();
    reservationBId = rB!.id;

    // 6. Inserir aid_requests correspondentes via service_role
    const { data: aA1 } = await svc
      .from("aid_requests")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        reservation_id: reservationA1Id,
        aid_type: "auxilio_area_investidura",
        status: "pending",
        requested_by: adminAlaA1UserId,
      })
      .select("id")
      .single();
    aidA1Id = aA1!.id;

    const { data: aA2 } = await svc
      .from("aid_requests")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA2Id,
        reservation_id: reservationA2Id,
        aid_type: "auxilio_recem_converso",
        status: "pending",
        requested_by: adminAlaA2UserId,
      })
      .select("id")
      .single();
    aidA2Id = aA2!.id;

    const { data: aB } = await svc
      .from("aid_requests")
      .insert({
        stake_id: stakeBId,
        ward_id: wardBId,
        reservation_id: reservationBId,
        aid_type: "auxilio_estaca_fundo_reserva",
        status: "pending",
        requested_by: adminEstacaBUserId,
      })
      .select("id")
      .single();
    aidBId = aB!.id;
  });

  afterAll(async () => {
    if (stakeAId && stakeBId) {
      await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
    }
    for (const uid of [
      memberA1UserId,
      memberA2UserId,
      adminAlaA1UserId,
      adminAlaA2UserId,
      adminEstacaAUserId,
      adminEstacaBUserId,
    ]) {
      if (uid) {
        await svc.auth.admin.deleteUser(uid);
      }
    }
  });

  it("Admin Ala A1 consegue ler o pedido de auxílio da sua própria Ala A1", async () => {
    const { data, error } = await clientAdminAlaA1
      .from("aid_requests")
      .select("*")
      .eq("id", aidA1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(aidA1Id);
  });

  it("Admin Ala A1 NÃO consegue ler pedido de auxílio da Ala A2 (mesma Estaca)", async () => {
    const { data } = await clientAdminAlaA1
      .from("aid_requests")
      .select("*")
      .eq("id", aidA2Id);

    expect(data).toHaveLength(0);
  });

  it("Admin Ala A1 NÃO consegue ler pedido de auxílio da Estaca B (cross-stake)", async () => {
    const { data } = await clientAdminAlaA1
      .from("aid_requests")
      .select("*")
      .eq("id", aidBId);

    expect(data).toHaveLength(0);
  });

  it("Admin Estaca A consegue ler pedidos de todas as Alas da Estaca A", async () => {
    const { data } = await clientAdminEstacaA
      .from("aid_requests")
      .select("*")
      .in("id", [aidA1Id, aidA2Id]);

    expect(data).toHaveLength(2);
  });

  it("Admin Estaca A NÃO consegue ler pedido de auxílio da Estaca B (cross-stake)", async () => {
    const { data } = await clientAdminEstacaA
      .from("aid_requests")
      .select("*")
      .eq("id", aidBId);

    expect(data).toHaveLength(0);
  });

  it("Membro titular consegue ler o seu próprio pedido de auxílio", async () => {
    const { data } = await clientMemberA1
      .from("aid_requests")
      .select("*")
      .eq("id", aidA1Id);

    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(aidA1Id);
  });

  it("Membro titular NÃO consegue aprovar seu próprio auxílio (write restrito a admin)", async () => {
    const { data } = await clientMemberA1
      .from("aid_requests")
      .update({ status: "approved" })
      .eq("id", aidA1Id)
      .select();

    expect(data ?? []).toHaveLength(0);

    // Confirma que no banco de dados o status permaneceu inalterado ('pending')
    const { data: current } = await svc
      .from("aid_requests")
      .select("status")
      .eq("id", aidA1Id)
      .single();

    expect(current?.status).toBe("pending");
  });
});
