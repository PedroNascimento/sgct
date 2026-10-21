/**
 * Rate Limiter Distribuído (Spec 010 / T010.1 / docs/SECURITY.md seção 3)
 * Artigo V da Constituição: Segurança por Padrão
 * 
 * Implementação baseada em PostgreSQL com Janela Deslizante (sliding window).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  currentCount?: number;
}

export class RateLimitExceededError extends Error {
  public readonly retryAfter: number;

  constructor(message = "Muitas tentativas em pouco tempo. Por favor, aguarde.", retryAfter = 60) {
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Limites padronizados conforme docs/SECURITY.md seção 3
 */
export const RATE_LIMIT_CONFIGS = {
  LOGIN: { limit: 5, windowSeconds: 15 * 60 }, // 5 tentativas em 15 minutos
  RESERVATION: { limit: 10, windowSeconds: 60 }, // 10 requisições por minuto
  SCANNER: { limit: 30, windowSeconds: 60 }, // 30 leituras de QR por minuto
  MINOR_UPLOAD: { limit: 5, windowSeconds: 60 * 60 }, // 5 uploads por hora
  EMAIL_PER_RESERVATION: { limit: 1, windowSeconds: 5 * 60 }, // 1 e-mail a cada 5 min por reserva
  GENERAL_AUTHENTICATED: { limit: 100, windowSeconds: 60 }, // 100 requisições por minuto
} as const;

/**
 * Verifica e contabiliza um evento na janela deslizante do rate limiter.
 * Falha de forma fechada (allowed = false) se houver erro no banco.
 *
 * @param key Identificador único da ação (ex: "login:email@domain.com" ou "user:<uuid>:reserve")
 * @param limit Quantidade máxima permitida dentro da janela
 * @param windowSeconds Tamanho da janela deslizante em segundos
 * @param client SupabaseClient opcional (se omitido, utiliza createSupabaseServerClient())
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  client?: SupabaseClient
): Promise<RateLimitResult> {
  if (!key || typeof key !== "string" || key.trim() === "" || limit <= 0 || windowSeconds <= 0) {
    return {
      allowed: false,
      retryAfter: Math.max(1, windowSeconds || 60),
    };
  }

  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key.trim(),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error || !data) {
      // Falha fechada em caso de erro na infraestrutura
      return {
        allowed: false,
        retryAfter: windowSeconds,
      };
    }

    const payload = data as {
      allowed?: boolean;
      retry_after?: number;
      current_count?: number;
    };

    if (payload.allowed === true) {
      return {
        allowed: true,
        currentCount: payload.current_count,
      };
    }

    return {
      allowed: false,
      retryAfter: payload.retry_after ?? windowSeconds,
      currentCount: payload.current_count,
    };
  } catch {
    // Falha fechada defensiva
    return {
      allowed: false,
      retryAfter: windowSeconds,
    };
  }
}
