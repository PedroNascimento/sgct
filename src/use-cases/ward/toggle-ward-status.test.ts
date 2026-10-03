import { toggleWardStatus } from "./toggle-ward-status";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/profile";
import type { Ward } from "@/domain/types/ward";

describe("toggleWardStatus Use-Case (TDD)", () => {
  let mockWardRepo: jest.Mocked<WardRepository>;
  let mockProfileRepo: jest.Mocked<ProfileRepository>;

  const adminProfile: Profile = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    stake_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    ward_id: null,
    full_name: "Admin Estaca",
    cpf: "12345678900",
    birth_date: "1980-01-01",
    phone: "84999999999",
    role: "admin_estaca",
    is_active: true,
    created_at: new Date().toISOString(),
    is_minor: false,
    sexo: "masculino",
  };

  const existingWard: Ward = {
    id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    stake_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    name: "Ala Candelária",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockWardRepo = {
      findById: jest.fn().mockResolvedValue(existingWard),
      findByStakeId: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn().mockImplementation((id, isActive) =>
        Promise.resolve({
          ...existingWard,
          id,
          is_active: isActive,
        } as Ward)
      ),
      delete: jest.fn(),
      hasAssociatedData: jest.fn(),
    };

    mockProfileRepo = {
      findById: jest.fn().mockResolvedValue(adminProfile),
      findByEmail: jest.fn(),
      findByCpf: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listMembersByWard: jest.fn(),
    };
  });

  it("inativa uma Ala ativa com sucesso", async () => {
    const result = await toggleWardStatus(
      { wardId: existingWard.id, isActive: false },
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(result.is_active).toBe(false);
    expect(mockWardRepo.toggleActive).toHaveBeenCalledWith(existingWard.id, false);
  });

  it("reativa uma Ala inativa com sucesso", async () => {
    mockWardRepo.findById.mockResolvedValueOnce({
      ...existingWard,
      is_active: false,
    });

    const result = await toggleWardStatus(
      { wardId: existingWard.id, isActive: true },
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(result.is_active).toBe(true);
    expect(mockWardRepo.toggleActive).toHaveBeenCalledWith(existingWard.id, true);
  });

  it("rejeita quando o executor não é admin_estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      role: "member",
    });

    await expect(
      toggleWardStatus(
        { wardId: existingWard.id, isActive: false },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem alterar o status de Alas.");
  });

  it("rejeita quando a Ala não pertence à Estaca do admin", async () => {
    mockWardRepo.findById.mockResolvedValueOnce({
      ...existingWard,
      stake_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    });

    await expect(
      toggleWardStatus(
        { wardId: existingWard.id, isActive: false },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Ala não encontrada ou não pertence à sua Estaca.");
  });
});
