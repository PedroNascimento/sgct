/**
 * TDD: Testes para createWardAdmin (T001.6)
 * RED phase — Artigo IV da Constituição.
 */

import { createWardAdmin } from "./create-ward-admin";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

const mockAuthPort: jest.Mocked<AuthPort> = {
  signUp: jest.fn(),
};

const mockWardRepository: jest.Mocked<WardRepository> = {
  findById: jest.fn(),
  findByStakeId: jest.fn(),
};

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("createWardAdmin (T001.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
  const STAKE_B_ID = "00000000-0000-0000-0000-000000000002";
  const ADMIN_ESTACA_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const WARD_A_ID = "11111111-1111-1111-1111-111111111111";
  const WARD_B_ID = "22222222-2222-2222-2222-222222222222";

  const adminEstacaAProfile = {
    id: ADMIN_ESTACA_A_ID,
    stake_id: STAKE_A_ID,
    role: "admin_estaca" as const,
    full_name: "Líder Estaca A",
    birth_date: "1980-01-01",
    is_active: true,
    is_minor: false,
    ward_id: null,
    cpf: null,
    phone: null,
    sexo: "masculino" as const,
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: null,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  const payload = {
    wardId: WARD_B_ID, // Tentativa de criar admin para Ala da Estaca B!
    email: "admin.ala@teste.org",
    fullName: "Admin Ala Novo",
    password: "senha-segura-123",
    birthDate: "1985-04-10",
  };

  it("rejeita quando Admin Estaca da Estaca A tenta criar admin para ward da Estaca B (T001.6)", async () => {
    // Admin pertence à Estaca A
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaAProfile);

    // Ward B pertence à Estaca B
    mockWardRepository.findById.mockResolvedValueOnce({
      id: WARD_B_ID,
      stake_id: STAKE_B_ID,
      name: "Ala da Estaca B",
      created_at: new Date().toISOString(),
    });

    await expect(
      createWardAdmin(payload, ADMIN_ESTACA_A_ID, {
        authPort: mockAuthPort,
        wardRepository: mockWardRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("A Ala informada não pertence à sua Estaca.");

    expect(mockAuthPort.signUp).not.toHaveBeenCalled();
    expect(mockProfileRepository.insert).not.toHaveBeenCalled();
  });

  it("cria admin_ala com sucesso quando a Ala pertence à mesma Estaca", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaAProfile);

    // Ward A pertence à Estaca A (mesma do Admin)
    mockWardRepository.findById.mockResolvedValueOnce({
      id: WARD_A_ID,
      stake_id: STAKE_A_ID,
      name: "Ala da Estaca A",
      created_at: new Date().toISOString(),
    });

    mockAuthPort.signUp.mockResolvedValueOnce({ userId: "new-ward-admin-id" });
    mockProfileRepository.insert.mockImplementationOnce(async (data) => ({
      ...data,
      is_minor: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }));

    const result = await createWardAdmin(
      { ...payload, wardId: WARD_A_ID },
      ADMIN_ESTACA_A_ID,
      {
        authPort: mockAuthPort,
        wardRepository: mockWardRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.id).toBe("new-ward-admin-id");
    expect(result.role).toBe("admin_ala");
    expect(result.stake_id).toBe(STAKE_A_ID);
    expect(result.ward_id).toBe(WARD_A_ID);

    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-ward-admin-id",
        role: "admin_ala",
        stake_id: STAKE_A_ID,
        ward_id: WARD_A_ID,
      })
    );
  });

  it("rejeita operação se o usuário executor não for admin_estaca", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...adminEstacaAProfile,
      role: "member", // usuário comum tentando criar admin de ala
    });

    await expect(
      createWardAdmin(
        { ...payload, wardId: WARD_A_ID },
        ADMIN_ESTACA_A_ID,
        {
          authPort: mockAuthPort,
          wardRepository: mockWardRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem cadastrar administradores de Ala.");

    expect(mockAuthPort.signUp).not.toHaveBeenCalled();
  });
});
