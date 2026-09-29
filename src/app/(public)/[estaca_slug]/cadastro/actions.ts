"use server";

/**
 * Server Actions para Cadastro de Usuários (Membro, Menor, Convidado).
 * Spec 001 — Artigo I e Artigo V.
 */

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  signUpGuestSchema,
  signUpMemberSchema,
  signUpMinorSchema,
} from "@/domain/schemas/auth";

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function registerMemberAction(
  stakeSlug: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = signUpMemberSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
      phone: String(formData.get("phone") ?? "").replace(/\D/g, ""),
      birthDate: formData.get("birthDate"),
      sexo: formData.get("sexo"),
      wardId: formData.get("wardId"),
    });
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: { operation: "register_member", stakeSlug, ...parsed.data },
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Falha no cadastro.");

    return {
      success: true,
      message: "Cadastro realizado com sucesso! Você já pode entrar com seu e-mail e senha.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao realizar cadastro.",
    };
  }
}

export async function registerMinorAction(
  stakeSlug: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const guardianId = (formData.get("guardianId") as string) || undefined;
    const consent = formData.get("parentalConsent") === "on";
    const parsed = signUpMinorSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
      phone: String(formData.get("phone") ?? "").replace(/\D/g, ""),
      birthDate: formData.get("birthDate"),
      sexo: formData.get("sexo"),
      wardId: formData.get("wardId"),
      guardianId,
      parentalConsent: consent,
    });
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "register_minor", stakeSlug, ...parsed.data,
      },
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Falha no cadastro.");

    return {
      success: true,
      message: "Cadastro de jovem realizado com sucesso! Bem-vindo(a) à plataforma.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao cadastrar jovem.",
    };
  }
}

export async function registerGuestAction(
  stakeSlug: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = signUpGuestSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
      phone: String(formData.get("phone") ?? "").replace(/\D/g, ""),
      birthDate: formData.get("birthDate"),
      sexo: formData.get("sexo"),
      homeStakeName: formData.get("homeStakeName"),
      homeWardName: formData.get("homeWardName"),
    });
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "register_guest", stakeSlug, ...parsed.data,
      },
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Falha no cadastro.");

    return {
      success: true,
      message: "Cadastro de convidado realizado com sucesso! Você já pode acessar a plataforma.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao cadastrar convidado.",
    };
  }
}
