/**
 * Schemas Zod para validação de inputs de tenant.
 * Camada domain/ — apenas Zod como dependência (sem framework).
 *
 * Referência: plan.md seção "Contratos" — slug validado como kebab-case.
 */

import { z } from "zod";

/** Slug kebab-case: apenas letras minúsculas, números e hífens. Sem espaços. */
export const slugSchema = z
  .string()
  .min(2, "Slug deve ter no mínimo 2 caracteres.")
  .max(63, "Slug deve ter no máximo 63 caracteres.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug deve conter apenas letras minúsculas, números e hífens (ex: estaca-natal)."
  );

export const createStakeSchema = z.object({
  name: z.string().min(3, "Nome da Estaca deve ter no mínimo 3 caracteres.").max(100),
  slug: slugSchema,
});

export const createBootstrapAdminEstacaSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido."),
  email: z.string().email("E-mail inválido."),
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres.").max(150),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
});

// Tipos inferidos dos schemas
export type CreateStakeInput = z.infer<typeof createStakeSchema>;
export type CreateBootstrapAdminEstacaInput = z.infer<typeof createBootstrapAdminEstacaSchema>;
