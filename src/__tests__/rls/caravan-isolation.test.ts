/**
 * Testes RLS para Caravanas (T002.3)
 *
 * Artigo II da Constituição e T002.3:
 * admin_estaca da Estaca A tentando editar/cancelar caravana da Estaca B
 * deve ser bloqueado pela policy caravans_write_admin_estaca.
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

describe("RLS — Isolamento de Caravanas entre Estacas (T002.3)", () => {
  const svc = serviceClient();
  const anon = anonClient();

  let stakeAId: string;
  let stakeBId: string;
  let adminAUserId: string;
  let caravanBId: string;

  const ADMIN_A_EMAIL = `admin.a.${Date.now()}@teste.org`;
  const ADMIN_A_PASSWORD = "senha-admin-estaca-a-123";

  beforeAll(async () => {
    // 1. Criar Estaca A e Estaca B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: "Estaca A Caravanas",
        slug: `caravan-stake-a-${Date.now()}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: "Estaca B Caravanas",
        slug: `caravan-stake-b-${Date.now()}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Admin da Estaca A
    const { data: authUser } = await svc.auth.admin.createUser({
      email: ADMIN_A_EMAIL,
      password: ADMIN_A_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Admin Estaca A" },
    });
    adminAUserId = authUser.user!.id;

    await svc.from("profiles").insert({
      id: adminAUserId,
      stake_id: stakeAId,
      full_name: "Admin Estaca A",
      birth_date: "1980-01-01",
      role: "admin_estaca",
      is_active: true,
    });

    // 3. Criar Caravana pertencente à Estaca B
    const { data: caravanB } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeBId,
        departure_date: "2026-11-20",
        return_date: "2026-11-23",
        price_standard: 130,
        price_officiant: 117,
        seat_limit: 50,
        waitlist_limit: 5,
        registration_deadline: "2026-11-15",
        min_quorum: 48,
        quorum_check_date: "2026-11-17",
        status: "open",
        created_by: adminAUserId,
      })
      .select("id")
      .single();
    caravanBId = caravanB!.id;
  });

  afterAll(async () => {
    if (caravanBId) {
      await svc.from("caravans").delete().eq("id", caravanBId);
    }
    if (adminAUserId) {
      await svc.from("profiles").delete().eq("id", adminAUserId);
      await svc.auth.admin.deleteUser(adminAUserId);
    }
    if (stakeAId) {
      await svc.from("stakes").delete().eq("id", stakeAId);
    }
    if (stakeBId) {
      await svc.from("stakes").delete().eq("id", stakeBId);
    }
  });

  it("bloqueia admin_estaca da Estaca A de fazer update na caravana da Estaca B (T002.3)", async () => {
    // 1. Autenticar como Admin da Estaca A
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: ADMIN_A_EMAIL,
      password: ADMIN_A_PASSWORD,
    });
    expect(signInError).toBeNull();
    expect(signInData.session).toBeDefined();

    // 2. Cliente com o token do Admin A
    const adminAClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session!.access_token}`,
        },
      },
    });

    // 3. Tentar alterar o status da caravana da Estaca B para 'cancelled'
    const { data: updateData, error: updateError } = await adminAClient
      .from("caravans")
      .update({ status: "cancelled" })
      .eq("id", caravanBId)
      .select();

    // Com RLS caravans_write_admin_estaca, a atualização deve falhar ou afetar 0 linhas
    expect(updateData === null || updateData.length === 0 || updateError !== null).toBe(
      true
    );

    // 4. Conferir no banco que o status continua estritamente 'open'
    const { data: caravanAfter } = await svc
      .from("caravans")
      .select("status")
      .eq("id", caravanBId)
      .single();

    expect(caravanAfter?.status).toBe("open");
  });
});
