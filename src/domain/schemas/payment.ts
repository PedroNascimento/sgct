/**
 * Schemas de validação Zod para o Workflow de Pagamento e Validação (Spec 004).
 * Artigo V da Constituição: validação rigorosa de entrada antes de qualquer operação.
 */

import { z } from "zod";

export const confirmWardPaymentSchema = z.object({
  reservationId: z.string().uuid("ID da reserva inválido."),
  adminId: z.string().uuid("ID do administrador inválido."),
});

export type ConfirmWardPaymentInput = z.infer<typeof confirmWardPaymentSchema>;

export const validateWeeklyTransfersSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  adminId: z.string().uuid("ID do administrador inválido."),
});

export type ValidateWeeklyTransfersInput = z.infer<typeof validateWeeklyTransfersSchema>;
