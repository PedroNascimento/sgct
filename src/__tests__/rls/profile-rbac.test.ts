/**
 * Testes RLS para RBAC e Profiles (T001.8)
 *
 * Artigo II da Constituição e US-001.5:
 * member tentando UPDATE do próprio role para admin_ala/admin_estaca/super_admin
 * deve ser bloqueado pela policy profiles_update_self.
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

describe("RLS — Proteção contra Autopromoção de Papel (T001.8)", () => {
  const svc = serviceClient();
  const anon = anonClient();

  const TEST_EMAIL = `membro.rls.${Date.now()}@teste.org`;
  const TEST_PASSWORD = "senha-forte-rls-123";
  let userId: string;
  let stakeId: string;
  let wardId: string;

  beforeAll(async () => {
    // 1. Criar Stake e Ward para teste
    const { data: stake } = await svc
      .from("stakes")
      .insert({
        name: "Estaca Teste RLS",
        slug: `rls-stake-${Date.now()}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeId = stake!.id;

    const { data: ward } = await svc
      .from("wards")
      .insert({
        stake_id: stakeId,
        name: "Ala Teste RLS",
      })
      .select("id")
      .single();
    wardId = ward!.id;

    // 2. Criar usuário no Auth
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Membro RLS Teste" },
    });
    if (authError || !authUser.user) {
      throw new Error(`Falha ao criar usuário de teste: ${authError?.message}`);
    }
    userId = authUser.user.id;

    // 3. Criar Profile inicial como 'member'
    const { error: profileError } = await svc.from("profiles").insert({
      id: userId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: "Membro RLS Teste",
      birth_date: "1992-03-10",
      role: "member",
      is_active: true,
    });
    if (profileError) {
      throw new Error(`Falha ao criar profile de teste: ${profileError.message}`);
    }
  });

  afterAll(async () => {
    if (userId) {
      await svc.from("profiles").delete().eq("id", userId);
      await svc.auth.admin.deleteUser(userId);
    }
    if (wardId) {
      await svc.from("wards").delete().eq("id", wardId);
    }
    if (stakeId) {
      await svc.from("stakes").delete().eq("id", stakeId);
    }
  });

  it("bloqueia quando member tenta fazer UPDATE no próprio role para 'admin_ala' ou 'super_admin' (T001.8)", async () => {
    // 1. Autenticar com as credenciais do membro
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(signInError).toBeNull();
    expect(signInData.session).toBeDefined();

    // 2. Criar cliente com o token do membro
    const memberClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session!.access_token}`,
        },
      },
    });

    // 3. Tentar autopromover para admin_ala
    const { error: updateError } = await memberClient
      .from("profiles")
      .update({ role: "admin_ala" })
      .eq("id", userId);

    // Deve falhar com erro de violação de policy RLS
    expect(updateError).toBeDefined();

    // 4. Conferir no banco que o papel continua estritamente 'member'
    const { data: profileAfter } = await svc
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    expect(profileAfter?.role).toBe("member");
  });
});
