import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

describe("RLS — INSERT de reserva nunca atravessa Estacas", () => {
  jest.setTimeout(30000);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let memberClient: SupabaseClient;
  let stakeAId = "";
  let stakeBId = "";
  let wardAId = "";
  let wardBId = "";
  let caravanAId = "";
  let caravanBId = "";
  let userAId = "";
  let userBId = "";
  let superAdminId = "";
  let reservationBId = "";
  let reservationAId = "";
  let superAdminClient: SupabaseClient;
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `cross-stake-${stamp}@teste.org`;
  const password = "senha-segura-cross-stake-123";

  beforeAll(async () => {
    const { data: stakeA, error: stakeAError } = await svc
      .from("stakes")
      .insert({ name: `Estaca A ${stamp}`, slug: `stake-a-${stamp}` })
      .select("id")
      .single();
    if (stakeAError) throw stakeAError;
    stakeAId = stakeA.id;

    const { data: stakeB, error: stakeBError } = await svc
      .from("stakes")
      .insert({ name: `Estaca B ${stamp}`, slug: `stake-b-${stamp}` })
      .select("id")
      .single();
    if (stakeBError) throw stakeBError;
    stakeBId = stakeB.id;

    const { data: wardA, error: wardError } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala A ${stamp}` })
      .select("id")
      .single();
    if (wardError) throw wardError;
    wardAId = wardA.id;

    const { data: wardB, error: wardBError } = await svc
      .from("wards")
      .insert({ stake_id: stakeBId, name: `Ala B ${stamp}` })
      .select("id")
      .single();
    if (wardBError) throw wardBError;
    wardBId = wardB.id;

    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "member", stake_id: stakeAId, ward_id: wardAId },
    });
    if (authError || !authData.user) throw authError ?? new Error("Auth sem usuário");
    userAId = authData.user.id;

    const { error: profileError } = await svc.from("profiles").insert({
      id: userAId,
      stake_id: stakeAId,
      ward_id: wardAId,
      full_name: "Membro Estaca A",
      cpf: "12345678900",
      birth_date: "1990-01-01",
      role: "member",
    });
    if (profileError) throw profileError;

    const { data: authB, error: authBError } = await svc.auth.admin.createUser({
      email: `member-b-${stamp}@teste.org`,
      password,
      email_confirm: true,
      app_metadata: { role: "member", stake_id: stakeBId, ward_id: wardBId },
    });
    if (authBError || !authB.user) throw authBError ?? new Error("Auth B sem usuário");
    userBId = authB.user.id;
    const { error: profileBError } = await svc.from("profiles").insert({
      id: userBId,
      stake_id: stakeBId,
      ward_id: wardBId,
      full_name: "Membro Estaca B",
      cpf: "98765432100",
      birth_date: "1990-01-01",
      role: "member",
    });
    if (profileBError) throw profileBError;

    const { data: superAuth, error: superAuthError } = await svc.auth.admin.createUser({
      email: `super-${stamp}@teste.org`,
      password,
      email_confirm: true,
      app_metadata: { role: "super_admin", stake_id: null, ward_id: null },
    });
    if (superAuthError || !superAuth.user) {
      throw superAuthError ?? new Error("Auth super_admin sem usuário");
    }
    superAdminId = superAuth.user.id;
    const { error: superProfileError } = await svc.from("profiles").insert({
      id: superAdminId,
      stake_id: null,
      ward_id: null,
      full_name: "Super Admin Teste",
      birth_date: "1990-01-01",
      role: "super_admin",
    });
    if (superProfileError) throw superProfileError;

    const { data: caravanA, error: caravanAError } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2027-01-20",
        price_standard: 130,
        price_officiant: 117,
        registration_deadline: "2027-01-17",
        quorum_check_date: "2027-01-12",
        created_by: userAId,
      })
      .select("id")
      .single();
    if (caravanAError) throw caravanAError;
    caravanAId = caravanA.id;

    const { data: caravanB, error: caravanError } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeBId,
        departure_date: "2027-01-20",
        price_standard: 130,
        price_officiant: 117,
        registration_deadline: "2027-01-17",
        quorum_check_date: "2027-01-12",
        created_by: userAId,
      })
      .select("id")
      .single();
    if (caravanError) throw caravanError;
    caravanBId = caravanB.id;

    const { data: reservationA, error: reservationAError } = await svc
      .from("reservations")
      .insert({
        caravan_id: caravanAId,
        user_id: userAId,
        seat_number: 10,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        payment_amount: 130,
      })
      .select("id")
      .single();
    if (reservationAError) throw reservationAError;
    reservationAId = reservationA.id;

    const { data: reservationB, error: reservationBError } = await svc
      .from("reservations")
      .insert({
        caravan_id: caravanBId,
        user_id: userBId,
        seat_number: 10,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        payment_amount: 130,
      })
      .select("id")
      .single();
    if (reservationBError) throw reservationBError;
    reservationBId = reservationB.id;

    const fixtureErrors = await Promise.all([
      svc.from("minor_approval_forms").insert({
        reservation_id: reservationBId,
        stake_id: stakeAId,
        ward_id: wardAId,
        storage_path: `${stakeBId}/${wardBId}/form.pdf`,
      }),
      svc.from("credit_ledger").insert({
        stake_id: stakeBId,
        ward_id: wardBId,
        user_id: userBId,
        amount: 25,
        source: "exceptional_grant",
        origin_reservation_id: reservationBId,
        expires_at: "2028-01-01T00:00:00Z",
      }),
      svc.from("checkins").insert({
        reservation_id: reservationBId,
        stake_id: stakeAId,
        ward_id: wardAId,
        direction: "ida",
        checked_in_by: userBId,
      }),
    ]);
    for (const result of fixtureErrors) {
      if (result.error) throw result.error;
    }

    memberClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await memberClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    superAdminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: superSignInError } = await superAdminClient.auth.signInWithPassword({
      email: `super-${stamp}@teste.org`,
      password,
    });
    if (superSignInError) throw superSignInError;
  });

  afterAll(async () => {
    if (stakeBId) {
      await svc.from("minor_approval_forms").delete().eq("stake_id", stakeBId);
      await svc.from("credit_ledger").delete().eq("stake_id", stakeBId);
      await svc.from("checkins").delete().eq("stake_id", stakeBId);
    }
    if (caravanAId) await svc.from("reservations").delete().eq("caravan_id", caravanAId);
    if (caravanBId) await svc.from("reservations").delete().eq("caravan_id", caravanBId);
    if (caravanAId) await svc.from("caravans").delete().eq("id", caravanAId);
    if (caravanBId) await svc.from("caravans").delete().eq("id", caravanBId);
    if (userAId) {
      await svc.from("profiles").delete().eq("id", userAId);
      await svc.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await svc.from("profiles").delete().eq("id", userBId);
      await svc.auth.admin.deleteUser(userBId);
    }
    if (superAdminId) {
      await svc.from("profiles").delete().eq("id", superAdminId);
      await svc.auth.admin.deleteUser(superAdminId);
    }
    if (wardAId) await svc.from("wards").delete().eq("id", wardAId);
    if (wardBId) await svc.from("wards").delete().eq("id", wardBId);
    if (stakeAId) await svc.from("stakes").delete().eq("id", stakeAId);
    if (stakeBId) await svc.from("stakes").delete().eq("id", stakeBId);
  });

  it("rejeita membro da Estaca A tentando reservar caravana da Estaca B", async () => {
    const { error } = await memberClient.from("reservations").insert({
      caravan_id: caravanBId,
      user_id: userAId,
      seat_number: 49,
      category: "standard",
      participant_type: "adulto",
      funding_source: "membro",
      payment_amount: 130,
    });

    expect(error).toBeDefined();

    const { count } = await svc
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("caravan_id", caravanBId)
      .eq("user_id", userAId);
    expect(count).toBe(0);
  });

  it("oculta reservas da Estaca B para membro da Estaca A", async () => {
    const { data, error } = await memberClient
      .from("reservations")
      .select("id")
      .eq("id", reservationBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("sobrescreve stake_id e ward_id forjados com os valores derivados", async () => {
    const { data, error } = await memberClient
      .from("reservations")
      .insert({
        stake_id: stakeBId,
        ward_id: wardBId,
        caravan_id: caravanAId,
        user_id: userAId,
        seat_number: 48,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        payment_amount: 130,
      })
      .select("id, stake_id, ward_id")
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ stake_id: stakeAId, ward_id: wardAId });
  });

  it("impede que o próprio membro altere papel ou tenant do profile", async () => {
    const { error } = await memberClient
      .from("profiles")
      .update({ role: "admin_estaca", stake_id: stakeBId, ward_id: wardBId })
      .eq("id", userAId);

    expect(error).toBeNull();

    const { data } = await svc
      .from("profiles")
      .select("role, stake_id, ward_id")
      .eq("id", userAId)
      .single();
    expect(data).toEqual({ role: "member", stake_id: stakeAId, ward_id: wardAId });
  });

  it("reverte todo o lote quando uma atualização financeira é inválida", async () => {
    const { error } = await svc.rpc("update_reservations_batch", {
      updates_payload: [
        {
          id: reservationAId,
          status: "pago_ala",
          confirmation_rank: null,
          confirmed_at: null,
        },
        {
          id: reservationBId,
          status: "status_invalido",
          confirmation_rank: null,
          confirmed_at: null,
        },
      ],
    });

    expect(error).toBeDefined();
    const { data } = await svc
      .from("reservations")
      .select("status")
      .eq("id", reservationAId)
      .single();
    expect(data?.status).toBe("pendente");
  });

  it("aplica o limite de reservas de forma distribuída por usuário", async () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      const { data, error } = await memberClient.rpc("check_reservation_rate_limit");
      expect(error).toBeNull();
      expect(data).toBe(true);
    }

    const { data, error } = await memberClient.rpc("check_reservation_rate_limit");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it.each([
    "reservations",
    "credit_ledger",
    "minor_approval_forms",
    "checkins",
  ])("super_admin não lê dados operacionais em %s", async (table) => {
    const { data, error } = await superAdminClient.from(table).select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
