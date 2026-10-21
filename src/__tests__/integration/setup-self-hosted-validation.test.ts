/**
 * Teste de Validação de Auto-Hospedagem / Segunda Instância (Spec 011 / T011.6 / Artigo IX)
 *
 * Valida os princípios do SETUP.md:
 * 1. Uma nova Estaca pode ser provisionada sem nenhuma alteração de código-fonte.
 * 2. Criação do primeiro Admin de Estaca via bootstrap.
 * 3. Criação de Alas e Caravanas na nova Estaca.
 * 4. Isolamento absoluto de dados entre a Estaca original e a nova Estaca auto-hospedada/provisionada.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseWardRepository } from "@/infrastructure/supabase/supabase-ward-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Spec 011 / T011.6 — Validação do SETUP.md em Segunda Instância", () => {
  const svc = getServiceClient();
  const timestamp = Date.now();

  let instance2StakeId: string;
  let instance2AdminUserId: string;

  beforeAll(async () => {
    // 1. Provisionar segunda Estaca (ex: Estaca Campina Grande) seguindo SETUP.md
    const { data: stake2, error: errStake } = await svc
      .from("stakes")
      .insert({
        name: `Estaca Campina Grande Teste ${timestamp}`,
        slug: `campina-grande-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (errStake) throw errStake;
    instance2StakeId = stake2.id;

    // 2. Criar o primeiro Admin da Estaca para essa nova instância
    const { data: authAdmin, error: errAuth } = await svc.auth.admin.createUser({
      email: `admin.campina.${timestamp}@teste.com`,
      password: "SenhaForteSegura123!",
      email_confirm: true,
      app_metadata: { role: "admin_estaca", stake_id: instance2StakeId },
    });
    if (errAuth) throw errAuth;
    instance2AdminUserId = authAdmin.user.id;

    await svc.from("profiles").insert({
      id: instance2AdminUserId,
      stake_id: instance2StakeId,
      full_name: "Admin Estaca Campina Grande",
      role: "admin_estaca",
      birth_date: "1982-08-10",
      cpf: "555.666.777-88",
      phone: "83988887777",
      is_active: true,
    });
  });

  afterAll(async () => {
    await svc.from("caravans").delete().eq("stake_id", instance2StakeId);
    await svc.from("wards").delete().eq("stake_id", instance2StakeId);
    await svc.from("profiles").delete().eq("stake_id", instance2StakeId);
    await svc.from("stakes").delete().eq("id", instance2StakeId);
    if (instance2AdminUserId) {
      await svc.auth.admin.deleteUser(instance2AdminUserId).catch(() => {});
    }
  });

  it("permite operar a segunda instância completamente através dos repositórios sem alterar código", async () => {
    const stakeRepo = new SupabaseStakeRepository(svc);
    const wardRepo = new SupabaseWardRepository(svc);
    const caravanRepo = new SupabaseCaravanRepository(svc);

    // 1. Consultar a Estaca pelo slug
    const stake = await stakeRepo.findBySlug(`campina-grande-${timestamp}`);
    expect(stake).toBeDefined();
    expect(stake?.name).toContain("Campina Grande");

    // 2. Cadastrar Ala na nova instância
    const ward = await wardRepo.create(instance2StakeId, "Ala Liberdade");
    expect(ward.id).toBeDefined();
    expect(ward.stake_id).toBe(instance2StakeId);

    // 3. Cadastrar Caravana na nova instância
    const departure = new Date(Date.now() + 86400000 * 30).toISOString();
    const deadline = new Date(Date.now() + 86400000 * 15).toISOString();
    const quorumCheck = new Date(Date.now() + 86400000 * 20).toISOString();

    const caravan = await caravanRepo.create({
      stake_id: instance2StakeId,
      departure_date: departure,
      registration_deadline: deadline,
      quorum_check_date: quorumCheck,
      price_standard: 150.0,
      price_officiant: 130.0,
      seat_limit: 48,
      waitlist_limit: 5,
      min_quorum: 45,
      created_by: instance2AdminUserId,
      status: "open",
    });
    expect(caravan.id).toBeDefined();
    expect(caravan.stake_id).toBe(instance2StakeId);

    // 4. Garantir que a busca de caravanas da nova Estaca traz apenas caravanas dela
    const caravansStake2 = await caravanRepo.findByStakeId(instance2StakeId);
    expect(caravansStake2.length).toBe(1);
    expect(caravansStake2[0].id).toBe(caravan.id);
  });
});
