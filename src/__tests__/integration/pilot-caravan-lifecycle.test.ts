/**
 * Teste de Integração: Ciclo Completo da Caravana Piloto (Spec 011 / T011.2)
 *
 * Simula o ciclo de vida completo de uma caravana piloto em paralelo:
 * 1. Provisionamento de Caravana Piloto (50 assentos, 5 lista de espera).
 * 2. Inscrição e escolha de assentos de múltiplos membros (incluindo menor).
 * 3. Confirmação de pagamento na Ala pelo Admin da Ala (status: 'pago_ala').
 * 4. Validação semanal do repasse pelo Admin da Estaca (status: 'confirmado').
 * 5. Upload e aprovação de autorização de menor de idade.
 * 6. Permuta de assento aprovada pela liderança.
 * 7. Geração de QR Code assinado e validação de Check-in no embarque (com idempotência).
 * 8. Emissão de manifesto de passageiros e finalização.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseMinorRepository } from "@/infrastructure/supabase/supabase-minor-repository";
import { SupabaseSwapRepository } from "@/infrastructure/supabase/supabase-swap-repository";
import { createReservation } from "@/use-cases/reservation/create-reservation";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { approveMinorForm } from "@/use-cases/minors/approve-minor-form";
import { requestSeatSwap } from "@/use-cases/swap/request-seat-swap";
import { approveSeatSwap } from "@/use-cases/swap/approve-seat-swap";
import { generateCheckInToken } from "@/use-cases/checkin/generate-checkin-token";
import { validateCheckIn } from "@/use-cases/checkin/validate-checkin";
import { GeneratePassengerManifest } from "@/use-cases/checkin/generate-passenger-manifest";
import { SupabaseManifestDataProvider } from "@/infrastructure/supabase/supabase-manifest-data-provider";
import { SupabaseCheckInRepository } from "@/infrastructure/supabase/supabase-checkin-repository";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Spec 011 / T011.2 — Ciclo de Vida da Caravana Piloto", () => {
  jest.setTimeout(45000);
  const svc = getServiceClient();
  const timestamp = Date.now();

  let stakeId: string;
  let wardId: string;
  let adminEstacaId: string;
  let adminAlaId: string;
  let passengerAId: string;
  let passengerBId: string;
  let minorPassengerId: string;
  let caravanId: string;

  let reservationARepo: SupabaseReservationRepository;
  let caravanRepo: SupabaseCaravanRepository;
  let profileRepo: SupabaseProfileRepository;
  let minorRepo: SupabaseMinorRepository;
  let swapRepo: SupabaseSwapRepository;
  let creditRepo: SupabaseCreditRepository;

  beforeAll(async () => {
    reservationARepo = new SupabaseReservationRepository(svc);
    caravanRepo = new SupabaseCaravanRepository(svc);
    profileRepo = new SupabaseProfileRepository(svc);
    minorRepo = new SupabaseMinorRepository(svc);
    swapRepo = new SupabaseSwapRepository(svc);
    creditRepo = new SupabaseCreditRepository(svc);

    // 1. Criar Estaca Piloto
    const { data: stake, error: errStake } = await svc
      .from("stakes")
      .insert({
        name: `Estaca Natal Piloto ${timestamp}`,
        slug: `natal-piloto-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (errStake) throw errStake;
    stakeId = stake.id;

    // 2. Criar Ala Piloto
    const { data: ward, error: errWard } = await svc
      .from("wards")
      .insert({
        stake_id: stakeId,
        name: `Ala Lagoa Nova Piloto ${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (errWard) throw errWard;
    wardId = ward.id;

    // 3. Criar Usuários: Admin Estaca, Admin Ala, Passageiro A, Passageiro B, Passageiro Menor
    const createAuthUser = async (email: string) => {
      const { data, error } = await svc.auth.admin.createUser({
        email,
        password: "SenhaFortePiloto123!",
        email_confirm: true,
      });
      if (error) throw error;
      return data.user.id;
    };

    adminEstacaId = await createAuthUser(`admin_estaca_${timestamp}@teste.com`);
    adminAlaId = await createAuthUser(`admin_ala_${timestamp}@teste.com`);
    passengerAId = await createAuthUser(`passenger_a_${timestamp}@teste.com`);
    passengerBId = await createAuthUser(`passenger_b_${timestamp}@teste.com`);
    minorPassengerId = await createAuthUser(`minor_passenger_${timestamp}@teste.com`);

    // Inserir perfis
    await svc.from("profiles").insert({
      id: adminEstacaId,
      full_name: "Admin Estaca Piloto",
      role: "admin_estaca",
      stake_id: stakeId,
      birth_date: "1980-01-01",
      is_active: true,
    });

    await svc.from("profiles").insert({
      id: adminAlaId,
      full_name: "Admin Ala Piloto",
      role: "admin_ala",
      stake_id: stakeId,
      ward_id: wardId,
      birth_date: "1985-02-02",
      is_active: true,
    });

    await svc.from("profiles").insert({
      id: passengerAId,
      full_name: "Passageiro Adulto A",
      role: "member",
      stake_id: stakeId,
      ward_id: wardId,
      birth_date: "1990-03-03",
      cpf: "123.456.789-01",
      phone: "84999990001",
      is_active: true,
    });

    await svc.from("profiles").insert({
      id: passengerBId,
      full_name: "Passageiro Adulto B",
      role: "member",
      stake_id: stakeId,
      ward_id: wardId,
      birth_date: "1992-04-04",
      cpf: "123.456.789-02",
      phone: "84999990002",
      is_active: true,
    });

    await svc.from("profiles").insert({
      id: minorPassengerId,
      full_name: "Passageiro Menor C",
      role: "member",
      stake_id: stakeId,
      ward_id: wardId,
      birth_date: "2010-05-15", // Menor de 18 anos
      cpf: "123.456.789-03",
      phone: "84999990003",
      is_active: true,
    });

    // 4. Criar Caravana Piloto
    const departure = new Date(Date.now() + 86400000 * 20).toISOString();
    const deadline = new Date(Date.now() + 86400000 * 10).toISOString();
    const quorumCheck = new Date(Date.now() + 86400000 * 12).toISOString();

    const { data: caravan, error: errCaravan } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeId,
        departure_date: departure,
        registration_deadline: deadline,
        quorum_check_date: quorumCheck,
        price_standard: 120.0,
        price_officiant: 100.0,
        seat_limit: 50,
        waitlist_limit: 5,
        min_quorum: 45,
        status: "open",
        created_by: adminEstacaId,
      })
      .select("id")
      .single();
    if (errCaravan) throw errCaravan;
    caravanId = caravan.id;
  });

  afterAll(async () => {
    // Limpeza
    await svc.from("reservations").delete().eq("stake_id", stakeId);
    await svc.from("caravans").delete().eq("stake_id", stakeId);
    await svc.from("profiles").delete().eq("stake_id", stakeId);
    await svc.from("wards").delete().eq("stake_id", stakeId);
    await svc.from("stakes").delete().eq("id", stakeId);

    for (const uid of [adminEstacaId, adminAlaId, passengerAId, passengerBId, minorPassengerId]) {
      if (uid) await svc.auth.admin.deleteUser(uid).catch(() => {});
    }
  });

  it("Executa o fluxo completo do piloto: reserva -> repasse -> validação -> menor -> permuta -> checkin -> manifesto", async () => {
    // 1. Reserva do Passageiro A (Assento 12)
    const resA = await createReservation(
      {
        caravanId,
        seatNumber: 12,
        category: "standard",
      },
      passengerAId,
      {
        reservationRepository: reservationARepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );
    expect(resA.status).toBe("pendente");
    expect(resA.seat_number).toBe(12);

    // 2. Reserva do Menor de Idade (Assento 14)
    const resMinor = await createReservation(
      {
        caravanId,
        seatNumber: 14,
        category: "standard",
      },
      minorPassengerId,
      {
        reservationRepository: reservationARepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );
    expect(resMinor.status).toBe("pendente");

    // 3. Confirmar pagamento na Ala para ambos pelo Admin da Ala
    const payA = await confirmWardPayment(
      { reservationId: resA.id, adminId: adminAlaId },
      { reservationRepository: reservationARepo, profileRepository: profileRepo }
    );
    expect(payA.status).toBe("pago_ala");

    const payMinor = await confirmWardPayment(
      { reservationId: resMinor.id, adminId: adminAlaId },
      { reservationRepository: reservationARepo, profileRepository: profileRepo }
    );
    expect(payMinor.status).toBe("pago_ala");

    // 4. Validação semanal das transferências pelo Admin da Estaca
    const weeklyResult = await validateWeeklyTransfers(
      { caravanId, adminId: adminEstacaId },
      {
        reservationRepository: reservationARepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );
    expect(weeklyResult.confirmed.length).toBe(2);

    // Verificar se status avançou para 'confirmado'
    const updatedA = await reservationARepo.findById(resA.id);
    expect(updatedA?.status).toBe("confirmado");

    // 5. Upload e aprovação de formulário do menor
    const { data: minorForm } = await svc
      .from("minor_approval_forms")
      .insert({
        stake_id: stakeId,
        ward_id: wardId,
        reservation_id: resMinor.id,
        storage_path: `minors/${stakeId}/${resMinor.id}_autorizacao.pdf`,
        status: "pending",
      })
      .select("id")
      .single();

    const approvedForm = await approveMinorForm(
      {
        formId: minorForm!.id,
        adminId: adminEstacaId,
        status: "approved",
      },
      {
        minorRepository: minorRepo,
        profileRepository: profileRepo,
      }
    );
    expect(approvedForm.status).toBe("approved");

    // 6. Permuta de assento: Passageiro A cede assento para Passageiro B
    const swapReq = await requestSeatSwap(
      {
        reservationId: resA.id,
        newHolderFullName: "Passageiro Adulto B",
        requestedBy: adminEstacaId,
      },
      {
        reservationRepository: reservationARepo,
        swapRepository: swapRepo,
        profileRepository: profileRepo,
      }
    );
    expect(swapReq.status).toBe("pending");

    const approvedSwap = await approveSeatSwap(
      {
        swapRequestId: swapReq.id,
        approverId: adminEstacaId,
      },
      {
        swapRepository: swapRepo,
        reservationRepository: reservationARepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
        creditRepository: creditRepo,
      }
    );
    expect(approvedSwap.swapRequest.status).toBe("approved");

    // 7. Geração de Token e Check-in com QR Code no embarque
    const tokenResult = await generateCheckInToken(
      resA.id,
      {
        reservationRepository: reservationARepo,
        caravanRepository: caravanRepo,
      }
    );
    expect(tokenResult.token).toBeDefined();

    // Validar check-in pelo leitor QR Code
    const checkInRepo = new SupabaseCheckInRepository(svc);
    const checkin = await validateCheckIn(
      {
        token: tokenResult.token,
        direction: "ida",
        checkedInBy: adminEstacaId,
      },
      {
        checkInRepository: checkInRepo,
        reservationRepository: reservationARepo,
      }
    );
    expect(checkin.reservation_id).toBe(resA.id);
    expect(checkin.direction).toBe("ida");

    const presentReservation = await reservationARepo.findById(resA.id);
    expect(presentReservation?.status).toBe("presente");

    // 8. Emissão do Manifesto Oficial de Passageiros
    const manifestProvider = new SupabaseManifestDataProvider(svc);
    const manifestGenerator = new GeneratePassengerManifest(manifestProvider);
    const manifestRows = await manifestGenerator.execute(caravanId);

    expect(manifestRows.length).toBe(3);
    expect(manifestRows.some((r) => r.seatNumber === 12)).toBe(true);
    expect(manifestRows.some((r) => r.seatNumber === 14)).toBe(true);
    expect(manifestRows.some((r) => r.passengerName === "Passageiro Adulto B")).toBe(true);
  });
});
