/**
 * Schemas de validação para Autenticação e Perfis (Spec 001).
 * Artigo V da Constituição: validação de entrada com Zod antes de tocar o banco.
 */

import { z } from "zod";

export const signUpMemberSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres."),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos."),
  phone: z.string().regex(/^\d{10,11}$/, "WhatsApp deve conter 10 ou 11 dígitos, incluindo o DDD."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
  sexo: z.enum(["masculino", "feminino"], {
    errorMap: () => ({ message: "Sexo deve ser 'masculino' ou 'feminino'." }),
  }),
  wardId: z.string().uuid("ID da Ala inválido."),
});

export type SignUpMemberInput = z.infer<typeof signUpMemberSchema>;

export const signUpMinorSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres."),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos."),
  phone: z.string().regex(/^\d{10,11}$/, "WhatsApp deve conter 10 ou 11 dígitos, incluindo o DDD."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
  sexo: z.enum(["masculino", "feminino"], {
    errorMap: () => ({ message: "Sexo deve ser 'masculino' ou 'feminino'." }),
  }),
  wardId: z.string().uuid("ID da Ala inválido."),
  guardianId: z.string().uuid("ID do responsável inválido.").optional().nullable(),
  parentalConsent: z.literal(true, {
    errorMap: () => ({
      message: "O consentimento explícito do responsável é obrigatório para cadastro de menores.",
    }),
  }),
});

export type SignUpMinorInput = z.infer<typeof signUpMinorSchema>;

export const createWardAdminSchema = z.object({
  wardId: z.string().uuid("ID da Ala inválido."),
  email: z.string().email("E-mail inválido."),
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
  sexo: z.enum(["masculino", "feminino"]).optional().nullable(),
});

export type CreateWardAdminInput = z.infer<typeof createWardAdminSchema>;

export const signUpGuestSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres."),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos."),
  phone: z.string().regex(/^\d{10,11}$/, "WhatsApp deve conter 10 ou 11 dígitos, incluindo o DDD."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD."),
  sexo: z.enum(["masculino", "feminino"]),
  homeStakeName: z.string().min(2, "Nome da Estaca de origem obrigatório."),
  homeWardName: z.string().min(2, "Nome da Ala de origem obrigatório."),
});

export type SignUpGuestInput = z.infer<typeof signUpGuestSchema>;

export const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo deve ter no mínimo 3 caracteres."),
  cpf: z.string().trim().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos."),
  phone: z.string().trim().regex(/^\d{10,11}$/, "Telefone deve conter 10 ou 11 dígitos."),
  sexo: z.enum(["masculino", "feminino"]),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
