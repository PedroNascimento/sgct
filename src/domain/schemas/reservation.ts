/**
 * Schemas de validação Zod para Reservas e Manifesto de Passageiros (Spec 003).
 * Artigo V da Constituição: validação rigorosa de entrada antes de tocar o banco.
 */

import { z } from "zod";

export const createReservationSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  seatNumber: z
    .number()
    .int("Número do assento deve ser inteiro.")
    .min(1, "Assento mínimo é 1.")
    .max(50, "Assento máximo é 50."),
  boardingPointId: z.string().uuid("ID do ponto de embarque inválido.").optional().nullable(),
  category: z.enum(["standard", "officiant"], {
    errorMap: () => ({ message: "Categoria deve ser 'standard' ou 'officiant'." }),
  }),
  participantType: z
    .enum(
      [
        "adulto",
        "jovem",
        "crianca",
        "oficiante",
        "investidura",
        "selamento",
        "missionario_servico",
      ],
      {
        errorMap: () => ({ message: "Tipo de participante inválido." }),
      }
    )
    .default("adulto"),
  fundingSource: z
    .enum(
      [
        "membro",
        "auxilio_area_investidura",
        "auxilio_recem_converso",
        "auxilio_estaca_fundo_reserva",
        "convidado_transferencia_interestaca",
      ],
      {
        errorMap: () => ({ message: "Fonte de custeio/pagamento inválida." }),
      }
    )
    .default("membro"),
  isPreferentialSeating: z.boolean().default(false),
  familyGroupMemberNames: z.string().optional().nullable(),
  familyGroupLabel: z.string().optional().nullable(),
  companionForEndowmentName: z.string().optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const addManifestEntrySchema = z.object({
  reservationId: z.string().uuid("ID da reserva inválido."),
  fullName: z.string().min(3, "Nome completo da criança deve ter no mínimo 3 caracteres."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
  filiation: z.string().min(3, "Filiação / nome dos responsáveis obrigatório."),
});

export type AddManifestEntryInput = z.infer<typeof addManifestEntrySchema>;
