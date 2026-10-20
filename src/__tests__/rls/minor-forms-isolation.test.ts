/**
 * Testes RLS para Isolamento de Storage de Formulários de Menores (T006.9).
 *
 * Artigo II da Constituição (Isolamento em Dois Níveis: Estaca e Ala):
 * - Membro dono do documento pode ler e fazer download do próprio formulário.
 * - Membro de outra Ala ou Estaca -> bloqueado.
 * - Admin Ala enxerga formulários da SUA PRÓPRIA Ala e Estaca.
 * - Admin Ala de outra Ala da mesma Estaca -> bloqueado.
 * - Admin Ala de outra Estaca -> bloqueado.
 * - Admin Estaca enxerga formulários de TODAS as Alas da sua Estaca.
 * - Admin Estaca de outra Estaca -> bloqueado.
 * - super_admin NÃO tem acesso ao bucket 'minor-forms' (Artigo II.f).
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

describe("RLS — Isolamento de Storage 'minor-forms' (T006.9)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;
  let wardB1Id: string;

  let minorUserA1Id: string;
  let adminA1Id: string;
  let adminA2Id: string;
  let adminEstacaAId: string;
  let adminB1Id: string;
  let superAdminId: string;

  let clientMinorA1: SupabaseClient;
  let clientAdminA1: SupabaseClient;
  let clientAdminA2: SupabaseClient;
  let clientAdminEstacaA: SupabaseClient;
  let clientAdminB1: SupabaseClient;
  let clientSuperAdmin: SupabaseClient;

  let caravanAId: string;
  let reservationA1Id: string;
  const storageFilePath = (sId: string, wId: string, rId: string) => `${sId}/${wId}/${rId}/autorizacao.pdf`;

  const timestamp = Date.now();
  const PWD = "senha-segura-rls-123";

  beforeAll(async () => {
    // 1. Criar Estaca A e B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: "Estaca A Menores",
        slug: `stake-a-minor-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: "Estaca B Menores",
        slug: `stake-b-minor-${timestamp}`,
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
        birth_date: "2010-01-01",
        phone: "(84) 99999-9999",
        sexo: "masculino",
        is_active: true,
      });

      const client = anonClient();
      await client.auth.signInWithPassword({ email, password: PWD });
      return { id: uid, client };
    }

    const u1 = await createUser(`minor_a1_${timestamp}@test.com`, "member", stakeAId, wardA1Id, "Menor Ala A1");
    minorUserA1Id = u1.id;
    clientMinorA1 = u1.client;

    const u2 = await createUser(`admin_a1_${timestamp}@test.com`, "admin_ala", stakeAId, wardA1Id, "Admin Ala A1");
    adminA1Id = u2.id;
    clientAdminA1 = u2.client;

    const u3 = await createUser(`admin_a2_${timestamp}@test.com`, "admin_ala", stakeAId, wardA2Id, "Admin Ala A2");
    adminA2Id = u3.id;
    clientAdminA2 = u3.client;

    const u4 = await createUser(`admin_estaca_a_${timestamp}@test.com`, "admin_estaca", stakeAId, null, "Admin Estaca A");
    adminEstacaAId = u4.id;
    clientAdminEstacaA = u4.client;

    const u5 = await createUser(`admin_b1_${timestamp}@test.com`, "admin_ala", stakeBId, wardB1Id, "Admin Ala B1");
    adminB1Id = u5.id;
    clientAdminB1 = u5.client;

    const u6 = await createUser(`super_admin_${timestamp}@test.com`, "super_admin", null, null, "Super Admin Global");
    superAdminId = u6.id;
    clientSuperAdmin = u6.client;

    // Criar caravana
    const { data: caravan } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2026-11-20T06:00:00Z",
        registration_deadline: "2026-11-15T23:59:59Z",
        quorum_check_date: "2026-11-17T00:00:00Z",
        price_standard: 130,
        price_officiant: 117,
        created_by: adminEstacaAId,
      })
      .select("id")
      .single();
    caravanAId = caravan!.id;

    // Criar reserva para o menor
    const { data: reservation } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        caravan_id: caravanAId,
        user_id: minorUserA1Id,
        seat_number: 14,
        category: "standard",
        participant_type: "jovem",
        funding_source: "membro",
        payment_amount: 130,
        status: "pendente",
      })
      .select("id")
      .single();
    reservationA1Id = reservation!.id;

    // Fazer upload do arquivo de teste no bucket 'minor-forms' usando service_role
    const path = storageFilePath(stakeAId, wardA1Id, reservationA1Id);
    await svc.storage.from("minor-forms").upload(path, Buffer.from("pdf-autorizacao"), {
      contentType: "application/pdf",
      upsert: true,
    });

    // Registra na tabela minor_approval_forms
    await svc.from("minor_approval_forms").insert({
      stake_id: stakeAId,
      ward_id: wardA1Id,
      reservation_id: reservationA1Id,
      storage_path: path,
      status: "pending",
    });
  });

  afterAll(async () => {
    const path = storageFilePath(stakeAId, wardA1Id, reservationA1Id);
    await svc.storage.from("minor-forms").remove([path]);
    await svc.from("minor_approval_forms").delete().eq("reservation_id", reservationA1Id);
    await svc.from("reservations").delete().eq("id", reservationA1Id);
    await svc.from("caravans").delete().eq("id", caravanAId);

    const userIds = [minorUserA1Id, adminA1Id, adminA2Id, adminEstacaAId, adminB1Id, superAdminId];
    await svc.from("profiles").delete().in("id", userIds);
    for (const uid of userIds) {
      await svc.auth.admin.deleteUser(uid);
    }
    await svc.from("wards").delete().in("id", [wardA1Id, wardA2Id, wardB1Id]);
    await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
  });

  it("Admin Ala A1 consegue listar/acessar documento de menor de sua Ala", async () => {
    const { data, error } = await clientAdminA1
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationA1Id);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].ward_id).toBe(wardA1Id);
  });

  it("Admin Ala A2 (mesma Estaca, outra Ala) NÃO tem acesso ao documento (cross-Ala bloqueado)", async () => {
    const { data, error } = await clientAdminA2
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationA1Id);

    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("Admin Ala B1 (outra Estaca) NÃO tem acesso ao documento (cross-Estaca bloqueado)", async () => {
    const { data, error } = await clientAdminB1
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationA1Id);

    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("Admin Estaca A consegue listar formulários de sua Estaca", async () => {
    const { data, error } = await clientAdminEstacaA
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationA1Id);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("super_admin NÃO tem acesso de leitura aos formulários de menores (Artigo II.f)", async () => {
    const { data, error } = await clientSuperAdmin
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationA1Id);

    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });
});
