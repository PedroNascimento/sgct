import { deactivateInactiveAccounts } from "./deactivate-inactive-accounts";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

describe("deactivateInactiveAccounts (T009.7 / US-009.4 / D14)", () => {
  let mockProfileRepo: jest.Mocked<ProfileRepository>;

  const baseDate = new Date("2026-10-21T10:00:00Z");

  beforeEach(() => {
    mockProfileRepo = {
      findById: jest.fn(),
      findByCpf: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByStake: jest.fn(),
      deactivateInactive: jest.fn().mockResolvedValue({ deactivatedCount: 3 }),
    };
  });

  it("inativa contas que completarem 24 meses sem login (D14)", async () => {
    const result = await deactivateInactiveAccounts(
      { profileRepository: mockProfileRepo },
      baseDate
    );

    expect(result.deactivatedCount).toBe(3);
    expect(mockProfileRepo.deactivateInactive).toHaveBeenCalledTimes(1);

    const calledCutoff: Date = mockProfileRepo.deactivateInactive.mock.calls[0][0];

    // Calcula diferença em meses: 2026-10 - 24 meses = 2024-10
    expect(calledCutoff.getFullYear()).toBe(2024);
    expect(calledCutoff.getMonth()).toBe(9); // outubro (0-indexed)
  });

  it("respeita limite de 24 meses exatos", async () => {
    await deactivateInactiveAccounts(
      { profileRepository: mockProfileRepo },
      baseDate
    );

    const calledCutoff: Date = mockProfileRepo.deactivateInactive.mock.calls[0][0];
    const diffMonths =
      (baseDate.getFullYear() - calledCutoff.getFullYear()) * 12 +
      (baseDate.getMonth() - calledCutoff.getMonth());

    expect(diffMonths).toBe(24);
  });
});
