/**
 * Caso de uso: Rollover de Reserva após cancelamento de caravana (Spec 006 - T006.3 / T006.4).
 * Artigo I: Domínio puro.
 * Artigo II: Isolamento absoluto em dois níveis (Estaca > Ala) — o stake_id original NUNCA é alterado.
 * Regra: Gera crédito 'caravan_cancelled' (validade 12 meses, D08) e recria reserva equivalente na próxima caravana disponível da mesma Estaca.
 */

import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

export interface RolloverReservationInput {
  cancelledCaravanId: string;
  reservation: Reservation;
}

export interface RolloverReservationOutput {
  creditEntry: CreditLedgerEntry;
  newReservation: Reservation | null;
  message?: string;
}

export class RolloverReservationUseCase {
  constructor(
    private readonly caravanRepository: CaravanRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly creditRepository: CreditRepository
  ) {}

  async execute(input: RolloverReservationInput): Promise<RolloverReservationOutput> {
    const { cancelledCaravanId, reservation } = input;

    const caravan = await this.caravanRepository.findById(cancelledCaravanId);
    if (!caravan) {
      throw new Error(`Caravana cancelada não encontrada: ${cancelledCaravanId}`);
    }

    // Calcula expiração do crédito para 12 meses à frente (Decisão D08)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // 1. Gera crédito contábil com source 'caravan_cancelled'
    // Artigo II: herda explicitamente stake_id e ward_id da reserva original
    const creditEntry = await this.creditRepository.create({
      stake_id: reservation.stake_id,
      ward_id: reservation.ward_id ?? undefined,
      user_id: reservation.user_id,
      amount: reservation.payment_amount,
      source: "caravan_cancelled",
      origin_reservation_id: reservation.id,
      reason: "Caravana cancelada por quórum mínimo",
      expires_at: expiresAt.toISOString(),
      status: "active",
    });

    // 2. Atualiza status da reserva original para 'cancelada_com_credito'
    await this.reservationRepository.updateStatus(reservation.id, {
      status: "cancelada_com_credito",
    });

    // 3. Procura próxima caravana aberta na MESMA Estaca (Artigo II e Artigo IX)
    const stakeCaravans = await this.caravanRepository.findByStakeId(reservation.stake_id);
    const candidateCaravans = stakeCaravans
      .filter(
        (c) =>
          c.id !== caravan.id &&
          c.stake_id === reservation.stake_id &&
          c.status === "open" &&
          new Date(c.departure_date) > new Date(caravan.departure_date)
      )
      .sort(
        (a, b) =>
          new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
      );

    const nextCaravan = candidateCaravans[0] ?? null;

    if (!nextCaravan) {
      return {
        creditEntry,
        newReservation: null,
        message: "Crédito gerado com sucesso. Nenhuma próxima caravana disponível na mesma Estaca para transferência imediata.",
      };
    }

    // 4. Cria reserva na próxima caravana preservando categorias e dados originais
    // Artigo II: stake_id e ward_id NUNCA migram para outra Estaca
    const newReservation = await this.reservationRepository.create({
      stake_id: reservation.stake_id,
      caravan_id: nextCaravan.id,
      user_id: reservation.user_id,
      ward_id: reservation.ward_id,
      seat_number: reservation.seat_number,
      boarding_point_id: reservation.boarding_point_id,
      category: reservation.category,
      participant_type: reservation.participant_type,
      funding_source: reservation.funding_source,
      is_preferential_seating: reservation.is_preferential_seating,
      family_group_member_names: reservation.family_group_member_names,
      family_group_label: reservation.family_group_label,
      companion_for_endowment_name: reservation.companion_for_endowment_name,
      status: "confirmado",
      payment_amount: reservation.payment_amount,
    });

    return {
      creditEntry,
      newReservation,
      message: "Reserva transferida com sucesso para a próxima caravana disponível.",
    };
  }
}
