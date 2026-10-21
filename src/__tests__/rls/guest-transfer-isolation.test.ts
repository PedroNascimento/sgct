/**
 * Testes RLS para Isolamento de Repasses de Convidados Inter-Estaca (guest_transfer_confirmations) (T013.8 / Spec 013).
 *
 * Artigo II.d da Constituição (Exceção Documentada):
 * - Convidado dono da reserva pode ler seu próprio repasse.
 * - Convidado NÃO tem permissão de escrita/confirmação.
 * - Admin Ala (de QUALQUER Ala da Estaca anfitriã ou de fora) NUNCA tem acesso (Artigo II.d / D28).
 * - Admin Estaca da Estaca anfitriã enxerga e gerencia os repasses de convidados da sua Estaca.
 * - Admin Estaca de outra Estaca (cross-stake) NÃO enxerga repasses da Estaca anfitriã.
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

describe("RLS — Isolamento de Transferências de Convidado (T013.8 / Spec 013)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();

  let hostStakeId: string;
  let otherStakeId: string;
  let hostWardId: string;

  let guestUserId: string;
  let hostAdminAlaUserId: string;
  let hostAdminEstacaUserId: string;
  let otherAdminEstacaUserId: string;

  let clientGuest: SupabaseClient;
  let clientHostAdminAla: SupabaseClient;
  let clientHostAdminEstaca: SupabaseClient;
  let clientOtherAdminEstaca: SupabaseClient;

  let caravanId: string;
  let guestReservationId: string;
  let transferConfirmationId: string;

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Criar Estaca Anfitriã (A) e Outra Estaca (B)
    const { data: sA } = await svc
      .from("stakes")
      .insert({ name: `Estaca Anfitriã ${ts}`, slug: `host-${ts}` })
      .select("id")
      .single();
    hostStakeId = sA!.id;

    const { data: sB } = await svc
      .from("stakes")
      .insert({ name: `Outra Estaca ${ts}`, slug: `other-${ts}` })
      .select("id")
      .single();
    otherStakeId = sB!.id;

    // 2. Criar Ala na Estaca Anfitriã
    const { data: wA } = await svc
      .from("wards")
      .insert({ stake_id: hostStakeId, name: `Ala Anfitriã ${ts}` })
      .select("id")
      .single();
    hostWardId = wA!.id;

    // 3. Helper de Criação de Usuário de Teste com app_metadata correto
    const pw = "SenhaForte@123!";
    const createTestUser = async (
      email: string,
      role: string,
      wardId: string | null,
      stakeId: string,
      extraProfileData: Record<string, any> = {}
    ) => {
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
        ...extraProfileData,
      });

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await client.auth.signInWithPassword({ email, password: pw });

      return { id: authUser.user.id, client };
    };

    const guest = await createTestUser(`guest.${ts}@guest.test`, "guest", null, hostStakeId, {
      home_stake_name: "Estaca de Origem",
      home_ward_name: "Ala de Origem",
    });
    guestUserId = guest.id;
    clientGuest = guest.client;

    const hostAdminAla = await createTestUser(
      `admin.ala.${ts}@guest.test`,
      "admin_ala",
      hostWardId,
      hostStakeId
    );
    hostAdminAlaUserId = hostAdminAla.id;
    clientHostAdminAla = hostAdminAla.client;

    const hostAdminEstaca = await createTestUser(
      `admin.estaca.${ts}@guest.test`,
      "admin_estaca",
      null,
      hostStakeId
    );
    hostAdminEstacaUserId = hostAdminEstaca.id;
    clientHostAdminEstaca = hostAdminEstaca.client;

    const otherAdminEstaca = await createTestUser(
      `other.estaca.${ts}@guest.test`,
      "admin_estaca",
      null,
      otherStakeId
    );
    otherAdminEstacaUserId = otherAdminEstaca.id;
    clientOtherAdminEstaca = otherAdminEstaca.client;

    // 4. Criar Caravana na Estaca Anfitriã
    const { data: cA, error: cErr } = await svc
      .from("caravans")
      .insert({
        stake_id: hostStakeId,
        departure_date: "2026-12-01",
        price_standard: 130,
        price_officiant: 117,
        registration_deadline: "2026-11-25",
        quorum_check_date: "2026-11-20",
        created_by: hostAdminEstacaUserId,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;
    caravanId = cA!.id;

    // 5. Criar Reserva do Convidado
    const { data: rGuest, error: rErr } = await svc
      .from("reservations")
      .insert({
        stake_id: hostStakeId,
        caravan_id: caravanId,
        user_id: guestUserId,
        seat_number: 22,
        category: "standard",
        participant_type: "adulto",
        funding_source: "convidado_transferencia_interestaca",
        status: "aguardando_transferencia_interestaca",
        payment_amount: 130,
      })
      .select("id")
      .single();
    if (rErr) throw rErr;
    guestReservationId = rGuest!.id;

    // 6. Criar Confirmação de Transferência de Convidado
    const { data: tConf, error: tErr } = await svc
      .from("guest_transfer_confirmations")
      .insert({
        stake_id: hostStakeId,
        reservation_id: guestReservationId,
        origin_stake_name: "Estaca de Origem",
        origin_ward_name: "Ala de Origem",
        amount: 130,
      })
      .select("id")
      .single();
    if (tErr) throw tErr;
    transferConfirmationId = tConf!.id;
  });

  afterAll(async () => {
    if (transferConfirmationId) {
      await svc.from("guest_transfer_confirmations").delete().eq("id", transferConfirmationId);
    }
    if (guestReservationId) {
      await svc.from("reservations").delete().eq("id", guestReservationId);
    }
    if (caravanId) {
      await svc.from("caravans").delete().eq("id", caravanId);
    }
    if (guestUserId) {
      await svc.auth.admin.deleteUser(guestUserId);
      await svc.auth.admin.deleteUser(hostAdminAlaUserId);
      await svc.auth.admin.deleteUser(hostAdminEstacaUserId);
      await svc.auth.admin.deleteUser(otherAdminEstacaUserId);
    }
    if (hostWardId) {
      await svc.from("wards").delete().eq("id", hostWardId);
    }
    if (hostStakeId) {
      await svc.from("stakes").delete().eq("id", hostStakeId);
      await svc.from("stakes").delete().eq("id", otherStakeId);
    }
  });

  it("1. Convidado dono da reserva pode visualizar sua própria confirmação de transferência", async () => {
    const { data, error } = await clientGuest
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("id", transferConfirmationId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(transferConfirmationId);
  });

  it("2. Convidado NÃO pode atualizar o status da transferência (apenas Admin Estaca)", async () => {
    const { data } = await clientGuest
      .from("guest_transfer_confirmations")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", transferConfirmationId)
      .select();

    expect(data ?? []).toHaveLength(0);

    const { data: dbCheck } = await svc
      .from("guest_transfer_confirmations")
      .select("confirmed_at")
      .eq("id", transferConfirmationId)
      .single();

    expect(dbCheck!.confirmed_at).toBeNull();
  });

  it("3. Admin Ala da Estaca anfitriã NUNCA tem acesso à transferência do convidado (Artigo II.d)", async () => {
    const { data, error } = await clientHostAdminAla
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("id", transferConfirmationId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("4. Admin Estaca da Estaca anfitriã visualiza o repasse do convidado", async () => {
    const { data, error } = await clientHostAdminEstaca
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("id", transferConfirmationId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].origin_stake_name).toBe("Estaca de Origem");
  });

  it("5. Admin Estaca da Estaca anfitriã PODE confirmar o repasse (update)", async () => {
    const now = new Date().toISOString();
    const { data, error } = await clientHostAdminEstaca
      .from("guest_transfer_confirmations")
      .update({
        confirmed_by: hostAdminEstacaUserId,
        confirmed_at: now,
      })
      .eq("id", transferConfirmationId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].confirmed_by).toBe(hostAdminEstacaUserId);
  });

  it("6. Admin Estaca de OUTRA Estaca (cross-stake) NÃO tem acesso (bloqueado por RLS)", async () => {
    const { data, error } = await clientOtherAdminEstaca
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("id", transferConfirmationId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
