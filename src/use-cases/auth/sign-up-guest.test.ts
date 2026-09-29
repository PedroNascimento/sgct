/**
 * TDD: Testes para signUpGuest (US-001.6 / D28)
 */

import { signUpGuest } from "./sign-up-guest";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

const mockAuthPort: jest.Mocked<AuthPort> = {
  signUp: jest.fn(),
};

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("signUpGuest (US-001.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const HOST_STAKE_ID = "00000000-0000-0000-0000-000000000001";

  const guestPayload = {
    email: "convidado@outraestaca.org",
    password: "senha-segura-123",
    fullName: "Convidado de Mossoró",
    cpf: "12345678901",
    phone: "84999998888",
    birthDate: "1990-08-10",
    sexo: "masculino" as const,
    homeStakeName: "Estaca Mossoró Brasil",
    homeWardName: "Ala Abolição",
  };

  it("cria profile com role='guest', ward_id=null e stake_id da Estaca anfitriã", async () => {
    mockAuthPort.signUp.mockResolvedValueOnce({ userId: "guest-user-uuid" });
    mockProfileRepository.insert.mockImplementationOnce(async (data) => ({
      ...data,
      is_minor: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }));

    const result = await signUpGuest(guestPayload, HOST_STAKE_ID, {
      authPort: mockAuthPort,
      profileRepository: mockProfileRepository,
    });

    expect(result.id).toBe("guest-user-uuid");
    expect(result.role).toBe("guest");
    expect(result.stake_id).toBe(HOST_STAKE_ID);
    expect(result.ward_id).toBeNull();
    expect(result.home_stake_name).toBe("Estaca Mossoró Brasil");
    expect(result.home_ward_name).toBe("Ala Abolição");

    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "guest",
        stake_id: HOST_STAKE_ID,
        ward_id: null,
        cpf: guestPayload.cpf,
        phone: guestPayload.phone,
        home_stake_name: "Estaca Mossoró Brasil",
        home_ward_name: "Ala Abolição",
      })
    );
  });
});
