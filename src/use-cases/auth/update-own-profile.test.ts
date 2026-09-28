import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/tenant";
import { updateOwnProfile } from "./update-own-profile";

const profile: Profile = {
  id: "10000000-0000-4000-8000-000000000001",
  stake_id: "20000000-0000-4000-8000-000000000001",
  ward_id: "30000000-0000-4000-8000-000000000001",
  full_name: "Nome Antigo",
  cpf: null,
  birth_date: "1990-01-01",
  phone: null,
  sexo: "masculino",
  role: "member",
  home_stake_name: null,
  home_ward_name: null,
  is_minor: false,
  guardian_id: null,
  is_active: true,
  last_login_at: null,
  created_at: "2026-01-01T00:00:00Z",
};

const repository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  updateOwnContact: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("updateOwnProfile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("atualiza somente dados pessoais do usuário autenticado", async () => {
    repository.findById.mockResolvedValue(profile);
    repository.updateOwnContact.mockResolvedValue({
      ...profile,
      full_name: "Nome Atualizado",
      cpf: "12345678900",
      phone: "84999999999",
    });

    const result = await updateOwnProfile(
      {
        fullName: "Nome Atualizado",
        cpf: "12345678900",
        phone: "84999999999",
        sexo: "masculino",
      },
      profile.id,
      repository
    );

    expect(repository.updateOwnContact).toHaveBeenCalledWith(profile.id, {
      full_name: "Nome Atualizado",
      cpf: "12345678900",
      phone: "84999999999",
      sexo: "masculino",
    });
    expect(result.cpf).toBe("12345678900");
  });

  it("recusa usuário inativo", async () => {
    repository.findById.mockResolvedValue({ ...profile, is_active: false });

    await expect(
      updateOwnProfile(
        {
          fullName: "Nome Atualizado",
          cpf: "12345678900",
          phone: "84999999999",
          sexo: "masculino",
        },
        profile.id,
        repository
      )
    ).rejects.toThrow("Perfil não encontrado ou inativo.");
  });
});
