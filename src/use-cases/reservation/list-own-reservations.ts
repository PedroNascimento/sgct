import { z } from "zod";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";
import type { Reservation } from "@/domain/types/reservation";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";

export interface OwnReservationSummary {
  reservation: Reservation;
  caravan: Caravan;
  boardingPoint: BoardingPoint | null;
}

interface Dependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
}

const userIdSchema = z.string().uuid("ID do usuário inválido.");
const stakeIdSchema = z.string().uuid("ID da Estaca inválido.");

export async function listOwnReservations(
  userId: string,
  stakeId: string,
  dependencies: Dependencies
): Promise<OwnReservationSummary[]> {
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    throw new Error(parsedUserId.error.errors[0]?.message ?? "ID do usuário inválido.");
  }

  const parsedStakeId = stakeIdSchema.safeParse(stakeId);
  if (!parsedStakeId.success) {
    throw new Error(parsedStakeId.error.errors[0]?.message ?? "ID da Estaca inválido.");
  }

  const reservations = await dependencies.reservationRepository.findByUserId(parsedUserId.data);
  const scopedReservations = reservations.filter(
    (reservation) =>
      reservation.user_id === parsedUserId.data && reservation.stake_id === parsedStakeId.data
  );

  const summaries = await Promise.all(
    scopedReservations.map(async (reservation): Promise<OwnReservationSummary | null> => {
      const caravan = await dependencies.caravanRepository.findById(reservation.caravan_id);
      if (!caravan || caravan.stake_id !== parsedStakeId.data) return null;

      const boardingPoint =
        caravan.boarding_points?.find((point) => point.id === reservation.boarding_point_id) ?? null;

      return { reservation, caravan, boardingPoint };
    })
  );

  return summaries.filter((summary): summary is OwnReservationSummary => summary !== null);
}
