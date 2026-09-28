/**
 * Use-case: Validação Semanal das Transferências (Spec 004 / US-004.2).
 *
 * Regras:
 * - Ciclo semanal executado toda terça-feira (via job ou manualmente por Admin Estaca).
 * - Transiciona reservas de 'pago_ala' para 'confirmado' e define 'confirmed_at'.
 * - Chama recalculateCaravanRanking internamente para atribuir os ranks e mover excedentes para a lista de espera.
 * - Bloqueio na semana do embarque: se a execução for automática (isAutomatedJob === true) e a caravana
 *   estiver a <= 7 dias do embarque, o job automático não roda (a semana do embarque tem validação manual/contínua).
 */

import { z } from "zod";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Reservation } from "@/domain/types/reservation";
import {
  recalculateCaravanRanking,
  type PositionChangeEvent,
} from "./recalculate-caravan-ranking";

export interface ValidateWeeklyTransfersInput {
  caravanId: string;
  adminId?: string;
  isAutomatedJob?: boolean;
  currentDate?: string;
}

export interface ValidateWeeklyTransfersResult {
  skipped: boolean;
  reason?: string;
  confirmed?: Reservation[];
  waitlisted?: Reservation[];
  positionChangeEvents?: PositionChangeEvent[];
}

export interface ValidateWeeklyTransfersDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
  profileRepository?: ProfileRepository;
}

const inputSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  adminId: z.string().uuid("ID do administrador inválido.").optional(),
  isAutomatedJob: z.boolean().optional(),
  currentDate: z.string().optional(),
});

export async function validateWeeklyTransfers(
  input: ValidateWeeklyTransfersInput,
  deps: ValidateWeeklyTransfersDependencies
): Promise<ValidateWeeklyTransfersResult> {
  const validated = inputSchema.parse(input);
  const { reservationRepository, caravanRepository, profileRepository } = deps;

  // 1. Busca da caravana
  const caravan = await caravanRepository.findById(validated.caravanId);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  const now = validated.currentDate ? new Date(validated.currentDate) : new Date();
  const departureDate = new Date(caravan.departure_date);
  const diffMs = departureDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 2. Bloqueio automático na semana do embarque (T004.5 / US-004.2)
  if (validated.isAutomatedJob && diffDays <= 7) {
    return {
      skipped: true,
      reason: "Validação semanal automática desativada na semana do embarque.",
      confirmed: [],
      waitlisted: [],
      positionChangeEvents: [],
    };
  }

  // 3. Validação do administrador (se acionado manualmente)
  if (validated.adminId) {
    if (!profileRepository) {
      throw new Error("ProfileRepository é obrigatório para validação por administrador.");
    }
    const admin = await profileRepository.findById(validated.adminId);
    if (!admin || !admin.is_active) {
      throw new Error("Administrador não encontrado ou inativo.");
    }
    if (admin.role !== "admin_estaca") {
      throw new Error("Apenas administradores de Estaca podem validar transferências semanais.");
    }
    if (admin.stake_id !== caravan.stake_id) {
      throw new Error("Não autorizado: caravana pertence a outra Estaca.");
    }
  }

  // 4. Busca reservas que estão em 'pago_ala' para transicionar para 'confirmado'
  const pagoAlaReservations = await reservationRepository.findByCaravanAndStatuses(
    caravan.id,
    ["pago_ala"]
  );

  const confirmedAtStr = now.toISOString();

  if (pagoAlaReservations.length > 0) {
    const updates = pagoAlaReservations.map((r) => ({
      id: r.id,
      status: "confirmado" as const,
      confirmed_at: confirmedAtStr,
    }));

    await reservationRepository.updateBatch(updates);
  }

  // 5. Recalcula o ranking da caravana com todas as reservas confirmadas
  const rankingResult = await recalculateCaravanRanking(caravan.id, {
    reservationRepository,
    caravanRepository,
  });

  return {
    skipped: false,
    confirmed: rankingResult.confirmed,
    waitlisted: rankingResult.waitlisted,
    positionChangeEvents: rankingResult.positionChangeEvents,
  };
}
