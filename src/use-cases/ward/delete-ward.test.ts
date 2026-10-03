import { deleteWard } from "./delete-ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/profile";
import type { Ward } from "@/domain/types/ward";

describe("deleteWard Use-Case (TDD)", () => {
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
      toggleActive: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      hasAssociatedData: jest.fn().mockResolvedValue({
        hasMembers: false,
        hasReservations: false,
      }),
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

  it("exclui uma Ala sem vínculos com sucesso", async () => {
    await deleteWard(
      existingWard.id,
      adminProfile.id,
      { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
    );

    expect(mockWardRepo.delete).toHaveBeenCalledWith(existingWard.id);
  });

  it("bloqueia exclusão quando a Ala possui membros vinculados", async () => {
    mockWardRepo.hasAssociatedData.mockResolvedValueOnce({
      hasMembers: true,
      hasReservations: false,
    });

    await expect(
      deleteWard(
        existingWard.id,
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow(
      "Não é possível excluir esta Ala pois ela possui membros ou reservas associadas. Utilize a opção de inativar."
    );

    expect(mockWardRepo.delete).not.toHaveBeenCalled();
  });

  it("bloqueia exclusão quando a Ala possui reservas vinculadas", async () => {
    mockWardRepo.hasAssociatedData.mockResolvedValueOnce({
      hasMembers: false,
      hasReservations: true,
    });

    await expect(
      deleteWard(
        existingWard.id,
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow(
      "Não é possível excluir esta Ala pois ela possui membros ou reservas associadas. Utilize a opção de inativar."
    );

    expect(mockWardRepo.delete).not.toHaveBeenCalled();
  });

  it("rejeita exclusão quando o executor não é admin_estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      role: "admin_ala",
    });

    await expect(
      deleteWard(
        existingWard.id,
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem excluir Alas.");
  });

  it("rejeita exclusão quando a Ala não pertence à Estaca do admin", async () => {
    mockWardRepo.findById.mockResolvedValueOnce({
      ...existingWard,
      stake_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    });

    await expect(
      deleteWard(
        existingWard.id,
        adminProfile.id,
        { wardRepository: mockWardRepo, profileRepository: mockProfileRepo }
      )
    ).rejects.toThrow("Ala não encontrada ou não pertence à sua Estaca.");
  });
});
