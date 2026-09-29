/**
 * TDD: Testes para signUpMinor (T001.3)
 * RED phase — Artigo IV da Constituição.
 */

import { signUpMinor } from "./sign-up-minor";
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

describe("signUpMinor (T001.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";

  // Data de nascimento calculando jovem de 15 anos
  const now = new Date();
  const birthYear15 = now.getFullYear() - 15;
  const minorBirthDate = `${birthYear15}-06-15`;

  const validMinorPayload = {
    email: "jovem@natal.org",
    password: "senha-segura-123",
    fullName: "Jovem Santos",
    cpf: "12345678901",
    phone: "84999998888",
    birthDate: minorBirthDate,
    sexo: "feminino" as const,
    wardId: WARD_ID,
    parentalConsent: true as const,
  };

  const WARD_MOCK = {
    id: WARD_ID,
    stake_id: STAKE_ID,
    name: "Ala Tirol",
    created_at: new Date().toISOString(),
  };

  it("aceita cadastro de menor (12-17 anos) SEM guardianId (D07)", async () => {
    mockWardRepository.findById.mockResolvedValueOnce(WARD_MOCK);
    mockAuthPort.signUp.mockResolvedValueOnce({ userId: "minor-user-uuid" });
    mockProfileRepository.insert.mockImplementationOnce(async (data) => ({
      ...data,
      is_minor: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }));

    const result = await signUpMinor(validMinorPayload, {
      authPort: mockAuthPort,
      wardRepository: mockWardRepository,
      profileRepository: mockProfileRepository,
    });

    expect(result.id).toBe("minor-user-uuid");
    expect(result.stake_id).toBe(STAKE_ID);
    expect(result.ward_id).toBe(WARD_ID);
    expect(result.guardian_id).toBeNull();

    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        guardian_id: null,
        cpf: validMinorPayload.cpf,
        phone: validMinorPayload.phone,
        role: "member",
      })
    );
  });

  it("aceita cadastro com guardianId opcional quando fornecido", async () => {
    const GUARDIAN_ID = "22222222-2222-2222-2222-222222222222";
    mockWardRepository.findById.mockResolvedValueOnce(WARD_MOCK);
    mockProfileRepository.findById.mockResolvedValueOnce({
      id: GUARDIAN_ID,
      stake_id: STAKE_ID,
      full_name: "Pai Santos",
      birth_date: "1975-01-01",
      role: "member",
      is_minor: false,
      is_active: true,
      ward_id: WARD_ID,
      cpf: null,
      phone: null,
      sexo: "masculino",
      home_stake_name: null,
      home_ward_name: null,
      guardian_id: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
    });

    mockAuthPort.signUp.mockResolvedValueOnce({ userId: "minor-user-uuid" });
    mockProfileRepository.insert.mockImplementationOnce(async (data) => ({
      ...data,
      is_minor: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }));

    const result = await signUpMinor(
      {
        ...validMinorPayload,
        guardianId: GUARDIAN_ID,
      },
      {
        authPort: mockAuthPort,
        wardRepository: mockWardRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.guardian_id).toBe(GUARDIAN_ID);
    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        guardian_id: GUARDIAN_ID,
      })
    );
  });

  it("rejeita cadastro se o jovem tiver menos de 12 anos", async () => {
    const under12Year = now.getFullYear() - 10;
    const under12BirthDate = `${under12Year}-01-01`;

    await expect(
      signUpMinor(
        {
          ...validMinorPayload,
          birthDate: under12BirthDate,
        },
        {
          authPort: mockAuthPort,
          wardRepository: mockWardRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Cadastro próprio disponível apenas para jovens de 12 a 17 anos.");
  });

  it("rejeita cadastro se a pessoa tiver 18 anos ou mais", async () => {
    const adultYear = now.getFullYear() - 20;
    const adultBirthDate = `${adultYear}-01-01`;

    await expect(
      signUpMinor(
        {
          ...validMinorPayload,
          birthDate: adultBirthDate,
        },
        {
          authPort: mockAuthPort,
          wardRepository: mockWardRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Usuários com 18 anos ou mais devem utilizar o cadastro regular de membro.");
  });

  it("rejeita cadastro se o consentimento do responsável não for confirmado (Artigo VI)", async () => {
    await expect(
      signUpMinor(
        {
          ...validMinorPayload,
          parentalConsent: false as unknown as true,
        },
        {
          authPort: mockAuthPort,
          wardRepository: mockWardRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow();
  });
});
