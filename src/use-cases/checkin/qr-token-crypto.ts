/**
 * Utilitário de assinatura e verificação de tokens QR com HMAC-SHA256.
 * Seguro, padrão JWT simplificado (header.payload.signature), sem dependências externas pesadas.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { CheckInTokenPayload } from "@/domain/types/checkin";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function signQrToken(payload: CheckInTokenPayload, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyQrToken(
  token: string,
  secret: string
): { valid: boolean; payload?: CheckInTokenPayload; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token ausente ou formato inválido" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Estrutura do token inválida" };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret).update(data).digest("base64url");

  // Comparação segura contra timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Assinatura do token inválida" };
  }

  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr) as CheckInTokenPayload;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      return { valid: false, payload, error: "Token de check-in expirado" };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    return { valid: false, error: "Falha ao decodificar dados do token" };
  }
}
