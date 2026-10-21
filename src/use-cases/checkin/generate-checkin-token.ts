/**
 * Use-case: GenerateCheckInToken (Spec 007 / T007.1).
 * US-007.1: Geração de QR Code assinado apenas para reservas confirmadas.
 */

import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { CheckInTokenPayload } from "@/domain/types/checkin";
import { signQrToken } from "./qr-token-crypto";

interface GenerateCheckInTokenDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository?: CaravanRepository;
  secret?: string;
  expiresInDays?: number;
}

export async function generateCheckInToken(
  reservationId: string,
  deps: GenerateCheckInTokenDependencies
): Promise<{ token: string; expiresAt: Date }> {
  const { reservationRepository, caravanRepository, secret, expiresInDays } = deps;

  const reservation = await reservationRepository.findById(reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada");
  }

  if (reservation.status !== "confirmado") {
    throw new Error(
      "Token de check-in só pode ser gerado para reservas confirmadas"
    );
  }

  // Calcula a expiração: se caravanRepository for fornecido, até 48h após o retorno da viagem;
  // senão, padrão de 7 dias (ou expiresInDays)
  let expiresAt = new Date(Date.now() + (expiresInDays ?? 7) * 24 * 60 * 60 * 1000);

  if (caravanRepository) {
    try {
      const caravan = await caravanRepository.findById(reservation.caravan_id);
      if (caravan) {
        const tripDate = caravan.return_date || caravan.departure_date;
        if (tripDate) {
          const tripEndDate = new Date(tripDate);
          // 48 horas após a data de viagem
          const calculatedExpiry = new Date(tripEndDate.getTime() + 48 * 60 * 60 * 1000);
          if (calculatedExpiry.getTime() > Date.now()) {
            expiresAt = calculatedExpiry;
          }
        }
      }
    } catch {
      // Fallback para expiresAt padrão
    }
  }

  const tokenSecret =
    secret ||
    process.env.QR_TOKEN_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    "sgct-qr-token-secret-fallback-key-32chars";

  const payload: CheckInTokenPayload = {
    reservationId: reservation.id,
    caravanId: reservation.caravan_id,
    stakeId: reservation.stake_id,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = signQrToken(payload, tokenSecret);

  await reservationRepository.updateQrToken(
    reservation.id,
    token,
    expiresAt.toISOString()
  );

  return { token, expiresAt };
}
