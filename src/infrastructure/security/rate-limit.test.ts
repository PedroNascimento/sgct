/**
 * Testes para o Rate Limiter de Criação de Reservas (T003.5)
 * docs/SECURITY.md seção 3: 10 requisições / minuto por usuário.
 */

import { InMemoryRateLimiter } from "./rate-limit";

describe("InMemoryRateLimiter (T003.5)", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter(10, 60 * 1000);
  });

  it("permite até 10 requisições dentro da janela de 1 minuto para o mesmo usuário", () => {
    const userId = "user-test-rate-limit";
    const startTime = 1000000;

    for (let i = 1; i <= 10; i++) {
      const allowed = limiter.check(userId, startTime + i * 100);
      expect(allowed).toBe(true);
    }

    // A 11ª tentativa na mesma janela de 1 minuto deve ser bloqueada
    const eleventhAttempt = limiter.check(userId, startTime + 2000);
    expect(eleventhAttempt).toBe(false);
  });

  it("permite nova requisição após a janela de 1 minuto expirar", () => {
    const userId = "user-test-window-expire";
    const startTime = 1000000;

    // Esgota as 10 requisições
    for (let i = 1; i <= 10; i++) {
      limiter.check(userId, startTime + i * 100);
    }
    expect(limiter.check(userId, startTime + 2000)).toBe(false);

    // Passou 61 segundos (janela expirou)
    const afterWindow = startTime + 61 * 1000;
    expect(limiter.check(userId, afterWindow)).toBe(true);
  });

  it("não interfere no limite de outros usuários (chaves isoladas)", () => {
    const userA = "user-a";
    const userB = "user-b";
    const now = 1000000;

    // Esgota limite do usuário A
    for (let i = 0; i < 10; i++) {
      limiter.check(userA, now + i);
    }
    expect(limiter.check(userA, now + 20)).toBe(false);

    // Usuário B ainda deve ter cota cheia
    expect(limiter.check(userB, now + 20)).toBe(true);
  });
});
