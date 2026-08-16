/**
 * TDD — Teste do use-case resolveStakeFromSlug (T000.10)
 * Escrito antes da implementação (RED phase — Artigo IV da Constituição).
 */

import { resolveStakeFromSlug } from "./resolve-stake-from-slug";

// Mock do repositório de Estacas (a implementação concreta usa Supabase)
const mockRepository = {
  findBySlug: jest.fn(),
};

describe("resolveStakeFromSlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna a Stake quando o slug existe e está ativa", async () => {
    const expectedStake = {
      id: "uuid-123",
      name: "Estaca Natal",
      slug: "natal",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockRepository.findBySlug.mockResolvedValueOnce(expectedStake);

    const result = await resolveStakeFromSlug("natal", mockRepository);

    expect(result).toEqual(expectedStake);
    expect(mockRepository.findBySlug).toHaveBeenCalledWith("natal");
  });

  it("retorna null quando o slug não existe", async () => {
    mockRepository.findBySlug.mockResolvedValueOnce(null);

    const result = await resolveStakeFromSlug("slug-inexistente", mockRepository);

    expect(result).toBeNull();
  });

  it("retorna null quando a Stake existe mas está inativa (is_active = false)", async () => {
    const inactiveStake = {
      id: "uuid-456",
      name: "Estaca Inativa",
      slug: "inativa",
      is_active: false,
      created_at: new Date().toISOString(),
    };
    mockRepository.findBySlug.mockResolvedValueOnce(inactiveStake);

    const result = await resolveStakeFromSlug("inativa", mockRepository);

    expect(result).toBeNull();
  });

  it("lança erro quando o repositório falha inesperadamente", async () => {
    mockRepository.findBySlug.mockRejectedValueOnce(new Error("DB connection failed"));

    await expect(resolveStakeFromSlug("natal", mockRepository)).rejects.toThrow(
      "DB connection failed"
    );
  });
});
