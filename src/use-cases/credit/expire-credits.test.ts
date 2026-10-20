/**
 * Testes para expireCredits (T005.7).
 * Spec 005 / US-005.3
 *
 * Regras:
 * - Localiza créditos ativos cuja data de expiração foi atingida (data congelada).
 * - Transiciona o status de 'active' para 'expired'.
 * - Artigo IV: TDD obrigatório.
 */

import { expireCredits } from "./expire-credits";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { CreditLedgerEntry } from "@/domain/types/credit";

const mockCreditRepository: jest.Mocked<CreditRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findActiveByUserId: jest.fn(),
  findExpiredActive: jest.fn(),
  updateStatus: jest.fn(),
};

describe("expireCredits (T005.7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const USER_ID = "22222222-2222-2222-2222-222222222222";

  const activeCreditExpiredDate: CreditLedgerEntry = {
    id: "credit-uuid-1",
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    user_id: USER_ID,
    amount: 130,
    source: "waitlist_promotion",
    origin_reservation_id: "res-uuid-1",
    granted_by: null,
    reason: "Promoção da fila",
    expires_at: "2027-08-10T12:00:00.000Z",
    used_at: null,
    status: "active",
    created_at: "2026-08-10T12:00:00.000Z",
  };

  const anotherActiveCreditExpiredDate: CreditLedgerEntry = {
    id: "credit-uuid-2",
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    user_id: "33333333-3333-3333-3333-333333333333",
    amount: 117,
    source: "caravan_cancelled",
    origin_reservation_id: null,
    granted_by: null,
    reason: "Caravana cancelada",
    expires_at: "2027-08-10T11:59:59.000Z",
    used_at: null,
    status: "active",
    created_at: "2026-08-10T11:59:59.000Z",
  };

  it("expira todos os créditos ativos que atingiram o limite exato de 12 meses (data congelada)", async () => {
    // Data congelada após a data de expiração
    const frozenDate = "2027-08-10T12:00:00.000Z";

    mockCreditRepository.findExpiredActive.mockResolvedValueOnce([
      activeCreditExpiredDate,
      anotherActiveCreditExpiredDate,
    ]);

    mockCreditRepository.updateStatus.mockResolvedValueOnce({
      ...activeCreditExpiredDate,
      status: "expired",
    });
    mockCreditRepository.updateStatus.mockResolvedValueOnce({
      ...anotherActiveCreditExpiredDate,
      status: "expired",
    });

    const result = await expireCredits(
      { currentDate: frozenDate },
      { creditRepository: mockCreditRepository }
    );

    expect(mockCreditRepository.findExpiredActive).toHaveBeenCalledWith(frozenDate);
    expect(mockCreditRepository.updateStatus).toHaveBeenCalledWith("credit-uuid-1", "expired");
    expect(mockCreditRepository.updateStatus).toHaveBeenCalledWith("credit-uuid-2", "expired");

    expect(result.expiredCount).toBe(2);
    expect(result.expiredEntries).toHaveLength(2);
    expect(result.expiredEntries[0].status).toBe("expired");
  });

  it("retorna contagem 0 se nenhum crédito ativo estiver expirado", async () => {
    mockCreditRepository.findExpiredActive.mockResolvedValueOnce([]);

    const result = await expireCredits(
      { currentDate: "2026-12-01T00:00:00.000Z" },
      { creditRepository: mockCreditRepository }
    );

    expect(mockCreditRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.expiredCount).toBe(0);
    expect(result.expiredEntries).toHaveLength(0);
  });
});
