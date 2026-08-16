/**
 * TDD — Testes dos use-cases createStake e createBootstrapAdminEstaca (T000.17, T000.22)
 * Escritos antes da implementação (RED phase — Artigo IV da Constituição).
 */

import { createStake } from "./create-stake";
import { createBootstrapAdminEstaca } from "./create-bootstrap-admin-estaca";

const mockStakeRepository = {
  findBySlug: jest.fn(),
  insert: jest.fn(),
};

const mockAuthAdmin = {
  createUser: jest.fn(),
};

const mockProfileRepository = {
  insert: jest.fn(),
};

describe("createStake", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cria uma Stake com slug válido", async () => {
    mockStakeRepository.findBySlug.mockResolvedValueOnce(null); // slug não existe ainda
    const newStake = {
      id: "uuid-new",
      name: "Estaca Recife",
      slug: "recife",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockStakeRepository.insert.mockResolvedValueOnce(newStake);

    const result = await createStake(
      { name: "Estaca Recife", slug: "recife" },
      mockStakeRepository
    );

    expect(result).toEqual(newStake);
    expect(mockStakeRepository.findBySlug).toHaveBeenCalledWith("recife");
    expect(mockStakeRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Estaca Recife", slug: "recife" })
    );
  });

  it("rejeita com erro claro quando o slug já existe (T000.22)", async () => {
    const existingStake = {
      id: "uuid-exists",
      name: "Estaca Natal",
      slug: "natal",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockStakeRepository.findBySlug.mockResolvedValueOnce(existingStake);

    await expect(
      createStake({ name: "Outra Natal", slug: "natal" }, mockStakeRepository)
    ).rejects.toThrow("Já existe uma Estaca com o slug 'natal'.");

    expect(mockStakeRepository.insert).not.toHaveBeenCalled();
  });

  it("rejeita slug com caracteres inválidos", async () => {
    await expect(
      createStake({ name: "Estaca Inválida", slug: "Natal RN" }, mockStakeRepository)
    ).rejects.toThrow();

    expect(mockStakeRepository.findBySlug).not.toHaveBeenCalled();
  });

  it("rejeita slug vazio", async () => {
    await expect(
      createStake({ name: "Estaca Sem Slug", slug: "" }, mockStakeRepository)
    ).rejects.toThrow();
  });
});

describe("createBootstrapAdminEstaca", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cria usuário + profile de admin_estaca para uma Stake existente", async () => {
    const STAKE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const USER_UUID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
    const createdUser = { id: USER_UUID };
    const createdProfile = {
      id: USER_UUID,
      stake_id: STAKE_UUID,
      full_name: "João Silva",
      role: "admin_estaca",
    };

    mockAuthAdmin.createUser.mockResolvedValueOnce({ data: { user: createdUser }, error: null });
    mockProfileRepository.insert.mockResolvedValueOnce(createdProfile);

    const result = await createBootstrapAdminEstaca(
      {
        stakeId: STAKE_UUID,
        email: "joao@estaca.org",
        fullName: "João Silva",
        password: "senha-forte-123",
        birthDate: "1980-01-01",
      },
      mockAuthAdmin,
      mockProfileRepository
    );

    expect(result).toEqual(createdProfile);
    expect(mockAuthAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "joao@estaca.org",
        email_confirm: true,
      })
    );
    expect(mockProfileRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: USER_UUID,
        stake_id: STAKE_UUID,
        role: "admin_estaca",
        full_name: "João Silva",
      })
    );
  });

  it("lança erro se a criação do usuário no Auth falhar", async () => {
    const STAKE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockAuthAdmin.createUser.mockResolvedValueOnce({
      data: null,
      error: new Error("Email já em uso"),
    });

    await expect(
      createBootstrapAdminEstaca(
        {
          stakeId: STAKE_UUID,
          email: "duplicado@estaca.org",
          fullName: "Maria Silva",
          password: "senha-forte-123",
          birthDate: "1985-05-15",
        },
        mockAuthAdmin,
        mockProfileRepository
      )
    ).rejects.toThrow("Email já em uso");

    expect(mockProfileRepository.insert).not.toHaveBeenCalled();
  });
});
