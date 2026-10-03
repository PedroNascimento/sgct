import { createWard } from "./create-ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/profile";
import type { Ward } from "@/domain/types/ward";

describe("createWard Use-Case (TDD)", () => {
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

  beforeEach(() => {
    mockWardRepo = {
      findById: jest.fn(),
      findByStakeId: jest.fn(),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((stakeId, name) =>
        Promise.resolve({
          id: "ward-new-id",
          stake_id: stakeId,
          name,
          created_at: new Date().toISOString(),
        } as Ward)
      ),
      update: jest.fn(),
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

  it("cria uma nova Ala com sucesso quando dados são válidos", async () => {
    const result = await createWard(
      { name: "Ala Neópolis" },
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(result.id).toBe("ward-new-id");
    expect(result.name).toBe("Ala Neópolis");
    expect(result.stake_id).toBe(adminProfile.stake_id);
    expect(mockWardRepo.create).toHaveBeenCalledWith(adminProfile.stake_id, "Ala Neópolis");
  });

  it("rejeita criação quando o usuário não é admin_estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      role: "member",
    });

    await expect(
      createWard(
        { name: "Ala Teste" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem cadastrar Alas.");
  });

  it("rejeita criação quando o admin está inativo", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      is_active: false,
    });

    await expect(
      createWard(
        { name: "Ala Teste" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem cadastrar Alas.");
  });

  it("rejeita nome de Ala muito curto (< 2 caracteres)", async () => {
    await expect(
      createWard(
        { name: "A" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("O nome da Ala deve ter no mínimo 2 caracteres.");
  });

  it("rejeita quando já existe Ala com o mesmo nome na mesma Estaca", async () => {
    mockWardRepo.findByName.mockResolvedValueOnce({
      id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      stake_id: adminProfile.stake_id!,
      name: "Ala Candelária",
      created_at: new Date().toISOString(),
    });

    await expect(
      createWard(
        { name: "Ala Candelária" },
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Já existe uma Ala com este nome nesta Estaca.");
  });
});

