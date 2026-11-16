/**
 * Schemas de validação Zod para Caravanas e Pontos de Embarque (Spec 002).
 * Artigo V da Constituição: validação rigorosa de entrada antes de tocar o banco.
 */

import { z } from "zod";

export const boardingPointInputSchema = z.object({
  name: z.string().min(2, "Nome do ponto de embarque obrigatório."),
  boardingTime: z.string().min(1, "Horário de embarque obrigatório."),
});

export const createCaravanSchema = z.object({
  title: z
    .string()
    .trim()
    .max(100, "Título não pode exceder 100 caracteres.")
    .optional()
    .nullable(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de saída deve estar no formato YYYY-MM-DD."),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de retorno deve estar no formato YYYY-MM-DD.")
    .optional()
    .nullable(),
  overnight: z.boolean({ required_error: "Informe se a caravana é com ou sem pernoite." }),
  priceTicket: z.number().min(0, "Valor da passagem não pode ser negativo."),
  priceLodging: z.number().min(0, "Valor do alojamento não pode ser negativo.").default(0),
  seatLimit: z.number().int().min(1).default(50),
  waitlistLimit: z.number().int().min(0).default(5),
  registrationDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Prazo de inscrição deve estar no formato YYYY-MM-DD."),
  minQuorum: z.number().int().min(1).default(48),
  quorumCheckDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de verificação de quórum deve estar no formato YYYY-MM-DD."),
  caravanLeaderId: z.string().uuid("ID do líder da caravana inválido.").optional().nullable(),
  boardingPoints: z
    .array(boardingPointInputSchema)
    .min(1, "Ao menos um ponto de embarque deve ser informado."),
});

export type CreateCaravanInput = z.infer<typeof createCaravanSchema>;

export const updateCaravanStatusSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  status: z.enum(
    [
      "registered",
      "draft",
      "open",
      "quorum_pending",
      "confirmed",
      "cancelled",
      "completed",
    ],
    {
      errorMap: () => ({ message: "Status de caravana inválido." }),
    }
  ),
});

export type UpdateCaravanStatusInput = z.infer<typeof updateCaravanStatusSchema>;
