/**
 * Use-case: ValidateCheckIn (Spec 007 / T007.2).
 * US-007.2: Validação de presença no embarque com idempotência por (reservation_id, direction).
 */

import type { CheckInRepository } from "@/domain/interfaces/checkin-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CheckIn, CheckInDirection } from "@/domain/types/checkin";
import { verifyQrToken } from "./qr-token-crypto";

export interface ValidateCheckInInput {
  token: string;
  direction: CheckInDirection;
  checkedInBy: string;
  syncedOffline?: boolean;
  offlineCheckedInAt?: string;
}

export interface ValidateCheckInDependencies {
  checkInRepository: CheckInRepository;
  reservationRepository: ReservationRepository;
  secret?: string;
}

export async function validateCheckIn(
  input: ValidateCheckInInput,
  deps: ValidateCheckInDependencies
): Promise<CheckIn> {
  const { checkInRepository, reservationRepository, secret } = deps;

  const tokenSecret =
    secret ||
    process.env.QR_TOKEN_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    "sgct-qr-token-secret-fallback-key-32chars";

  const verification = verifyQrToken(input.token, tokenSecret);
  if (!verification.valid || !verification.payload) {
    throw new Error(verification.error || "Token de check-in inválido");
  }

  const { payload } = verification;

  const reservation = await reservationRepository.findById(payload.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada");
  }

  // Validação cruzada de segurança multi-tenant
  if (
    reservation.stake_id !== payload.stakeId ||
    reservation.caravan_id !== payload.caravanId
  ) {
    throw new Error(
      "Inconsistência de segurança: token não pertence a esta caravana ou Estaca"
    );
  }

  // Apenas reservas confirmadas ou já marcadas como presentes podem receber check-in
  if (
    reservation.status !== "confirmado" &&
    reservation.status !== "presente"
  ) {
    throw new Error("Reserva não está confirmada para embarque");
  }

  // Idempotência: se já foi lido e registrado para a mesma direção, não duplica
  const existing = await checkInRepository.findByReservationAndDirection(
    reservation.id,
    input.direction
  );

  if (existing) {
    return existing;
  }

  // Cria o registro de check-in
  const checkIn = await checkInRepository.createCheckIn({
    reservation_id: reservation.id,
    direction: input.direction,
    checked_in_by: input.checkedInBy,
    synced_offline: input.syncedOffline ?? false,
    checked_in_at: input.offlineCheckedInAt,
  });

  // Na ida, atualiza o status da reserva para "presente"
  if (input.direction === "ida" && reservation.status !== "presente") {
    await reservationRepository.updateStatus(reservation.id, {
      status: "presente",
    });
  }

  return checkIn;
}
