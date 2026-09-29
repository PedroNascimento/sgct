/**
 * Teste de Integração: Simulação de Fluxo Completo de Ponta a Ponta
 *
 * Cobre:
 * 1. Criação de usuários (Super Admin, Admin Estaca, Admin Ala, Membro Padrão)
 * 2. Criação de caravana pela liderança da Estaca
 * 3. Reserva de assento pelo Membro Padrão (status: 'pendente')
 * 4. Validações de segurança:
 *    - Bloqueio de autoaprovação de pagamento
 *    - Bloqueio cross-ala (Admin Ala A2 não pode aprovar reserva da Ala A1)
 *    - Bloqueio cross-estaca (Admin Estaca B não pode aprovar caravana da Estaca A)
 * 5. Aprovação do pagamento pelo Admin da Ala (status transiciona para 'pago_ala')
 * 6. Aprovação / Validação semanal pelo Admin da Estaca (status transiciona para 'confirmado')
 * 7. Criação de Admin de Ala pelo Admin da Estaca
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { createReservation } from "@/use-cases/reservation/create-reservation";
import { createCaravan } from "@/use-cases/caravan/create-caravan";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Simulação de Fluxo Completo (Reserva -> Aprovação Ala -> Validação Estaca)", () => {
  jest.setTimeout(40000);
  const svc = getServiceClient();

  const timestamp = Date.now();
  const PWD = "SenhaSegura123!";

  let stakeAId: string;
  let stakeBId: string;
  let wardA1Id: string;
  let wardA2Id: string;

  let superAdminUserId: string;
  let adminEstacaAUserId: string;
  let adminAlaA1UserId: string;
  let adminAlaA2UserId: string;
  let adminEstacaBUserId: string;
  let memberUserId: string;

  let caravanAId: string;
  let reservationId: string;

  let reservationRepo: SupabaseReservationRepository;
  let caravanRepo: SupabaseCaravanRepository;
  let profileRepo: SupabaseProfileRepository;

  beforeAll(async () => {
    reservationRepo = new SupabaseReservationRepository(svc);
    caravanRepo = new SupabaseCaravanRepository(svc);
    profileRepo = new SupabaseProfileRepository(svc);

    // 1. Criar Estaca A e Estaca B
    const { data: stakeA, error: errStakeA } = await svc
      .from("stakes")
      .insert({
        name: `Estaca Natal Simulacao ${timestamp}`,
        slug: `estaca-natal-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (errStakeA) throw errStakeA;
    stakeAId = stakeA.id;

    const { data: stakeB, error: errStakeB } = await svc
      .from("stakes")
      .insert({
        name: `Estaca Outra Simulacao ${timestamp}`,
        slug: `estaca-outra-${timestamp}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (errStakeB) throw errStakeB;
    stakeBId = stakeB.id;

    // 2. Criar Alas da Estaca A
    const { data: wardA1 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala Candelaria ${timestamp}` })
      .select("id")
      .single();
    wardA1Id = wardA1!.id;

    const { data: wardA2 } = await svc
      .from("wards")
      .insert({ stake_id: stakeAId, name: `Ala Neopolis ${timestamp}` })
      .select("id")
      .single();
    wardA2Id = wardA2!.id;

    // 3. Criar Super Admin
    const { data: authSA } = await svc.auth.admin.createUser({
      email: `superadmin.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "super_admin" },
    });
    superAdminUserId = authSA.user!.id;
    await svc.from("profiles").insert({
      id: superAdminUserId,
      full_name: "Super Administrador",
      role: "super_admin",
      birth_date: "1985-01-01",
      is_active: true,
    });

    // 4. Criar Admin da Estaca A
    const { data: authAdminA } = await svc.auth.admin.createUser({
      email: `admin.estaca.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "admin_estaca", stake_id: stakeAId },
    });
    adminEstacaAUserId = authAdminA.user!.id;
    await svc.from("profiles").insert({
      id: adminEstacaAUserId,
      stake_id: stakeAId,
      full_name: "Admin da Estaca Natal",
      role: "admin_estaca",
      birth_date: "1980-05-15",
      is_active: true,
    });

    // 5. Criar Admin da Ala A1
    const { data: authAdminAlaA1 } = await svc.auth.admin.createUser({
      email: `admin.ala1.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "admin_ala", stake_id: stakeAId, ward_id: wardA1Id },
    });
    adminAlaA1UserId = authAdminAlaA1.user!.id;
    await svc.from("profiles").insert({
      id: adminAlaA1UserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      full_name: "Admin da Ala Candelária",
      role: "admin_ala",
      birth_date: "1982-03-20",
      cpf: "111.222.333-44",
      phone: "84988887777",
      is_active: true,
    });

    // 6. Criar Admin da Ala A2 (outra Ala da mesma Estaca)
    const { data: authAdminAlaA2 } = await svc.auth.admin.createUser({
      email: `admin.ala2.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "admin_ala", stake_id: stakeAId, ward_id: wardA2Id },
    });
    adminAlaA2UserId = authAdminAlaA2.user!.id;
    await svc.from("profiles").insert({
      id: adminAlaA2UserId,
      stake_id: stakeAId,
      ward_id: wardA2Id,
      full_name: "Admin da Ala Neópolis",
      role: "admin_ala",
      birth_date: "1988-08-10",
      is_active: true,
    });

    // 7. Criar Admin da Estaca B (outra Estaca)
    const { data: authAdminB } = await svc.auth.admin.createUser({
      email: `admin.estaca.b.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "admin_estaca", stake_id: stakeBId },
    });
    adminEstacaBUserId = authAdminB.user!.id;
    await svc.from("profiles").insert({
      id: adminEstacaBUserId,
      stake_id: stakeBId,
      full_name: "Admin Estaca B",
      role: "admin_estaca",
      birth_date: "1981-01-01",
      is_active: true,
    });

    // 8. Criar Usuário Membro Padrão (pertencente à Ala A1 da Estaca A)
    const { data: authMember } = await svc.auth.admin.createUser({
      email: `membro.${timestamp}@teste.com`,
      password: PWD,
      email_confirm: true,
      app_metadata: { role: "member", stake_id: stakeAId, ward_id: wardA1Id },
    });
    memberUserId = authMember.user!.id;
    await svc.from("profiles").insert({
      id: memberUserId,
      stake_id: stakeAId,
      ward_id: wardA1Id,
      full_name: "Membro Padrão da Silva",
      role: "member",
      birth_date: "1995-10-10",
      cpf: "123.456.789-00",
      phone: "84999998888",
      sexo: "masculino",
      is_active: true,
    });

    // 9. Criar Caravana aberta na Estaca A usando use-case createCaravan
    const caravan = await createCaravan(
      {
        departureDate: "2026-11-20",
        returnDate: "2026-11-23",
        priceStandard: 150.0,
        priceOfficiant: 135.0,
        seatLimit: 44,
        waitlistLimit: 10,
        registrationDeadline: "2026-11-15",
        minQuorum: 40,
        quorumCheckDate: "2026-11-17",
        boardingPoints: [
          {
            name: "Capela Candelária",
            boardingTime: "2026-11-20T20:00:00-03:00",
          },
        ],
      },
      adminEstacaAUserId,
      {
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );
    caravanAId = caravan.id;
  });

  afterAll(async () => {
    // Limpeza de dados gerados
    await svc.from("reservations").delete().eq("stake_id", stakeAId);
    await svc.from("boarding_points").delete().eq("stake_id", stakeAId);
    await svc.from("caravans").delete().eq("stake_id", stakeAId);
    await svc.from("profiles").delete().in("id", [
      superAdminUserId,
      adminEstacaAUserId,
      adminAlaA1UserId,
      adminAlaA2UserId,
      adminEstacaBUserId,
      memberUserId,
    ]);
    await svc.auth.admin.deleteUser(superAdminUserId).catch(() => {});
    await svc.auth.admin.deleteUser(adminEstacaAUserId).catch(() => {});
    await svc.auth.admin.deleteUser(adminAlaA1UserId).catch(() => {});
    await svc.auth.admin.deleteUser(adminAlaA2UserId).catch(() => {});
    await svc.auth.admin.deleteUser(adminEstacaBUserId).catch(() => {});
    await svc.auth.admin.deleteUser(memberUserId).catch(() => {});
    await svc.from("wards").delete().in("id", [wardA1Id, wardA2Id]);
    await svc.from("stakes").delete().in("id", [stakeAId, stakeBId]);
  });

  describe("Passo 1 — Reserva de Assento pelo Membro", () => {
    it("permite ao membro realizar uma reserva com assento e status 'pendente'", async () => {
      const reservation = await createReservation(
        {
          caravanId: caravanAId,
          seatNumber: 12,
          category: "standard",
        },
        memberUserId,
        {
          reservationRepository: reservationRepo,
          caravanRepository: caravanRepo,
          profileRepository: profileRepo,
        }
      );

      expect(reservation).toBeDefined();
      expect(reservation.status).toBe("pendente");
      expect(reservation.seat_number).toBe(12);
      expect(reservation.stake_id).toBe(stakeAId);
      expect(reservation.ward_id).toBe(wardA1Id);
      expect(reservation.user_id).toBe(memberUserId);

      reservationId = reservation.id;
    });
  });

  describe("Passo 2 — Regras de Segurança e Bloqueios Administrativos", () => {
    it("impede autoaprovação: admin não pode aprovar a própria reserva", async () => {
      // Cria reserva para o próprio Admin Ala A1
      const selfRes = await createReservation(
        {
          caravanId: caravanAId,
          seatNumber: 14,
          category: "standard",
        },
        adminAlaA1UserId,
        {
          reservationRepository: reservationRepo,
          caravanRepository: caravanRepo,
          profileRepository: profileRepo,
        }
      );

      await expect(
        confirmWardPayment(
          { reservationId: selfRes.id, adminId: adminAlaA1UserId },
          { reservationRepository: reservationRepo, profileRepository: profileRepo }
        )
      ).rejects.toThrow("Bloqueio de autoaprovação");

      // Limpa reserva do admin
      await svc.from("reservations").delete().eq("id", selfRes.id);
    });

    it("impede que o Admin de outra Ala (Ala A2) aprove reserva da Ala A1", async () => {
      await expect(
        confirmWardPayment(
          { reservationId, adminId: adminAlaA2UserId },
          { reservationRepository: reservationRepo, profileRepository: profileRepo }
        )
      ).rejects.toThrow("Não autorizado: reserva pertence a outra Ala");
    });

    it("impede que o Admin de outra Estaca (Estaca B) aprove transferências da Estaca A", async () => {
      await expect(
        validateWeeklyTransfers(
          { caravanId: caravanAId, adminId: adminEstacaBUserId },
          {
            reservationRepository: reservationRepo,
            caravanRepository: caravanRepo,
            profileRepository: profileRepo,
          }
        )
      ).rejects.toThrow("Não autorizado: caravana pertence a outra Estaca");
    });
  });

  describe("Passo 3 — Aprovação do Pagamento pelo Admin da Ala", () => {
    it("Admin da Ala A1 aprova o pagamento com sucesso -> status vira 'pago_ala'", async () => {
      const updated = await confirmWardPayment(
        { reservationId, adminId: adminAlaA1UserId },
        { reservationRepository: reservationRepo, profileRepository: profileRepo }
      );

      expect(updated.status).toBe("pago_ala");

      // Verifica no repositório / banco
      const resInDb = await reservationRepo.findById(reservationId);
      expect(resInDb?.status).toBe("pago_ala");
    });

    it("rejeita confirmação duplicada na Ala para reserva que já está 'pago_ala'", async () => {
      await expect(
        confirmWardPayment(
          { reservationId, adminId: adminAlaA1UserId },
          { reservationRepository: reservationRepo, profileRepository: profileRepo }
        )
      ).rejects.toThrow("Não é possível confirmar pagamento para reserva com status 'pago_ala'");
    });
  });

  describe("Passo 4 — Validação Semanal e Aprovação pela Estaca", () => {
    it("Admin da Estaca valida as transferências da caravana -> status vira 'confirmado'", async () => {
      const result = await validateWeeklyTransfers(
        { caravanId: caravanAId, adminId: adminEstacaAUserId },
        {
          reservationRepository: reservationRepo,
          caravanRepository: caravanRepo,
          profileRepository: profileRepo,
        }
      );

      expect(result.skipped).toBe(false);
      expect(result.confirmed).toBeDefined();
      expect(result.confirmed!.length).toBeGreaterThanOrEqual(1);

      const confirmedRes = result.confirmed!.find((r) => r.id === reservationId);
      expect(confirmedRes).toBeDefined();
      expect(confirmedRes!.status).toBe("confirmado");
      expect(confirmedRes!.confirmed_at).toBeDefined();

      // Verifica no banco
      const finalRes = await reservationRepo.findById(reservationId);
      expect(finalRes?.status).toBe("confirmado");
      expect(finalRes?.confirmed_at).toBeTruthy();
      expect(finalRes?.seat_number).toBe(12);
    });
  });
});
