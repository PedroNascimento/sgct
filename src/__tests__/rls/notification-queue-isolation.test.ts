/**
 * Testes RLS para Fila de Notificações (T008.1 / T008.9 / Spec 008 / Artigo II).
 *
 * Garante que:
 * 1. A tabela notification_queue é acessível EXCLUSIVAMENTE via service_role.
 * 2. Usuários anônimos, membros, admin_ala e até admin_estaca NÃO conseguem ler diretamente da tabela via RLS.
 * 3. A RPC get_notification_metrics só pode ser invocada pelo admin_estaca da própria Estaca.
 * 4. admin_estaca da Estaca B NÃO consegue ver métricas da Estaca A (cross-stake).
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

describe("RLS — Isolamento da Fila de Notificações (T008.9 / Spec 008)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();
  const anon = anonClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardAId: string;

  let memberAUserId: string;
  let adminAlaAUserId: string;
  let adminEstacaAUserId: string;
  let adminEstacaBUserId: string;

  let clientMemberA: SupabaseClient;
  let clientAdminAlaA: SupabaseClient;
  let clientAdminEstacaA: SupabaseClient;
  let clientAdminEstacaB: SupabaseClient;

  let notificationAId: string;

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Criar Estaca A e Estaca B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: `Estaca A Notif ${ts}`,
        slug: `stake-a-notif-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: `Estaca B Notif ${ts}`,
        slug: `stake-b-notif-${ts}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Ala na Estaca A
    const { data: wardA } = await svc
      .from("wards")
      .insert({
        stake_id: stakeAId,
        name: `Ala A1 Notif ${ts}`,
      })
      .select("id")
      .single();
    wardAId = wardA!.id;

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

    const memberA = await createTestUser(`member.a.${ts}@notif.test`, "member", wardAId, stakeAId);
    memberAUserId = memberA.id;
    clientMemberA = memberA.client;

    const adminAlaA = await createTestUser(`admin.ala.a.${ts}@notif.test`, "admin_ala", wardAId, stakeAId);
    adminAlaAUserId = adminAlaA.id;
    clientAdminAlaA = adminAlaA.client;

    const adminEstacaA = await createTestUser(`admin.estaca.a.${ts}@notif.test`, "admin_estaca", null, stakeAId);
    adminEstacaAUserId = adminEstacaA.id;
    clientAdminEstacaA = adminEstacaA.client;

    const adminEstacaB = await createTestUser(`admin.estaca.b.${ts}@notif.test`, "admin_estaca", null, stakeBId);
    adminEstacaBUserId = adminEstacaB.id;
    clientAdminEstacaB = adminEstacaB.client;

    // 4. Inserir notificação de teste via service_role na Estaca A
    const { data: notif } = await svc
      .from("notification_queue")
      .insert({
        stake_id: stakeAId,
        event_type: "RESERVATION_CONFIRMED_QR",
        recipient_id: memberAUserId,
        recipient_email: `member.a.${ts}@notif.test`,
        recipient_name: "Membro A",
        subject: "Confirmação",
        payload: { test: true },
        status: "sent",
        attempts: 1,
      })
      .select("id")
      .single();

    notificationAId = notif!.id;
  });

  afterAll(async () => {
    if (notificationAId) {
      await svc.from("notification_queue").delete().eq("id", notificationAId);
    }
    if (stakeAId && stakeBId) {
      await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
    }
    for (const uid of [memberAUserId, adminAlaAUserId, adminEstacaAUserId, adminEstacaBUserId]) {
      if (uid) {
        await svc.auth.admin.deleteUser(uid);
      }
    }
  });

  it("anon não consegue ler da notification_queue", async () => {
    const { data } = await anon
      .from("notification_queue")
      .select("*")
      .eq("id", notificationAId);

    expect(data ?? []).toHaveLength(0);
  });

  it("member autenticado não consegue ler da notification_queue", async () => {
    const { data } = await clientMemberA
      .from("notification_queue")
      .select("*")
      .eq("id", notificationAId);

    expect(data ?? []).toHaveLength(0);
  });

  it("admin_ala não consegue ler da notification_queue", async () => {
    const { data } = await clientAdminAlaA
      .from("notification_queue")
      .select("*")
      .eq("id", notificationAId);

    expect(data ?? []).toHaveLength(0);
  });

  it("admin_estaca não consegue ler diretamente da notification_queue via SELECT", async () => {
    const { data } = await clientAdminEstacaA
      .from("notification_queue")
      .select("*")
      .eq("id", notificationAId);

    expect(data ?? []).toHaveLength(0);
  });

  it("service_role consegue ler e escrever diretamente na notification_queue", async () => {
    const { data, error } = await svc
      .from("notification_queue")
      .select("*")
      .eq("id", notificationAId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(notificationAId);
    expect(data?.stake_id).toBe(stakeAId);
  });

  it("admin_estaca A consegue obter métricas da sua própria Estaca via RPC", async () => {
    const { data, error } = await clientAdminEstacaA.rpc("get_notification_metrics", {
      p_stake_id: stakeAId,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("admin_estaca B é BLOQUEADO ao tentar consultar métricas da Estaca A (cross-stake)", async () => {
    const { error } = await clientAdminEstacaB.rpc("get_notification_metrics", {
      p_stake_id: stakeAId,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Acesso negado");
  });

  it("admin_ala é BLOQUEADO ao tentar invocar get_notification_metrics", async () => {
    const { error } = await clientAdminAlaA.rpc("get_notification_metrics", {
      p_stake_id: stakeAId,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Acesso negado");
  });
});
