/**
 * Use-case: SyncOfflineCheckIns (Spec 007 / T007.5 e T007.6).
 * Processamento idempotente de lote de check-ins coletados offline.
 */

import type { CheckInDirection } from "@/domain/types/checkin";
import {
  validateCheckIn,
  type ValidateCheckInDependencies,
} from "./validate-checkin";
import { verifyQrToken } from "./qr-token-crypto";

export interface OfflineCheckInItem {
  token: string;
  direction: CheckInDirection;
  checkedInBy: string;
  checkedInAt: string;
}

export interface SyncOfflineCheckInsResult {
  syncedCount: number;
  duplicateCount: number;
  failedCount: number;
  results: Array<{
    reservationId?: string;
    status: "synced" | "duplicate" | "failed";
    error?: string;
  }>;
}

export async function syncOfflineCheckIns(
  items: OfflineCheckInItem[],
  deps: ValidateCheckInDependencies
): Promise<SyncOfflineCheckInsResult> {
  let syncedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  const results: SyncOfflineCheckInsResult["results"] = [];

  const secret =
    deps.secret ||
    process.env.QR_TOKEN_SECRET ||
    process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "Configuração de segurança ausente: QR_TOKEN_SECRET ou SUPABASE_JWT_SECRET não definidos."
    );
  }

  // Rastreia itens processados dentro do mesmo lote para evitar duplicatas em memória
  const seenInBatch = new Set<string>();

  for (const item of items) {
    try {
      const decoded = verifyQrToken(item.token, secret);
      const reservationId = decoded.payload?.reservationId;

      if (reservationId) {
        const batchKey = `${reservationId}:${item.direction}`;
        if (seenInBatch.has(batchKey)) {
          duplicateCount++;
          results.push({
            reservationId,
            status: "duplicate",
          });
          continue;
        }
        seenInBatch.add(batchKey);
      }

      // Verifica se já existia antes
      if (reservationId) {
        const existing = await deps.checkInRepository.findByReservationAndDirection(
          reservationId,
          item.direction
        );
        if (existing) {
          duplicateCount++;
          results.push({
            reservationId,
            status: "duplicate",
          });
          continue;
        }
      }

      const checkIn = await validateCheckIn(
        {
          token: item.token,
          direction: item.direction,
          checkedInBy: item.checkedInBy,
          syncedOffline: true,
          offlineCheckedInAt: item.checkedInAt,
        },
        deps
      );

      syncedCount++;
      results.push({
        reservationId: checkIn.reservation_id,
        status: "synced",
      });
    } catch (err: unknown) {
      failedCount++;
      results.push({
        status: "failed",
        error: err instanceof Error ? err.message : "Erro ao processar check-in",
      });
    }
  }

  return {
    syncedCount,
    duplicateCount,
    failedCount,
    results,
  };
}
