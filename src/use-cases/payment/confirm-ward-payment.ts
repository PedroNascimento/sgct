/**
 * Use-case: Confirmar Pagamento na Ala (Spec 004 / US-004.1).
 *
 * Regras:
 * - Transiciona status de 'pendente' para 'pago_ala'.
 * - Bloqueio de autoaprovação: o admin não pode confirmar a própria reserva.
 * - Isolamento multi-tenant:
 *   - Admin Ala só confirma reserva da sua própria Ala e Estaca.
 *   - Admin Estaca pode confirmar reservas de qualquer Ala da sua própria Estaca.
 * - Rejeita se a reserva não estiver em status 'pendente'.
 */

import { confirmWardPaymentSchema, type ConfirmWardPaymentInput } from "@/domain/schemas/payment";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Reservation } from "@/domain/types/reservation";

export interface ConfirmWardPaymentDependencies {
  reservationRepository: ReservationRepository;
  profileRepository: ProfileRepository;
}

export async function confirmWardPayment(
  input: ConfirmWardPaymentInput,
  deps: ConfirmWardPaymentDependencies
): Promise<Reservation> {
  const { reservationRepository, profileRepository } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = confirmWardPaymentSchema.parse(input);

  // 2. Busca e validação do administrador
  const admin = await profileRepository.findById(validated.adminId);
  if (!admin || !admin.is_active) {
    throw new Error("Administrador não encontrado ou inativo.");
  }

  if (admin.role !== "admin_ala" && admin.role !== "admin_estaca") {
    throw new Error("Apenas administradores de Ala ou Estaca podem confirmar pagamentos.");
  }

  // 3. Busca da reserva
  const reservation = await reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada.");
  }

  // 4. Bloqueio de autoaprovação (US-004.1)
  if (reservation.user_id === admin.id) {
    throw new Error(
      "Bloqueio de autoaprovação: você não pode confirmar o pagamento da sua própria reserva."
    );
  }

  // 5. Isolamento Multi-Tenant em dois níveis (Artigo II)
  if (admin.stake_id !== reservation.stake_id) {
    throw new Error("Não autorizado: reserva pertence a outra Estaca.");
  }

  if (admin.role === "admin_ala" && admin.ward_id !== reservation.ward_id) {
    throw new Error("Não autorizado: reserva pertence a outra Ala.");
  }

  // 6. Validação de status de origem
  if (reservation.status !== "pendente") {
    throw new Error(
      `Não é possível confirmar pagamento para reserva com status '${reservation.status}'.`
    );
  }

  // 7. Transição para 'pago_ala'
  const updated = await reservationRepository.updateStatus(reservation.id, {
    status: "pago_ala",
  });

  return updated;
}
