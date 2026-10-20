import { z } from "zod";

export const processWaitlistSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  vacatedReservationId: z.string().uuid("ID da reserva desocupada inválido."),
  currentDate: z.string().optional(),
});

export type ProcessWaitlistInput = z.infer<typeof processWaitlistSchema>;
