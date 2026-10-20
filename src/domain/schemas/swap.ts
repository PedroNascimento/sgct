import { z } from "zod";

export const requestSeatSwapSchema = z.object({
  reservationId: z.string().uuid("ID da reserva inválido."),
  newHolderFullName: z
    .string()
    .min(3, "Nome do novo titular deve ter ao menos 3 caracteres.")
    .max(120, "Nome do novo titular muito longo."),
  newHolderDocument: z.string().optional().nullable(),
  requestedBy: z.string().uuid("ID do solicitante inválido."),
});

export type RequestSeatSwapInput = z.infer<typeof requestSeatSwapSchema>;

export const approveSeatSwapSchema = z.object({
  swapRequestId: z.string().uuid("ID da solicitação de permuta inválido."),
  approverId: z.string().uuid("ID do aprovador inválido."),
  currentDate: z.string().optional(),
});

export type ApproveSeatSwapInput = z.infer<typeof approveSeatSwapSchema>;
