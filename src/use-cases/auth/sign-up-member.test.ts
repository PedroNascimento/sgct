/**
 * TDD: Testes para signUpMember (T001.1)
 * RED phase — Artigo IV da Constituição.
 */

import { signUpMember } from "./sign-up-member";
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

describe("signUpMember (T001.1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validPayload = {
    email: "membro@natal.org",
    password: "senha-segura-123",
    fullName: "Membro da Silva",
    cpf: "12345678901",
    birthDate: "1995-05-20",
    sexo: "masculino" as const,
    wardId: "11111111-1111-1111-1111-111111111111",
  };

  const STAKE_NATAL_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_MOCK = {
    id: validPayload.wardId,
    stake_id: STAKE_NATAL_ID,
    name: "Ala Candelária",
    created_at: new Date().toISOString(),
  };

  it("cria profile com stake_id derivado da ward_id (nunca do input direto)", async () => {
    mockWardRepository.findById.mockResolvedValueOnce(WARD_MOCK);
    mockAuthPort.signUp.mockResolvedValueOnce({ userId: "user-uuid-123" });
    mockProfileRepository.insert.mockImplementationOnce(async (data) => ({
      ...data,
      is_minor: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }));

    const result = await signUpMember(
      validPayload,
      {
        authPort: mockAuthPort,
        wardRepository: mockWardRepository,
        profileRepository: mockProfileRepository,
      },
      STAKE_NATAL_ID
    );

    expect(result.id).toBe("user-uuid-123");
    expect(result.stake_id).toBe(STAKE_NATAL_ID);
    expect(result.ward_id).toBe(validPayload.wardId);
    expect(result.role).toBe("member");

    // Confirma que profileRepository.insert recebeu o stake_id derivado da Ward
    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stake_id: STAKE_NATAL_ID,
        ward_id: validPayload.wardId,
        cpf: validPayload.cpf,
        role: "member",
      })
    );
  });

  it("rejeita cadastro se a Ala não for encontrada", async () => {
    mockWardRepository.findById.mockResolvedValueOnce(null);

    await expect(
      signUpMember(validPayload, {
        authPort: mockAuthPort,
        wardRepository: mockWardRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Ala informada não foi encontrada.");

    expect(mockAuthPort.signUp).not.toHaveBeenCalled();
    expect(mockProfileRepository.insert).not.toHaveBeenCalled();
  });

  it("rejeita cadastro se a Ala pertencer a uma Estaca diferente do contexto da rota", async () => {
    const STAKE_OUTRA_ID = "00000000-0000-0000-0000-000000000002";
    mockWardRepository.findById.mockResolvedValueOnce({
      ...WARD_MOCK,
      stake_id: STAKE_OUTRA_ID, // pertence a outra Estaca
    });

    await expect(
      signUpMember(
        validPayload,
        {
          authPort: mockAuthPort,
          wardRepository: mockWardRepository,
          profileRepository: mockProfileRepository,
        },
        STAKE_NATAL_ID // rota atual espera STAKE_NATAL_ID
      )
    ).rejects.toThrow("A Ala selecionada não pertence a esta Estaca.");

    expect(mockAuthPort.signUp).not.toHaveBeenCalled();
  });
});
