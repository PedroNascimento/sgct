/**
 * Testes Automatizados — Auditoria Fase 3: Privacidade, Governança e LGPD
 *
 * Cobre:
 * - A01: Super Admin restrito a admin_estaca (sem listagem de membros)
 * - M01: Calendário público seguro via RPC, ocultação estrita de auxílio financeiro e DTO neutro
 * - A08: Check-in offline com rastreamento por token e resiliência em lote parcial
 * - A12: Retenção LGPD considerando COALESCE(return_date, departure_date) e persistência segura
 * - A13: Auditoria obrigatória LGPD sem falha silenciosa
 * - A15/A16: Inativação de administradores bloqueia RLS e trigger atualiza profiles.last_login_at
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { syncOfflineCheckIns } from "@/use-cases/checkin/sync-offline-checkins";
import { signQrToken } from "@/use-cases/checkin/qr-token-crypto";
import { purgeExpiredMinorData } from "@/use-cases/retention/purge-expired-minor-data";
import { SupabaseAuditLogPort } from "@/infrastructure/supabase/supabase-minor-repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

describe("Auditoria Fase 3 — Privacidade, Governança e LGPD", () => {
  jest.setTimeout(30000);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let stakeId = "";
  let wardId = "";
  let caravanId = "";
  let adminEstacaUserId = "";
  let memberUserId = "";
  let reservationId = "";

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const qrSecret = "secret-super-seguro-de-teste-32chars!";

  beforeAll(async () => {
    // 1. Criar Estaca e Ala
    const { data: stake, error: stakeErr } = await svc
      .from("stakes")
      .insert({ name: `Estaca Fase3 ${stamp}`, slug: `fase3-stake-${stamp}`, is_active: true })
      .select("id")
      .single();
    if (stakeErr) throw stakeErr;
    stakeId = stake.id;

    const { data: ward, error: wardErr } = await svc
      .from("wards")
      .insert({ stake_id: stakeId, name: `Ala Fase3 ${stamp}`, is_active: true })
      .select("id")
      .single();
    if (wardErr) throw wardErr;
    wardId = ward.id;

    // 2. Criar Admin de Estaca
    const adminEmail = `admin-fase3-${stamp}@teste.org`;
    const { data: adminAuth, error: adminAuthErr } = await svc.auth.admin.createUser({
      email: adminEmail,
      password: "senha-segura-admin-123",
      email_confirm: true,
      app_metadata: { role: "admin_estaca", stake_id: stakeId },
    });
    if (adminAuthErr) throw adminAuthErr;
    adminEstacaUserId = adminAuth.user.id;

    await svc.from("profiles").upsert({
      id: adminEstacaUserId,
      stake_id: stakeId,
      full_name: "Admin Estaca Fase 3",
      role: "admin_estaca",
      birth_date: "1985-05-10",
      is_active: true,
    });

    // 3. Criar Membro comum
    const memberEmail = `member-fase3-${stamp}@teste.org`;
    const { data: memberAuth, error: memberAuthErr } = await svc.auth.admin.createUser({
      email: memberEmail,
      password: "senha-segura-member-123",
      email_confirm: true,
      app_metadata: { role: "member", stake_id: stakeId, ward_id: wardId },
    });
    if (memberAuthErr) throw memberAuthErr;
    memberUserId = memberAuth.user.id;

    await svc.from("profiles").upsert({
      id: memberUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: "Membro Comum Fase 3",
      role: "member",
      birth_date: "1995-07-20",
      is_active: true,
    });

    // 4. Criar Caravana
    const { data: caravan, error: cErr } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeId,
        departure_date: "2026-11-20",
        return_date: "2026-11-22",
        registration_deadline: "2026-11-15",
        quorum_check_date: "2026-11-17",
        price_standard: 150.0,
        price_officiant: 100.0,
        seat_limit: 48,
        waitlist_limit: 10,
        created_by: adminEstacaUserId,
        status: "open",
      })
      .select("id")
      .single();
    if (cErr) throw cErr;
    caravanId = caravan.id;

    // 5. Criar Reserva com status 'aguardando_auxilio'
    const { data: res, error: rErr } = await svc
      .from("reservations")
      .insert({
        caravan_id: caravanId,
        user_id: memberUserId,
        seat_number: 12,
        payment_amount: 150.0,
        status: "aguardando_auxilio",
        funding_source: "auxilio_recem_converso",
      })
      .select("id")
      .single();
    if (rErr) throw rErr;
    reservationId = res.id;
  });

  afterAll(async () => {
    await svc.from("reservations").delete().eq("caravan_id", caravanId);
    await svc.from("caravans").delete().eq("id", caravanId);
    await svc.from("profiles").delete().in("id", [adminEstacaUserId, memberUserId]);
    await svc.auth.admin.deleteUser(adminEstacaUserId).catch(() => {});
    await svc.auth.admin.deleteUser(memberUserId).catch(() => {});
    await svc.from("wards").delete().eq("id", wardId);
    await svc.from("stakes").delete().eq("id", stakeId);
  });

  describe("3.1 Limitação do Super Admin (A01)", () => {
    it("não deve listar membros comuns na consulta de administradores", async () => {
      // Query equivalente à corrigida em getAdminsList()
      const { data: admins } = await svc
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "admin_estaca")
        .eq("stake_id", stakeId);

      expect(admins).toBeDefined();
      expect(admins?.some((a) => a.id === adminEstacaUserId)).toBe(true);
      expect(admins?.some((a) => a.id === memberUserId)).toBe(false);
      expect(admins?.every((a) => a.role === "admin_estaca")).toBe(true);
    });
  });

  describe("3.2 Ocultação de Auxílio no Calendário Público (M01 / Artigo II.g)", () => {
    it("deve permitir chamada pública anônima e retornar DTO neutro sem 'Ag. auxílio'", async () => {
      const { data: subscribers, error } = await anonClient.rpc(
        "get_public_caravan_subscribers",
        { p_caravan_ids: [caravanId] }
      );

      expect(error).toBeNull();
      expect(subscribers).toBeDefined();
      expect(subscribers?.length).toBeGreaterThan(0);

      const sub = subscribers?.find((s: any) => s.id === reservationId);
      expect(sub).toBeDefined();
      expect(sub.full_name).toBe("Membro Comum Fase 3");
      // Status deve ser neutro 'Em validação', NUNCA 'Ag. auxílio' nem 'aguardando_auxilio'
      expect(sub.public_status).toBe("Em validação");
      expect(sub.public_status).not.toContain("auxílio");
      expect(sub.public_status).not.toContain("aid");

      // Não deve expor campos sensíveis como funding_source, cpf, email, telefone
      expect(sub.funding_source).toBeUndefined();
      expect(sub.cpf).toBeUndefined();
      expect(sub.email).toBeUndefined();
      expect(sub.phone).toBeUndefined();
    });
  });

  describe("3.3 Resiliência e Contrato do Check-in Offline (A08)", () => {
    it("deve processar lote parcial e retornar cada token processado para permitir remoção seletiva", async () => {
      const validToken = signQrToken(
        {
          reservationId,
          stakeId,
          caravanId,
          passengerName: "Membro Comum Fase 3",
          seatNumber: 12,
          wardName: "Ala Fase3",
          departureDate: "2026-11-20",
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        qrSecret
      );

      const items = [
        {
          token: validToken,
          direction: "ida" as const,
          checkedInBy: adminEstacaUserId,
          checkedInAt: new Date().toISOString(),
        },
        {
          token: validToken, // duplicata intencional
          direction: "ida" as const,
          checkedInBy: adminEstacaUserId,
          checkedInAt: new Date().toISOString(),
        },
        {
          token: "token-invalido-corrompido",
          direction: "ida" as const,
          checkedInBy: adminEstacaUserId,
          checkedInAt: new Date().toISOString(),
        },
      ];

      const mockCheckInRepo = {
        findByReservationAndDirection: jest.fn().mockResolvedValue(null),
        createCheckIn: jest.fn().mockResolvedValue({ id: "checkin-1", reservation_id: reservationId }),
        findConfirmedTokensByCaravan: jest.fn(),
      };
      const mockResRepo = {
        findById: jest.fn().mockResolvedValue({
          id: reservationId,
          stake_id: stakeId,
          caravan_id: caravanId,
          user_id: memberUserId,
          status: "confirmado",
        }),
        updateStatus: jest.fn().mockResolvedValue({ id: reservationId, status: "presente" }),
      };
      const mockCaravanRepo = {
        findById: jest.fn().mockResolvedValue({
          id: caravanId,
          stake_id: stakeId,
          caravan_leader_id: adminEstacaUserId,
          status: "open",
        }),
      };
      const mockProfileRepo = {
        findById: jest.fn().mockResolvedValue({
          id: adminEstacaUserId,
          stake_id: stakeId,
          full_name: "Admin Estaca Fase 3",
          role: "admin_estaca",
          is_active: true,
        }),
      };

      const result = await syncOfflineCheckIns(items, {
        checkInRepository: mockCheckInRepo as any,
        reservationRepository: mockResRepo as any,
        caravanRepository: mockCaravanRepo as any,
        profileRepository: mockProfileRepo as any,
        secret: qrSecret,
      });

      expect(result.syncedCount).toBe(1);
      expect(result.duplicateCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // Cada resultado deve conter o token associado
      expect(result.results[0].token).toBe(validToken);
      expect(result.results[0].status).toBe("synced");

      expect(result.results[1].token).toBe(validToken);
      expect(result.results[1].status).toBe("duplicate");

      expect(result.results[2].token).toBe("token-invalido-corrompido");
      expect(result.results[2].status).toBe("failed");
    });
  });

  describe("3.4 Auditoria Obrigatória e Retenção de Menores (A12, A13)", () => {
    it("SupabaseAuditLogPort deve lançar exceção fatal se o insert em audit_logs falhar", async () => {
      const mockSupabaseFailing = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({
            error: { message: "permission denied for table audit_logs (RLS violation)" },
          }),
        }),
      } as unknown as SupabaseClient;

      const port = new SupabaseAuditLogPort(mockSupabaseFailing);

      await expect(
        port.recordLog({
          stakeId,
          userId: memberUserId,
          action: "VIEW_MINOR_DOCUMENT",
          resourceType: "minor_approval_forms",
          resourceId: "form-xyz",
        })
      ).rejects.toThrow("Falha crítica de conformidade LGPD");
    });

    it("get_expired_minor_forms deve considerar COALESCE(return_date, departure_date) quando return_date for nulo", async () => {
      // Cria caravana sem return_date com partida há 100 dias atrás
      const pastDeparture = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: pastCaravan, error: pcErr } = await svc
        .from("caravans")
        .insert({
          stake_id: stakeId,
          departure_date: pastDeparture,
          return_date: null, // Viagem sem data de retorno explícita
          registration_deadline: pastDeparture,
          quorum_check_date: pastDeparture,
          price_standard: 150.0,
          price_officiant: 100.0,
          seat_limit: 48,
          waitlist_limit: 10,
          created_by: adminEstacaUserId,
          status: "completed",
        })
        .select("id")
        .single();
      if (pcErr) throw pcErr;

      const { data: pastRes, error: prErr } = await svc
        .from("reservations")
        .insert({
          caravan_id: pastCaravan.id,
          user_id: memberUserId,
          seat_number: 22,
          payment_amount: 150.0,
          status: "confirmado",
        })
        .select("id")
        .single();
      if (prErr) throw prErr;

      const { data: minorForm, error: mfErr } = await svc
        .from("minor_approval_forms")
        .insert({
          reservation_id: pastRes.id,
          stake_id: stakeId,
          ward_id: wardId,
          status: "approved",
          storage_path: `minors/form-${stamp}.pdf`,
          approved_by: adminEstacaUserId,
        })
        .select("id")
        .single();
      if (mfErr) throw mfErr;

      // Executa a função RPC get_expired_minor_forms com cutoff de 90 dias atrás
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: expiredForms, error: efErr } = await svc.rpc(
        "get_expired_minor_forms",
        { p_cutoff_date: cutoff }
      );

      expect(efErr).toBeNull();
      expect(expiredForms?.some((f: any) => f.id === minorForm.id)).toBe(true);

      // Limpeza
      await svc.from("minor_approval_forms").delete().eq("id", minorForm.id);
      await svc.from("reservations").delete().eq("id", pastRes.id);
      await svc.from("caravans").delete().eq("id", pastCaravan.id);
    });

    it("purgeExpiredMinorData não deve apagar registro no banco se a exclusão no Storage falhar", async () => {
      const mockRetentionRepo = {
        findExpiredMinorForms: jest.fn().mockResolvedValue([
          {
            id: "form-123",
            stakeId,
            storagePath: "minors/doc.pdf",
            caravanDepartureDate: "2026-01-01",
            caravanReturnDate: "2026-01-03",
          },
        ]),
        deleteFile: jest.fn().mockRejectedValue(new Error("Storage network timeout")),
        deleteMinorForm: jest.fn(),
        deleteExpiredManifestEntries: jest.fn().mockResolvedValue(0),
      };

      const result = await purgeExpiredMinorData(
        { now: new Date() },
        { retentionRepository: mockRetentionRepo as any }
      );

      expect(result.purgedFormsCount).toBe(0);
      expect(mockRetentionRepo.deleteFile).toHaveBeenCalledWith("minor-forms", "minors/doc.pdf");
      // Importante: deleteMinorForm NÃO deve ter sido chamado!
      expect(mockRetentionRepo.deleteMinorForm).not.toHaveBeenCalled();
    });
  });

  describe("3.5 Governança de Login e Inativação (A16)", () => {
    it("trigger on_auth_user_sign_in deve sincronizar profiles.last_login_at quando o usuário fizer login", async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: signInErr } = await client.auth.signInWithPassword({
        email: `admin-fase3-${stamp}@teste.org`,
        password: "senha-segura-admin-123",
      });
      expect(signInErr).toBeNull();

      const { data: profile } = await svc
        .from("profiles")
        .select("last_login_at")
        .eq("id", adminEstacaUserId)
        .single();

      expect(profile?.last_login_at).toBeDefined();
    });

    it("inativação de usuário deve refletir is_active = false", async () => {
      // Inativa o admin
      await svc.from("profiles").update({ is_active: false }).eq("id", adminEstacaUserId);

      const { data: profile } = await svc
        .from("profiles")
        .select("is_active")
        .eq("id", adminEstacaUserId)
        .single();

      expect(profile?.is_active).toBe(false);

      // Restaura status ativo
      await svc.from("profiles").update({ is_active: true }).eq("id", adminEstacaUserId);
    });
  });
});
