/**
 * Rate Limiter de Aplicação em Memória (Janela Deslizante).
 * Atende ao requisito de segurança de criação de reservas (docs/SECURITY.md seção 3).
 *
 * Limite padrão de reserva: 10 requisições / minuto por usuário (T003.5).
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * @param limit Número máximo de requisições permitidas na janela
   * @param windowMs Duração da janela em milissegundos (ex: 60000 = 1 minuto)
   */
  constructor(
    private readonly limit: number = 10,
    private readonly windowMs: number = 60 * 1000
  ) {}

  /**
   * Verifica se uma ação é permitida para uma determinada chave (ex: userId).
   * Se exceder o limite, retorna false. Se permitido, registra a requisição e retorna true.
   */
  check(key: string, now: number = Date.now()): boolean {
    const record = this.records.get(key) ?? { timestamps: [] };

    // Filtrar apenas timestamps dentro da janela deslizante atual
    const threshold = now - this.windowMs;
    const validTimestamps = record.timestamps.filter((t) => t > threshold);

    if (validTimestamps.length >= this.limit) {
      this.records.set(key, { timestamps: validTimestamps });
      return false;
    }

    validTimestamps.push(now);
    this.records.set(key, { timestamps: validTimestamps });
    return true;
  }

  /**
   * Retorna quantas requisições ainda restam na janela atual.
   */
  getRemaining(key: string, now: number = Date.now()): number {
    const record = this.records.get(key);
    if (!record) return this.limit;

    const threshold = now - this.windowMs;
    const active = record.timestamps.filter((t) => t > threshold).length;
    return Math.max(0, this.limit - active);
  }

  /**
   * Limpa o histórico de uma chave (útil para testes).
   */
  reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}

// Instância singleton para criação de reservas (10 req/min por usuário)
export const reservationRateLimiter = new InMemoryRateLimiter(10, 60 * 1000);
