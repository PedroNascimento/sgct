/**
 * Schemas Zod para validação de Alas (Wards).
 * Artigo I: camada domain/ — pura, apenas Zod como dependência.
 * Artigo V.a: toda Server Action valida entrada com Zod antes de tocar o banco.
 */

import { z } from "zod";

export const createWardSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido."),
  name: z
    .string()
    .trim()
    .min(2, "O nome da Ala deve ter no mínimo 2 caracteres.")
    .max(100, "O nome da Ala deve ter no máximo 100 caracteres."),
});

export const updateWardSchema = z.object({
  wardId: z.string().uuid("wardId deve ser um UUID válido."),
  stakeId: z.string().uuid("stakeId deve ser um UUID válido."),
  name: z
    .string()
    .trim()
    .min(2, "O nome da Ala deve ter no mínimo 2 caracteres.")
    .max(100, "O nome da Ala deve ter no máximo 100 caracteres."),
});

export type CreateWardInput = z.infer<typeof createWardSchema>;
export type UpdateWardInput = z.infer<typeof updateWardSchema>;
