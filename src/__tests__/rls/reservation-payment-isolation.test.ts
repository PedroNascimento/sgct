/**
 * Testes RLS para Transição de Pagamento de Reservas (T004.2)
 *
 * Artigo II da Constituição e T004.2:
 * - Admin Ala de outra Ala da mesma Estaca tentando atualizar reserva → bloqueado por RLS.
 * - Admin Ala de outra Estaca tentando atualizar reserva → bloqueado por RLS.
 * - Admin Ala da mesma Ala e Estaca pode atualizar via policy reservations_update_admin.
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

describe("RLS — Isolamento de Confirmação de Pagamento de Reserva (T004.2)", () => {
  jest.setTimeout(30000);
  const svc = serviceClient();

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;
  let wardB1Id: string;

  let adminA1UserId: string;
  let adminA2UserId: string;
  let adminB1UserId: string;
  let memberA1UserId: string;

  let caravanAId: string;
  let reservationA1Id: string;

  let clientAdminA1: SupabaseClient;
  let clientAdminA2: SupabaseClient;
  let clientAdminB1: SupabaseClient;

  const timestamp = Date.now();
  const PWD = "senha-segura-rls-123";

  beforeAll(async () => {
    // 1. Criar Estaca A e Estaca B
    const { data: stakeA } = await svc
      .from("stakes")
      .insert({
        name: "Estaca A Pagamento",
        slug: `stake-a-payment-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeAId = stakeA!.id;

    const { data: stakeB } = await svc
      .from("stakes")
      .insert({
        name: "Estaca B Pagamento",
        slug: `stake-b-payment-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeBId = stakeB!.id;

    // 2. Criar Alas: A1 e A2 (na Estaca A) e B1 (na Estaca B)
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({
        stake_id: stakeAId,
        name: `Ala A1 ${timestamp}`,
      })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({
        stake_id: stakeAId,
        name: `Ala A2 ${timestamp}`,
      })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    const { data: wardB1 } = await svc
      .from("wards")
      .insert({
        stake_id: stakeBId,
        name: `Ala B1 ${timestamp}`,
      })
      .select("id")
      .single();
    wardB1Id = wardB1!.id;

    // 3. Criar Usuários no Auth e Profiles
    // Admin Ala A1
    const emailA1 = `admin.a1.${timestamp}@teste.org`;
    const { data: authA1 } = await svc.auth.admin.createUser({
      email: emailA1,
      password: PWD,
      email_confirm: true,
    });
    adminA1UserId = authA1.user!.id;
    await svc.from("profiles").insert({
      id: adminA1UserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      role: "admin_ala",
      full_name: "Admin Ala A1",
      cpf: "111.111.111-11",
      birth_date: "1980-01-01",
      phone: "84911111111",
      sexo: "masculino",
      is_active: true,
    });

    // Admin Ala A2 (mesma Estaca A, outra Ala)
    const emailA2 = `admin.a2.${timestamp}@teste.org`;
    const { data: authA2 } = await svc.auth.admin.createUser({
      email: emailA2,
      password: PWD,
      email_confirm: true,
    });
    adminA2UserId = authA2.user!.id;
    await svc.from("profiles").insert({
      id: adminA2UserId,
      stake_id: stakeAId,
      ward_id: wardA2Id,
      role: "admin_ala",
      full_name: "Admin Ala A2",
      cpf: "222.222.222-22",
      birth_date: "1982-02-02",
      phone: "84922222222",
      sexo: "masculino",
      is_active: true,
    });

    // Admin Ala B1 (outra Estaca B)
    const emailB1 = `admin.b1.${timestamp}@teste.org`;
    const { data: authB1 } = await svc.auth.admin.createUser({
      email: emailB1,
      password: PWD,
      email_confirm: true,
    });
    adminB1UserId = authB1.user!.id;
    await svc.from("profiles").insert({
      id: adminB1UserId,
      stake_id: stakeBId,
      ward_id: wardB1Id,
      role: "admin_ala",
      full_name: "Admin Ala B1",
      cpf: "333.333.333-33",
      birth_date: "1985-03-03",
      phone: "84933333333",
      sexo: "masculino",
      is_active: true,
    });

    // Membro da Ala A1
    const emailMember = `member.a1.${timestamp}@teste.org`;
    const { data: authMember } = await svc.auth.admin.createUser({
      email: emailMember,
      password: PWD,
      email_confirm: true,
    });
    memberA1UserId = authMember.user!.id;
    await svc.from("profiles").insert({
      id: memberA1UserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      role: "member",
      full_name: "Membro da Ala A1",
      cpf: "444.444.444-44",
      birth_date: "1995-04-04",
      phone: "84944444444",
      sexo: "masculino",
      is_active: true,
    });

    // 4. Criar Caravana na Estaca A
    const { data: caravanA } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeAId,
        departure_date: "2026-11-20T06:00:00Z",
        return_date: "2026-11-22T20:00:00Z",
        price_standard: 130.0,
        price_officiant: 117.0,
        seat_limit: 50,
        waitlist_limit: 5,
        registration_deadline: "2026-11-15T23:59:59Z",
        min_quorum: 30,
        quorum_check_date: "2026-11-17T06:00:00Z",
        status: "open",
        created_by: adminA1UserId,
      })
      .select("id")
      .single();
    caravanAId = caravanA!.id;

    // 5. Criar Reserva do Membro da Ala A1 com status 'pendente'
    const { data: resA1 } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeAId,
        ward_id: wardA1Id,
        caravan_id: caravanAId,
        user_id: memberA1UserId,
        seat_number: 14,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
        is_preferential_seating: false,
        status: "pendente",
        payment_amount: 130.0,
      })
      .select("id")
      .single();
    reservationA1Id = resA1!.id;

    // 6. Configurar app_metadata no auth.users para emissão do JWT correto
    await svc.auth.admin.updateUserById(adminA1UserId, {
      app_metadata: { role: "admin_ala", stake_id: stakeAId, ward_id: wardA1Id },
    });
    await svc.auth.admin.updateUserById(adminA2UserId, {
      app_metadata: { role: "admin_ala", stake_id: stakeAId, ward_id: wardA2Id },
    });
    await svc.auth.admin.updateUserById(adminB1UserId, {
      app_metadata: { role: "admin_ala", stake_id: stakeBId, ward_id: wardB1Id },
    });

    // 7. Autenticar os clientes Supabase para cada Admin
    clientAdminA1 = anonClient();
    await clientAdminA1.auth.signInWithPassword({ email: emailA1, password: PWD });

    clientAdminA2 = anonClient();
    await clientAdminA2.auth.signInWithPassword({ email: emailA2, password: PWD });

    clientAdminB1 = anonClient();
    await clientAdminB1.auth.signInWithPassword({ email: emailB1, password: PWD });
  }, 30000);

  afterAll(async () => {
    // Limpeza de fixtures
    if (reservationA1Id) {
      await svc.from("reservations").delete().eq("id", reservationA1Id);
    }
    if (caravanAId) {
      await svc.from("caravans").delete().eq("id", caravanAId);
    }
    for (const uid of [adminA1UserId, adminA2UserId, adminB1UserId, memberA1UserId]) {
      if (uid) {
        await svc.from("profiles").delete().eq("id", uid);
        await svc.auth.admin.deleteUser(uid);
      }
    }
    if (wardA1Id) await svc.from("wards").delete().eq("id", wardA1Id);
    if (wardA2Id) await svc.from("wards").delete().eq("id", wardA2Id);
    if (wardB1Id) await svc.from("wards").delete().eq("id", wardB1Id);
    if (stakeAId) await svc.from("stakes").delete().eq("id", stakeAId);
    if (stakeBId) await svc.from("stakes").delete().eq("id", stakeBId);
  }, 30000);

  it("bloqueia Admin Ala de outra Ala da mesma Estaca (A2 tentando atualizar reserva de A1)", async () => {
    // Admin A2 tenta marcar reserva da Ala A1 como pago_ala
    const { data, error } = await clientAdminA2
      .from("reservations")
      .update({ status: "pago_ala" })
      .eq("id", reservationA1Id)
      .select();

    // RLS filtra e não aplica o update
    expect(data?.length ?? 0).toBe(0);

    // Confirma que a reserva continua pendente
    const { data: currentRes } = await svc
      .from("reservations")
      .select("status")
      .eq("id", reservationA1Id)
      .single();
    expect(currentRes?.status).toBe("pendente");
  });

  it("bloqueia Admin Ala de outra Estaca (B1 tentando atualizar reserva da Estaca A)", async () => {
    // Admin B1 tenta marcar reserva da Ala A1 como pago_ala
    const { data, error } = await clientAdminB1
      .from("reservations")
      .update({ status: "pago_ala" })
      .eq("id", reservationA1Id)
      .select();

    // RLS filtra e bloqueia completamente
    expect(data?.length ?? 0).toBe(0);

    // Confirma que a reserva continua pendente
    const { data: currentRes } = await svc
      .from("reservations")
      .select("status")
      .eq("id", reservationA1Id)
      .single();
    expect(currentRes?.status).toBe("pendente");
  });

  it("permite Admin Ala da mesma Ala e Estaca (A1) atualizar reserva de sua própria Ala", async () => {
    // Admin A1 atualiza a reserva da própria Ala para pago_ala
    const { data, error } = await clientAdminA1
      .from("reservations")
      .update({ status: "pago_ala" })
      .eq("id", reservationA1Id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].status).toBe("pago_ala");
  });
});
