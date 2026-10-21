/**
 * Use-cases: Aprovação e Reprovação de Auxílio Financeiro (Spec 012 / T012.4 / T012.5 / T012.9).
 *
 * Regras:
 * - Apenas Admin Ala da mesma Ala ou Admin Estaca da mesma Estaca pode aprovar/reprovar (Artigo II / Artigo V).
 * - Aprovação: aid_requests.status = 'approved', reserva transiciona para 'pago_ala' (entra no fluxo semanal).
 * - Reprovação: aid_requests.status = 'rejected', reserva transiciona para 'cancelada_sem_credito' (sem crédito, pois nada foi pago).
 * - Disparo de notificação para o membro titular (Spec 008).
 */

import { z } from "zod";
import type { AidRepository } from "@/domain/interfaces/aid-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import { enqueueNotification } from "@/use-cases/notifications/enqueue-notification";
import type { AidRequest } from "@/domain/types/aid";
import type { Reservation } from "@/domain/types/reservation";

export const ApproveAidSchema = z.object({
  aidRequestId: z.string().min(1, "ID do pedido de auxílio obrigatório"),
  approverId: z.string().min(1, "ID do aprovador obrigatório"),
  notes: z.string().nullable().optional(),
});

export type ApproveAidInput = z.infer<typeof ApproveAidSchema>;

export const RejectAidSchema = z.object({
  aidRequestId: z.string().min(1, "ID do pedido de auxílio obrigatório"),
  rejecterId: z.string().min(1, "ID do responsável pela reprovação obrigatório"),
  reason: z.string().nullable().optional(),
});

export type RejectAidInput = z.infer<typeof RejectAidSchema>;

export interface ProcessAidDependencies {
  aidRepository: AidRepository;
  reservationRepository: ReservationRepository;
  profileRepository: ProfileRepository;
  notificationQueueRepository?: NotificationQueueRepository;
  findUserEmail?: (userId: string) => Promise<string | null>;
}

export interface ProcessAidResult {
  aidRequest: AidRequest;
  reservation: Reservation;
}

async function validateAidOperation(
  aidRequestId: string,
  operatorId: string,
  deps: ProcessAidDependencies
) {
  const aidRequest = await deps.aidRepository.findById(aidRequestId);
  if (!aidRequest) {
    throw new Error("Pedido de auxílio não encontrado.");
  }

  if (aidRequest.status !== "pending") {
    throw new Error(`Este pedido de auxílio já foi processado (status atual: ${aidRequest.status}).`);
  }

  const reservation = await deps.reservationRepository.findById(aidRequest.reservation_id);
  if (!reservation) {
    throw new Error("Reserva vinculada ao auxílio não encontrada.");
  }

  if (reservation.status !== "aguardando_auxilio") {
    throw new Error(
      `A reserva não está aguardando auxílio (status atual: ${reservation.status}).`
    );
  }

  const operator = await deps.profileRepository.findById(operatorId);
  if (!operator || !operator.is_active) {
    throw new Error("Operador não encontrado ou inativo.");
  }

  // Isolamento Multi-Tenant em 2 níveis (Artigo II)
  if (operator.stake_id !== reservation.stake_id) {
    throw new Error("Não autorizado: pedido pertence a outra Estaca.");
  }

  if (operator.role === "admin_ala") {
    if (operator.ward_id !== reservation.ward_id) {
      throw new Error("Não autorizado: pedido pertence a outra Ala.");
    }
  } else if (operator.role !== "admin_estaca") {
    throw new Error("Apenas administradores de Ala ou Estaca podem gerenciar auxílios.");
  }

  return { aidRequest, reservation, operator };
}

export async function approveAid(
  input: ApproveAidInput,
  deps: ProcessAidDependencies
): Promise<ProcessAidResult> {
  const validated = ApproveAidSchema.parse(input);
  const { aidRequest, reservation } = await validateAidOperation(
    validated.aidRequestId,
    validated.approverId,
    deps
  );

  // 1. Atualiza pedido de auxílio
  const updatedAid = await deps.aidRepository.updateStatus(
    aidRequest.id,
    "approved",
    validated.approverId,
    validated.notes ?? null
  );

  // 2. Transiciona reserva para pago_ala (entra no fluxo semanal)
  const updatedReservation = await deps.reservationRepository.updateStatus(
    reservation.id,
    { status: "pago_ala" }
  );

  // 3. Notificar o membro (Spec 008)
  if (deps.notificationQueueRepository && reservation.stake_id) {
    try {
      const member = await deps.profileRepository.findById(reservation.user_id);
      const email = deps.findUserEmail ? await deps.findUserEmail(reservation.user_id) : null;
      if (member && email) {
        await enqueueNotification(
          {
            stakeId: reservation.stake_id,
            eventType: "PAYMENT_CONFIRMED_WARD",
            recipientId: member.id,
            recipientEmail: email,
            recipientName: member.full_name,
            payload: {
              reservationId: reservation.id,
              seatNumber: reservation.seat_number,
              amount: reservation.payment_amount,
              isAidApproved: true,
              aidType: aidRequest.aid_type,
            },
          },
          { repository: deps.notificationQueueRepository }
        );
      }
    } catch (err) {
      console.warn("Erro ao despachar notificação de aprovação de auxílio:", err);
    }
  }

  return {
    aidRequest: updatedAid,
    reservation: updatedReservation,
  };
}

export async function rejectAid(
  input: RejectAidInput,
  deps: ProcessAidDependencies
): Promise<ProcessAidResult> {
  const validated = RejectAidSchema.parse(input);
  const { aidRequest, reservation } = await validateAidOperation(
    validated.aidRequestId,
    validated.rejecterId,
    deps
  );

  // 1. Atualiza pedido de auxílio
  const updatedAid = await deps.aidRepository.updateStatus(
    aidRequest.id,
    "rejected",
    validated.rejecterId,
    validated.reason ?? null
  );

  // 2. Transiciona reserva para cancelada_sem_credito (nenhum valor pago)
  const updatedReservation = await deps.reservationRepository.updateStatus(
    reservation.id,
    { status: "cancelada_sem_credito" }
  );

  // 3. Notificar o membro (Spec 008)
  if (deps.notificationQueueRepository && reservation.stake_id) {
    try {
      const member = await deps.profileRepository.findById(reservation.user_id);
      const email = deps.findUserEmail ? await deps.findUserEmail(reservation.user_id) : null;
      if (member && email) {
        await enqueueNotification(
          {
            stakeId: reservation.stake_id,
            eventType: "RESERVATION_CANCELLED_OR_EXPIRED",
            recipientId: member.id,
            recipientEmail: email,
            recipientName: member.full_name,
            payload: {
              reservationId: reservation.id,
              seatNumber: reservation.seat_number,
              reason: validated.reason ?? "Auxílio financeiro não aprovado pelo Bispado.",
              isAidRejected: true,
            },
          },
          { repository: deps.notificationQueueRepository }
        );
      }
    } catch (err) {
      console.warn("Erro ao despachar notificação de reprovação de auxílio:", err);
    }
  }

  return {
    aidRequest: updatedAid,
    reservation: updatedReservation,
  };
}
