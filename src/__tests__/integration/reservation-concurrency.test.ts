/**
 * Teste de Concorrência Real e Integridade de Triggers de Reserva (T003.1, T003.4)
 *
 * Artigo II da Constituição (Isolamento e Derivação de Tenant) e T003.1:
 * Duas requisições paralelas simultâneas tentando reservar o mesmo assento
 * na mesma caravana resultam em EXATAMENTE UMA com sucesso e uma rejeitada.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createReservation } from "@/use-cases/reservation/create-reservation";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Concorrência de Assentos e Triggers de Reserva (T003.1, T003.4)", () => {
  const svc = serviceClient();

  let stakeId: string;
  let wardId: string;
  let caravanId: string;
  let userAId: string;
  let userBId: string;
  let reservationRepo: SupabaseReservationRepository;
  let caravanRepo: SupabaseCaravanRepository;
  let profileRepo: SupabaseProfileRepository;

  const USER_A_EMAIL = `membro.concorr.a.${Date.now()}@teste.org`;
  const USER_B_EMAIL = `membro.concorr.b.${Date.now()}@teste.org`;
  const PASSWORD = "senha-segura-concorrencia-123";

  beforeAll(async () => {
    reservationRepo = new SupabaseReservationRepository(svc);
    caravanRepo = new SupabaseCaravanRepository(svc);
    profileRepo = new SupabaseProfileRepository(svc);

    // 1. Criar Stake e Ward de teste
    const { data: stake } = await svc
      .from("stakes")
      .insert({
        name: "Estaca Teste Concorrência",
        slug: `concorr-stake-${Date.now()}`,
        is_active: true,
      })
      .select("id")
      .single();
    stakeId = stake!.id;

    const { data: ward } = await svc
      .from("wards")
      .insert({
        stake_id: stakeId,
        name: "Ala Teste Concorrência",
      })
      .select("id")
      .single();
    wardId = ward!.id;

    // 2. Criar Usuário A e Profile
    const { data: authA, error: authAError } = await svc.auth.admin.createUser({
      email: USER_A_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Membro Concorrente A" },
    });
    if (authAError || !authA.user) {
      throw new Error(`Falha ao criar Auth A: ${authAError?.message}`);
    }
    userAId = authA.user.id;

    const { error: profileAError } = await svc.from("profiles").insert({
      id: userAId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: "Membro Concorrente A",
      cpf: "111.111.111-11",
      birth_date: "1992-05-15",
      role: "member",
      is_active: true,
    });
    if (profileAError) {
      throw new Error(`Falha ao criar Profile A: ${profileAError.message}`);
    }

    // 3. Criar Caravana Aberta com created_by = userAId
    const { data: caravan, error: caravanError } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeId,
        departure_date: "2026-12-15",
        return_date: "2026-12-18",
        price_standard: 130,
        price_officiant: 117,
        seat_limit: 50,
        waitlist_limit: 5,
        registration_deadline: "2026-12-10",
        min_quorum: 48,
        quorum_check_date: "2026-12-12",
        status: "open",
        created_by: userAId,
      })
      .select("id")
      .single();

    if (caravanError || !caravan) {
      throw new Error(`Falha ao criar caravana: ${caravanError?.message}`);
    }
    caravanId = caravan.id;

    // 4. Criar Usuário B e Profile
    const { data: authB, error: authBError } = await svc.auth.admin.createUser({
      email: USER_B_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Membro Concorrente B" },
    });
    if (authBError || !authB.user) {
      throw new Error(`Falha ao criar Auth B: ${authBError?.message}`);
    }
    userBId = authB.user.id;

    const { error: profileBError } = await svc.from("profiles").insert({
      id: userBId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: "Membro Concorrente B",
      cpf: "222.222.222-22",
      birth_date: "1995-08-20",
      role: "member",
      is_active: true,
    });
    if (profileBError) {
      throw new Error(`Falha ao criar Profile B: ${profileBError.message}`);
    }
  });

  afterAll(async () => {
    if (caravanId) {
      await svc.from("reservations").delete().eq("caravan_id", caravanId);
      await svc.from("caravans").delete().eq("id", caravanId);
    }
    if (userAId) {
      await svc.from("profiles").delete().eq("id", userAId);
      await svc.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await svc.from("profiles").delete().eq("id", userBId);
      await svc.auth.admin.deleteUser(userBId);
    }
    if (wardId) {
      await svc.from("wards").delete().eq("id", wardId);
    }
    if (stakeId) {
      await svc.from("stakes").delete().eq("id", stakeId);
    }
  });

  it("duas requisições paralelas reais para o mesmo assento resultam em exatamente uma com sucesso (T003.1)", async () => {
    const TARGET_SEAT = 23;

    // Disparar duas tentativas estritamente paralelas para o mesmo assento na mesma caravana
    const attemptA = createReservation(
      {
        caravanId,
        seatNumber: TARGET_SEAT,
        category: "standard",
        participantType: "adulto",
        fundingSource: "membro",
        isPreferentialSeating: false,
      },
      userAId,
      {
        reservationRepository: reservationRepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );

    const attemptB = createReservation(
      {
        caravanId,
        seatNumber: TARGET_SEAT,
        category: "standard",
        participantType: "adulto",
        fundingSource: "membro",
        isPreferentialSeating: false,
      },
      userBId,
      {
        reservationRepository: reservationRepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );

    const results = await Promise.allSettled([attemptA, attemptB]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exatamente uma sucedeu e exatamente uma foi rejeitada
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // A que falhou deve ter recebido a mensagem de concorrência limpa
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason.message).toBe("Assento já ocupado. Por favor, escolha outro assento.");
  });

  it("garante que stake_id e ward_id da reserva foram derivados corretamente pelo trigger (T003.4)", async () => {
    const { data: reservations } = await svc
      .from("reservations")
      .select("stake_id, ward_id, caravan_id, seat_number, status, payment_amount")
      .eq("caravan_id", caravanId);

    expect(reservations).toHaveLength(1);
    const saved = reservations![0];

    // stake_id derivado da caravana (Artigo II.c)
    expect(saved.stake_id).toBe(stakeId);
    // ward_id derivado do perfil do usuário vencedor
    expect(saved.ward_id).toBe(wardId);
    expect(saved.seat_number).toBe(23);
    expect(saved.status).toBe("pendente");
    expect(Number(saved.payment_amount)).toBe(130);
  });
});
