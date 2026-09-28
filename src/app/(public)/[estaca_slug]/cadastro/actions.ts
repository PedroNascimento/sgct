"use server";

/**
 * Server Actions para Cadastro de Usuários (Membro, Menor, Convidado).
 * Spec 001 — Artigo I e Artigo V.
 */

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

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
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const birthDate = formData.get("birthDate") as string;
    const sexo = formData.get("sexo") as "masculino" | "feminino";
    const wardId = formData.get("wardId") as string;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: { operation: "register_member", stakeSlug, email, password, fullName, birthDate, sexo, wardId },
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
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const birthDate = formData.get("birthDate") as string;
    const sexo = formData.get("sexo") as "masculino" | "feminino";
    const wardId = formData.get("wardId") as string;
    const guardianId = (formData.get("guardianId") as string) || undefined;
    const consent = formData.get("parentalConsent") === "on";

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "register_minor", stakeSlug, email, password, fullName,
        birthDate, sexo, wardId, guardianId: guardianId || undefined,
        parentalConsent: consent,
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
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const birthDate = formData.get("birthDate") as string;
    const sexo = formData.get("sexo") as "masculino" | "feminino";
    const homeStakeName = formData.get("homeStakeName") as string;
    const homeWardName = formData.get("homeWardName") as string;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "register_guest", stakeSlug, email, password, fullName,
        birthDate, sexo, homeStakeName, homeWardName,
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
