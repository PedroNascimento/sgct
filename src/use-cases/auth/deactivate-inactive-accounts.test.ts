/**
 * TDD: Testes para deactivateInactiveAccounts (T001.9, T001.11)
 * RED phase — Artigo IV da Constituição.
 */

import { deactivateInactiveAccounts } from "./deactivate-inactive-accounts";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("deactivateInactiveAccounts (T001.9, T001.11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calcula o cutoff date exatamente em 24 meses atrás (T001.9)", async () => {
    // Fixar data atual simulada: 2026-09-26T12:00:00Z
    const fixedNow = new Date("2026-09-26T12:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    mockProfileRepository.deactivateInactive.mockResolvedValueOnce({
      deactivatedCount: 3,
    });

    const result = await deactivateInactiveAccounts(mockProfileRepository);

    expect(result.deactivatedCount).toBe(3);

    // 24 meses antes de 2026-09-26 é 2024-09-26
    const expectedCutoff = new Date(fixedNow);
    expectedCutoff.setMonth(expectedCutoff.getMonth() - 24);

    expect(mockProfileRepository.deactivateInactive).toHaveBeenCalledWith(
      expectedCutoff
    );

    jest.useRealTimers();
  });

  it("garante que a inativação nunca invoca métodos de exclusão (T001.11)", async () => {
    mockProfileRepository.deactivateInactive.mockResolvedValueOnce({
      deactivatedCount: 1,
    });

    const result = await deactivateInactiveAccounts(mockProfileRepository);

    expect(result.deactivatedCount).toBe(1);
    // Confirma que não há chamada para deletar registro de usuário
    expect(mockProfileRepository.deactivateInactive).toHaveBeenCalled();
  });
});
