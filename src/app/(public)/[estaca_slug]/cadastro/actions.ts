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

async function extractErrorMessage(data: { error?: string } | null, error: unknown): Promise<string> {
  if (data?.error && typeof data.error === "string") {
    return data.error;
  }
  if (error && typeof error === "object") {
    if ("context" in error && error.context && typeof (error.context as { json?: () => Promise<unknown> }).json === "function") {
      try {
        const body = (await (error.context as { json: () => Promise<unknown> }).json()) as { error?: string; message?: string } | null;
        if (body?.error && typeof body.error === "string") {
          return body.error;
        }
        if (body?.message && typeof body.message === "string") {
          return body.message;
        }
      } catch {
        // Ignora erro de parse de JSON
      }
    }
    const message = "message" in error && typeof (error as { message?: string }).message === "string" ? (error as { message: string }).message : "";
    if (message && message !== "Edge Function returned a non-2xx status code") {
      return message;
    }
  }
  return "Falha ao processar cadastro no servidor. Verifique os dados ou tente novamente mais tarde.";
}

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
    if (error || data?.error) {
      throw new Error(await extractErrorMessage(data, error));
    }

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
    if (error || data?.error) {
      throw new Error(await extractErrorMessage(data, error));
    }

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
    if (error || data?.error) {
      throw new Error(await extractErrorMessage(data, error));
    }

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
