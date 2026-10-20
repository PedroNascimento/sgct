/**
 * Caso de uso: Verificação de Quórum Mínimo de Caravana (Spec 006 - T006.1).
 * Artigo I: Domínio / Use-case puro desacoplado de frameworks.
 * Artigo VII: Regra exata da spec (US-006.1: confirmado + pago_ala < min_quorum -> cancela).
 */

import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";

export interface CheckMinimumQuorumInput {
  caravanId: string;
}

export interface CheckMinimumQuorumOutput {
  caravanId: string;
  cancelled: boolean;
  totalEligible: number;
  minQuorum: number;
}

export class CheckMinimumQuorumUseCase {
  constructor(
    private readonly caravanRepository: CaravanRepository,
    private readonly reservationRepository: ReservationRepository
  ) {}

  async execute(input: { caravanId: string }): Promise<CheckMinimumQuorumOutput> {
    const caravan = await this.caravanRepository.findById(input.caravanId);
    if (!caravan) {
      throw new Error(`Caravana não encontrada: ${input.caravanId}`);
    }

    const minQuorum = caravan.min_quorum ?? 48;

    // Se já estiver cancelada, mantém status
    if (caravan.status === "cancelled") {
      return {
        caravanId: caravan.id,
        cancelled: true,
        totalEligible: 0,
        minQuorum,
      };
    }

    // Se já foi completada, não reavalia
    if (caravan.status === "completed") {
      return {
        caravanId: caravan.id,
        cancelled: false,
        totalEligible: 0,
        minQuorum,
      };
    }

    // Busca reservas confirmadas e com pagamento da Ala validado
    const eligibleReservations = await this.reservationRepository.findByCaravanAndStatuses(
      caravan.id,
      ["confirmado", "pago_ala"]
    );

    const totalEligible = eligibleReservations.length;

    if (totalEligible < minQuorum) {
      await this.caravanRepository.updateStatus(caravan.id, "cancelled");
      return {
        caravanId: caravan.id,
        cancelled: true,
        totalEligible,
        minQuorum,
      };
    }

    return {
      caravanId: caravan.id,
      cancelled: false,
      totalEligible,
      minQuorum,
    };
  }
}
