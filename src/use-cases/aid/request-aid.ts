/**
 * Use-case: Registrar Pedido de Auxílio Financeiro (Spec 012 / T012.2 / US-012.1 / US-012.3).
 *
 * Regras:
 * - Vinculado a uma reserva com funding_source != 'membro' e status 'aguardando_auxilio'.
 * - requestedBy deve ser Admin Ala da mesma Ala ou Admin Estaca da mesma Estaca (Artigo II / Artigo V).
 * - Se a caravana sai em menos de 25 dias, gera alerta informativo de prazo insuficiente (US-012.3).
 */

import { z } from "zod";
import type { AidRepository } from "@/domain/interfaces/aid-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { AidRequest, AidType } from "@/domain/types/aid";

export const RequestAidSchema = z.object({
  reservationId: z.string().min(1, "ID da reserva obrigatório"),
  aidType: z.enum([
    "auxilio_area_investidura",
    "auxilio_recem_converso",
    "auxilio_estaca_fundo_reserva",
  ]),
  requestedBy: z.string().min(1, "Solicitante obrigatório"),
  notes: z.string().nullable().optional(),
});

export type RequestAidInput = z.infer<typeof RequestAidSchema>;

export interface RequestAidResult {
  aidRequest: AidRequest;
  hasInsufficientTimeWarning: boolean;
  warningMessage?: string;
}

export interface RequestAidDependencies {
  aidRepository: AidRepository;
  reservationRepository: ReservationRepository;
  profileRepository: ProfileRepository;
  caravanRepository: CaravanRepository;
}

export async function requestAid(
  input: RequestAidInput,
  deps: RequestAidDependencies
): Promise<RequestAidResult> {
  const validated = RequestAidSchema.parse(input);

  // 1. Validar reserva
  const reservation = await deps.reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada.");
  }

  if (reservation.status !== "aguardando_auxilio") {
    throw new Error(
      `Reserva não está aguardando auxílio. Status atual: ${reservation.status}`
    );
  }

  // 2. Validar permissões do solicitante (Admin Ala da mesma ala ou Admin Estaca da mesma estaca)
  const requester = await deps.profileRepository.findById(validated.requestedBy);
  if (!requester || !requester.is_active) {
    throw new Error("Solicitante não encontrado ou inativo.");
  }

  const isStakeAdmin =
    requester.role === "admin_estaca" && requester.stake_id === reservation.stake_id;
  const isWardAdmin =
    requester.role === "admin_ala" &&
    requester.stake_id === reservation.stake_id &&
    requester.ward_id === reservation.ward_id;

  if (!isStakeAdmin && !isWardAdmin) {
    throw new Error("Permissão negada. Apenas administradores da Ala ou da Estaca podem registrar auxílio.");
  }

  // 3. Verificar se já existe pedido de auxílio para esta reserva
  const existing = await deps.aidRepository.findByReservationId(reservation.id);
  if (existing) {
    throw new Error("Já existe um pedido de auxílio registrado para esta reserva.");
  }

  // 4. Checar antecedência de 25 dias em relação à saída da caravana (US-012.3)
  const caravan = await deps.caravanRepository.findById(reservation.caravan_id);
  let hasInsufficientTimeWarning = false;
  let warningMessage: string | undefined;

  if (caravan) {
    const departure = new Date(caravan.departure_date);
    const now = new Date();
    const diffDays = Math.ceil(
      (departure.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 25) {
      hasInsufficientTimeWarning = true;
      warningMessage = `Atenção: A caravana parte em ${diffDays} dias (menos de 25 dias). Como o processo do Bispado leva de 20 a 30 dias, há risco do auxílio não ser aprovado a tempo.`;
    }
  }

  // 5. Criar pedido de auxílio
  const aidRequest = await deps.aidRepository.create({
    reservation_id: reservation.id,
    aid_type: validated.aidType as AidType,
    requested_by: validated.requestedBy,
    stake_id: reservation.stake_id,
    ward_id: reservation.ward_id ?? undefined,
    notes: validated.notes ?? null,
  });

  return {
    aidRequest,
    hasInsufficientTimeWarning,
    warningMessage,
  };
}
