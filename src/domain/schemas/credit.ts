import { z } from "zod";

export const applyCreditSchema = z.object({
  creditId: z.string().uuid("ID do crédito inválido."),
  reservationId: z.string().uuid("ID da reserva inválido."),
  userId: z.string().uuid("ID do usuário inválido."),
  currentDate: z.string().optional(),
});

export type ApplyCreditInput = z.infer<typeof applyCreditSchema>;

export const expireCreditsSchema = z.object({
  currentDate: z.string().optional(),
});

export type ExpireCreditsInput = z.infer<typeof expireCreditsSchema>;
