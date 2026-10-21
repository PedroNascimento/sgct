/**
 * Testes RLS para Check-in de Embarque (T007.10 / Spec 007 / Artigo II).
 *
 * Garante que:
 * 1. Admin Ala da Ala A NÃO consegue ler nem inserir check-in de passageiro da Ala B.
 * 2. Admin Estaca da Estaca A NÃO consegue ler nem inserir check-in de passageiro da Estaca B.
 * 3. Membro consegue ler apenas o seu próprio check-in.
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

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("RLS — Isolamento de Check-ins (T007.10)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();
  const anon = anonClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;
  let wardBId: string;

  let memberA1UserId: string;
  let memberA2UserId: string;
  let adminAlaA1UserId: string;
  let adminEstacaBUserId: string;

  let caravanAId: string;
  let caravanBId: string;

  let resA1Id: string;
  let resA2Id: string;
  let resBId: string;

  let clientAdminAlaA1: SupabaseClient;
  let clientAdminEstacaB: SupabaseClient;
  let clientMemberA1: SupabaseClient;

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Criar Estaca A e Estaca B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: `Estaca A Checkin ${ts}`,
        slug: `stake-a-chk-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: `Estaca B Checkin ${ts}`,
        slug: `stake-b-chk-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Alas
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A1 ${ts}` })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A2 ${ts}` })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    const { data: wardB } = await svc
      .from("wards")
      .insert({ stake_id: stakeBId, name: `Ala B1 ${ts}` })
      .select("id")
      .single();
    wardBId = wardB!.id;

    // 3. Criar Usuários
    // 3.1 Admin Ala A1
    const emailAdminA1 = `admin.ala.a1.${ts}@teste.org`;
    const { data: authAdminA1 } = await svc.auth.admin.createUser({
      email: emailAdminA1,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: "Admin Ala A1" },
      app_metadata: { role: "admin_ala", stake_id: stakeAId, ward_id: wardA1Id },
    });
    adminAlaA1UserId = authAdminA1.user!.id;
    await svc.from("profiles").insert({
      id: adminAlaA1UserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      full_name: "Admin Ala A1",
      role: "admin_ala",
      birth_date: "1985-01-01",
    });

    // 3.2 Admin Estaca B
    const emailAdminEstacaB = `admin.estaca.b.${ts}@teste.org`;
    const { data: authAdminEstacaB } = await svc.auth.admin.createUser({
      email: emailAdminEstacaB,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: "Admin Estaca B" },
      app_metadata: { role: "admin_estaca", stake_id: stakeBId },
    });
    adminEstacaBUserId = authAdminEstacaB.user!.id;
    await svc.from("profiles").insert({
      id: adminEstacaBUserId,
      stake_id: stakeBId,
      full_name: "Admin Estaca B",
      role: "admin_estaca",
      birth_date: "1980-01-01",
    });

    // 3.3 Membro A1
    const emailMemberA1 = `member.a1.${ts}@teste.org`;
    const { data: authMemberA1 } = await svc.auth.admin.createUser({
      email: emailMemberA1,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: "Membro A1" },
      app_metadata: { role: "member", stake_id: stakeAId, ward_id: wardA1Id },
    });
    memberA1UserId = authMemberA1.user!.id;
    await svc.from("profiles").insert({
      id: memberA1UserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      full_name: "Membro A1",
      role: "member",
      birth_date: "1990-05-10",
    });

    // 3.4 Membro A2
    const emailMemberA2 = `member.a2.${ts}@teste.org`;
    const { data: authMemberA2 } = await svc.auth.admin.createUser({
      email: emailMemberA2,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: "Membro A2" },
      app_metadata: { role: "member", stake_id: stakeAId, ward_id: wardA2Id },
    });
    memberA2UserId = authMemberA2.user!.id;
    await svc.from("profiles").insert({
      id: memberA2UserId,
      stake_id: stakeAId,
      ward_id: wardA2Id,
      full_name: "Membro A2",
      role: "member",
      birth_date: "1992-06-15",
    });

    // 4. Criar Caravanas
    const { data: caravanA, error: errCaravanA } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2027-01-15",
        return_date: "2027-01-18",
        price_standard: 100,
        price_officiant: 80,
        registration_deadline: "2027-01-01",
        quorum_check_date: "2027-01-05",
        created_by: adminAlaA1UserId,
      })
      .select("id")
      .single();
    if (errCaravanA) console.error("errCaravanA:", errCaravanA);
    caravanAId = caravanA!.id;

    const { data: caravanB, error: errCaravanB } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeBId,
        departure_date: "2027-01-15",
        return_date: "2027-01-18",
        price_standard: 100,
        price_officiant: 80,
        registration_deadline: "2027-01-01",
        quorum_check_date: "2027-01-05",
        created_by: adminEstacaBUserId,
      })
      .select("id")
      .single();
    if (errCaravanB) console.error("errCaravanB:", errCaravanB);
    caravanBId = caravanB!.id;

    // 5. Criar Reservas Confirmadas
    const { data: resA1 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        user_id: memberA1UserId,
        caravan_id: caravanAId,
        seat_number: 1,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        status: "confirmado",
        payment_amount: 100,
      })
      .select("id")
      .single();
    resA1Id = resA1!.id;

    const { data: resA2 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA2Id,
        user_id: memberA2UserId,
        caravan_id: caravanAId,
        seat_number: 2,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        status: "confirmado",
        payment_amount: 100,
      })
      .select("id")
      .single();
    resA2Id = resA2!.id;

    const { data: resB } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeBId,
        ward_id: wardBId,
        user_id: adminEstacaBUserId,
        caravan_id: caravanBId,
        seat_number: 1,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        status: "confirmado",
        payment_amount: 100,
      })
      .select("id")
      .single();
    resBId = resB!.id;

    // 6. Criar check-in existente para resA1 e resA2 via service
    await svc.from("checkins").insert([
      {
        stake_id: stakeAId,
        ward_id: wardA1Id,
        reservation_id: resA1Id,
        direction: "ida",
        checked_in_by: adminAlaA1UserId,
      },
      {
        stake_id: stakeAId,
        ward_id: wardA2Id,
        reservation_id: resA2Id,
        direction: "ida",
        checked_in_by: adminAlaA1UserId,
      },
    ]);

    // 7. Instanciar Clients Autenticados
    clientAdminAlaA1 = anonClient();
    await clientAdminAlaA1.auth.signInWithPassword({
      email: emailAdminA1,
      password: "Password123!",
    });

    clientAdminEstacaB = anonClient();
    await clientAdminEstacaB.auth.signInWithPassword({
      email: emailAdminEstacaB,
      password: "Password123!",
    });

    clientMemberA1 = anonClient();
    await clientMemberA1.auth.signInWithPassword({
      email: emailMemberA1,
      password: "Password123!",
    });
  });

  afterAll(async () => {
    await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
    await svc.auth.admin.deleteUser(adminAlaA1UserId);
    await svc.auth.admin.deleteUser(adminEstacaBUserId);
    await svc.auth.admin.deleteUser(memberA1UserId);
    await svc.auth.admin.deleteUser(memberA2UserId);
  });

  it("Admin Ala A1 deve conseguir ler check-ins de sua própria Ala (A1)", async () => {
    const { data, error } = await clientAdminAlaA1
      .from("checkins")
      .select("*")
      .eq("reservation_id", resA1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].reservation_id).toBe(resA1Id);
  });

  it("Admin Ala A1 NÃO deve conseguir ler check-ins de outra Ala (A2)", async () => {
    const { data, error } = await clientAdminAlaA1
      .from("checkins")
      .select("*")
      .eq("reservation_id", resA2Id);

    expect(error).toBeNull();
    // Bloqueado pelo RLS (retorna array vazio)
    expect(data).toHaveLength(0);
  });

  it("Admin Ala A1 NÃO deve conseguir inserir check-in para reserva da Ala A2", async () => {
    const { data, error } = await clientAdminAlaA1
      .from("checkins")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA2Id,
        reservation_id: resA2Id,
        direction: "volta",
        checked_in_by: adminAlaA1UserId,
      })
      .select();

    expect(error).not.toBeNull();
  });

  it("Admin Estaca B NÃO deve conseguir ler check-ins da Estaca A", async () => {
    const { data, error } = await clientAdminEstacaB
      .from("checkins")
      .select("*")
      .eq("stake_id", stakeAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("Admin Estaca B NÃO deve conseguir inserir check-in na Estaca A", async () => {
    const { data, error } = await clientAdminEstacaB
      .from("checkins")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        reservation_id: resA1Id,
        direction: "volta",
        checked_in_by: adminEstacaBUserId,
      })
      .select();

    expect(error).not.toBeNull();
  });

  it("Membro titular deve ler seu próprio check-in", async () => {
    const { data, error } = await clientMemberA1
      .from("checkins")
      .select("*")
      .eq("reservation_id", resA1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].reservation_id).toBe(resA1Id);
  });

  it("Membro NÃO deve ler check-in de outro membro", async () => {
    const { data, error } = await clientMemberA1
      .from("checkins")
      .select("*")
      .eq("reservation_id", resA2Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
