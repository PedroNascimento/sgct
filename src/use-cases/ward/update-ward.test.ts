import { updateWard } from "./update-ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/profile";
import type { Ward } from "@/domain/types/ward";

describe("updateWard Use-Case (TDD)", () => {
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
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockWardRepo = {
      findById: jest.fn().mockResolvedValue(existingWard),
      findByStakeId: jest.fn(),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn().mockImplementation((id, name) =>
        Promise.resolve({
          ...existingWard,
          id,
          name,
        } as Ward)
      ),
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

  it("atualiza o nome da Ala com sucesso", async () => {
    const result = await updateWard(
      { wardId: existingWard.id, name: "Ala Candelária Renovada" },
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(result.name).toBe("Ala Candelária Renovada");
    expect(mockWardRepo.update).toHaveBeenCalledWith(existingWard.id, "Ala Candelária Renovada");
  });

  it("rejeita atualização quando o usuário não é admin_estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      role: "admin_ala",
    });

    await expect(
      updateWard(
        { wardId: existingWard.id, name: "Novo Nome" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem editar Alas.");
  });

  it("rejeita quando a Ala não pertence à Estaca do admin", async () => {
    mockWardRepo.findById.mockResolvedValueOnce({
      ...existingWard,
      stake_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    });

    await expect(
      updateWard(
        { wardId: existingWard.id, name: "Novo Nome" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Ala não encontrada ou não pertence à sua Estaca.");
  });

  it("rejeita quando outra Ala na mesma Estaca já possui o novo nome", async () => {
    mockWardRepo.findByName.mockResolvedValueOnce({
      id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
      stake_id: adminProfile.stake_id!,
      name: "Ala Existente",
      created_at: new Date().toISOString(),
    });

    await expect(
      updateWard(
        { wardId: existingWard.id, name: "Ala Existente" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Já existe uma Ala com este nome nesta Estaca.");
  });

  it("permite manter o mesmo nome da própria Ala", async () => {
    mockWardRepo.findByName.mockResolvedValueOnce({
      id: existingWard.id,
      stake_id: adminProfile.stake_id!,
      name: "Ala Candelária",
      created_at: new Date().toISOString(),
    });

    const result = await updateWard(
      { wardId: existingWard.id, name: "Ala Candelária" },
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(result.name).toBe("Ala Candelária");
  });
});
