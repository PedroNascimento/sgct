import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { signQrToken, verifyQrToken } from "@/use-cases/checkin/qr-token-crypto";
import { SupabaseManifestDataProvider } from "@/infrastructure/supabase/supabase-manifest-data-provider";
import { GeneratePassengerManifest } from "@/use-cases/checkin/generate-passenger-manifest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

describe("Auditoria Fase 2 — Fechamento de Jornadas Reais e Autonomia Funcional", () => {
  jest.setTimeout(30000);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let leaderClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let otherMemberClient: SupabaseClient;

  let stakeId = "";
  let wardId = "";
  let caravanId = "";
  let leaderUserId = "";
  let memberUserId = "";
  let otherMemberUserId = "";
  let reservationId = "";

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    // 1. Criar Estaca e Ala
    const { data: stake, error: stakeErr } = await svc
      .from("stakes")
      .insert({ name: `Estaca Fase2 ${stamp}`, slug: `fase2-stake-${stamp}` })
      .select("id")
      .single();
    if (stakeErr) throw stakeErr;
    stakeId = stake.id;

    const { data: ward, error: wardErr } = await svc
      .from("wards")
      .insert({ stake_id: stakeId, name: `Ala Fase2 ${stamp}` })
      .select("id")
      .single();
    if (wardErr) throw wardErr;
    wardId = ward.id;

    // 2. Criar Líder da Caravana
    const leaderEmail = `leader-${stamp}@teste.org`;
    const { data: leaderAuth, error: leaderAuthErr } = await svc.auth.admin.createUser({
      email: leaderEmail,
      password: "senha-segura-leader-123",
      email_confirm: true,
      user_metadata: { role: "member", stake_id: stakeId, ward_id: wardId },
    });
    if (leaderAuthErr) throw leaderAuthErr;
    leaderUserId = leaderAuth.user.id;

    await svc.from("profiles").upsert({
      id: leaderUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: `Líder Caravana ${stamp}`,
      birth_date: "1980-01-01",
      phone: "(84) 99999-0001",
      role: "member",
      is_active: true,
    });

    leaderClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await leaderClient.auth.signInWithPassword({
      email: leaderEmail,
      password: "senha-segura-leader-123",
    });

    // 3. Criar Membro Titular da Reserva
    const memberEmail = `member-${stamp}@teste.org`;
    const { data: memberAuth, error: memberAuthErr } = await svc.auth.admin.createUser({
      email: memberEmail,
      password: "senha-segura-member-123",
      email_confirm: true,
      user_metadata: { role: "member", stake_id: stakeId, ward_id: wardId },
    });
    if (memberAuthErr) throw memberAuthErr;
    memberUserId = memberAuth.user.id;

    await svc.from("profiles").upsert({
      id: memberUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: `Membro Titular ${stamp}`,
      birth_date: "1990-01-01",
      phone: "(84) 99999-0002",
      role: "member",
      is_active: true,
    });

    memberClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await memberClient.auth.signInWithPassword({
      email: memberEmail,
      password: "senha-segura-member-123",
    });

    // 4. Criar Outro Membro (para testes de violação de RLS)
    const otherEmail = `other-${stamp}@teste.org`;
    const { data: otherAuth, error: otherAuthErr } = await svc.auth.admin.createUser({
      email: otherEmail,
      password: "senha-segura-other-123",
      email_confirm: true,
      user_metadata: { role: "member", stake_id: stakeId, ward_id: wardId },
    });
    if (otherAuthErr) throw otherAuthErr;
    otherMemberUserId = otherAuth.user.id;

    await svc.from("profiles").upsert({
      id: otherMemberUserId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: `Outro Membro ${stamp}`,
      birth_date: "1995-01-01",
      phone: "(84) 99999-0003",
      role: "member",
      is_active: true,
    });

    otherMemberClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await otherMemberClient.auth.signInWithPassword({
      email: otherEmail,
      password: "senha-segura-other-123",
    });

    // 5. Criar Caravana vinculada ao Líder
    const dep = new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0];
    const deadline = new Date(Date.now() + 86400000 * 15).toISOString().split("T")[0];
    const quorumDate = new Date(Date.now() + 86400000 * 20).toISOString().split("T")[0];

    const { data: caravan, error: caravanErr } = await svc
      .from("caravans")
      .insert({
        stake_id: stakeId,
        departure_date: dep,
        registration_deadline: deadline,
        quorum_check_date: quorumDate,
        price_standard: 150.0,
        price_officiant: 120.0,
        seat_limit: 48,
        waitlist_limit: 10,
        min_quorum: 40,
        status: "open",
        created_by: leaderUserId,
        caravan_leader_id: leaderUserId,
      })
      .select("id")
      .single();
    if (caravanErr) throw caravanErr;
    caravanId = caravan.id;

    // 6. Criar Reserva confirmada para o Membro Titular
    const { data: res, error: resErr } = await svc
      .from("reservations")
      .insert({
        stake_id: stakeId,
        ward_id: wardId,
        caravan_id: caravanId,
        user_id: memberUserId,
        seat_number: 15,
        status: "confirmado",
        payment_amount: 120,
        category: "standard",
        participant_type: "adulto",
        funding_source: "membro",
      })
      .select("id")
      .single();
    if (resErr) throw resErr;
    reservationId = res.id;
  });

  afterAll(async () => {
    if (stakeId) {
      await svc.from("stakes").delete().eq("id", stakeId);
    }
    if (leaderUserId) {
      await svc.auth.admin.deleteUser(leaderUserId).catch(() => {});
    }
    if (memberUserId) {
      await svc.auth.admin.deleteUser(memberUserId).catch(() => {});
    }
    if (otherMemberUserId) {
      await svc.auth.admin.deleteUser(otherMemberUserId).catch(() => {});
    }
  });

  // --- A03: Upload de Termo de Menor por Membro Titular ---
  describe("A03 — Upload de Termo de Menor com Permissão de Membro Titular", () => {
    it("permite que o membro titular da reserva faça INSERT do formulário de menor", async () => {
      const { data, error } = await memberClient
        .from("minor_approval_forms")
        .insert({
          reservation_id: reservationId,
          storage_path: `${stakeId}/${wardId}/${reservationId}/termo.pdf`,
          status: "pending",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.reservation_id).toBe(reservationId);
    });

    it("bloqueia INSERT de formulário de menor feito por outro usuário que não é dono da reserva", async () => {
      const { data, error } = await otherMemberClient
        .from("minor_approval_forms")
        .insert({
          reservation_id: reservationId,
          storage_path: `${stakeId}/${wardId}/${reservationId}/intruso.pdf`,
          status: "pending",
        })
        .select();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  // --- A10: Segurança do Token QR ---
  describe("A10 — Token QR com Expiração Obrigatória e Sem Segredo Público", () => {
    it("rejeita verificação de token se exp estiver ausente ou inválido", () => {
      const tokenSemExp = signQrToken(
        {
          reservationId,
          stakeId,
          caravanId,
          seatNumber: 15,
        } as any,
        "chave-secreta-forte-32-caracteres"
      );

      const verification = verifyQrToken(tokenSemExp, "chave-secreta-forte-32-caracteres");
      expect(verification.valid).toBe(false);
      expect(verification.error).toMatch(/expiração|exp/i);
    });

    it("valida com sucesso token assinado com exp numérico futuro", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 7200;
      const validToken = signQrToken(
        {
          reservationId,
          stakeId,
          caravanId,
          seatNumber: 15,
          exp: futureExp,
        },
        "chave-secreta-forte-32-caracteres"
      );

      const verification = verifyQrToken(validToken, "chave-secreta-forte-32-caracteres");
      expect(verification.valid).toBe(true);
      expect(verification.payload?.reservationId).toBe(reservationId);
    });
  });

  // --- A04: Abatimento Real e Persistido de Créditos ---
  describe("A04 — Aplicação Atômica e Persistida de Créditos", () => {
    it("abate o saldo real no banco de dados e atualiza status para used", async () => {
      // 1. Criar reserva pendente no valor de 100
      const { data: resPendente } = await svc
        .from("reservations")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          caravan_id: caravanId,
          user_id: memberUserId,
          seat_number: 16,
          status: "pendente",
          payment_amount: 100,
          category: "standard",
          participant_type: "adulto",
          funding_source: "membro",
        })
        .select("id")
        .single();

      // 2. Criar crédito ativo de 40 para o membro
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      const { data: credit } = await svc
        .from("credit_ledger")
        .insert({
          stake_id: stakeId,
          ward_id: wardId,
          user_id: memberUserId,
          amount: 40,
          source: "caravan_cancelled",
          status: "active",
          expires_at: expiresAt.toISOString(),
        })
        .select("id")
        .single();

      // 3. Executar a função RPC atômica criada na migration 000008
      const { data: rpcResult, error: rpcErr } = await memberClient.rpc(
        "apply_credit_to_reservation",
        {
          p_credit_id: credit!.id,
          p_reservation_id: resPendente!.id,
          p_user_id: memberUserId,
        }
      );

      expect(rpcErr).toBeNull();
      expect(Number(rpcResult.reservation.payment_amount)).toBe(60);
      expect(rpcResult.reservation.status).toBe("pendente");

      // 4. Verificar no banco que a reserva teve o payment_amount PERSISTIDO em 60
      const { data: verifiedRes } = await svc
        .from("reservations")
        .select("payment_amount, status")
        .eq("id", resPendente!.id)
        .single();

      expect(Number(verifiedRes?.payment_amount)).toBe(60);

      // 5. Verificar que o crédito está marcado como used
      const { data: verifiedCredit } = await svc
        .from("credit_ledger")
        .select("status, used_at")
        .eq("id", credit!.id)
        .single();

      expect(verifiedCredit?.status).toBe("used");
      expect(verifiedCredit?.used_at).not.toBeNull();
    });
  });

  // --- A07: Permuta sem Duplicação e sem ano 1900 ---
  describe("A07 — Permuta Real de Assento no Manifesto", () => {
    it("substitui titularidade no mesmo assento físico sem criar linha de lap child 1900", async () => {
      // 1. Atualizar a reserva com os dados da permuta
      const { error: updateErr } = await svc
        .from("reservations")
        .update({
          transferred_to_name: "Novo Passageiro Transferido",
          transferred_to_document: "999.888.777-66",
        })
        .eq("id", reservationId);

      expect(updateErr).toBeNull();

      // 2. Verificar que NENHUM registro com ano 1900 foi inserido em passenger_manifest_entries para esta reserva
      const { data: fakeEntries } = await svc
        .from("passenger_manifest_entries")
        .select("id")
        .eq("reservation_id", reservationId)
        .eq("birth_date", "1900-01-01");

      expect(fakeEntries?.length ?? 0).toBe(0);

      // 3. Gerar manifesto e verificar que o assento 15 exibe o novo titular
      const provider = new SupabaseManifestDataProvider(svc);
      const generator = new GeneratePassengerManifest(provider);
      const manifestRows = await generator.execute(caravanId);

      const seat15 = manifestRows.find((r) => r.seatNumber === 15);
      expect(seat15).toBeDefined();
      expect(seat15?.passengerName).toBe("Novo Passageiro Transferido");
      expect(seat15?.document).toBe("999.888.777-66");

      // O número de passageiros não deve ter sido duplicado para o assento 15
      const seat15Rows = manifestRows.filter((r) => r.seatNumber === 15);
      expect(seat15Rows.length).toBe(1);
    });
  });

  // --- A09: Validação de Liderança no Check-in ---
  describe("A09 — Restrição de Check-in para o Líder da Caravana", () => {
    it("permite que o líder designado da caravana insira o check-in", async () => {
      const { data, error } = await leaderClient
        .from("checkins")
        .insert({
          reservation_id: reservationId,
          direction: "ida",
          checked_in_by: leaderUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.reservation_id).toBe(reservationId);
    });

    it("rejeita INSERT em checkins feito por usuário comum que não é o líder da caravana", async () => {
      const { data, error } = await otherMemberClient
        .from("checkins")
        .insert({
          reservation_id: reservationId,
          direction: "volta",
          checked_in_by: otherMemberUserId,
        })
        .select();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});
