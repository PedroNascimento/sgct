"use server";

/**
 * Server Actions para Cadastro de Usuários (Membro, Menor, Convidado).
 * Spec 001 — Artigo I e Artigo V.
 */

import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseWardRepository } from "@/infrastructure/supabase/supabase-ward-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseAuthPort } from "@/infrastructure/supabase/supabase-auth-port";
import { signUpMember } from "@/use-cases/auth/sign-up-member";
import { signUpMinor } from "@/use-cases/auth/sign-up-minor";
import { signUpGuest } from "@/use-cases/auth/sign-up-guest";

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function registerMemberAction(
  stakeId: string,
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

    const supabase = createSupabaseServiceClient();
    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const authPort = new SupabaseAuthPort(supabase);

    await signUpMember(
      { email, password, fullName, birthDate, sexo, wardId },
      { authPort, wardRepository, profileRepository },
      stakeId
    );

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
  stakeId: string,
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

    const supabase = createSupabaseServiceClient();
    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const authPort = new SupabaseAuthPort(supabase);

    await signUpMinor(
      {
        email,
        password,
        fullName,
        birthDate,
        sexo,
        wardId,
        guardianId: guardianId || undefined,
        parentalConsent: consent as true,
      },
      { authPort, wardRepository, profileRepository },
      stakeId
    );

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
  stakeId: string,
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

    const supabase = createSupabaseServiceClient();
    const profileRepository = new SupabaseProfileRepository(supabase);
    const authPort = new SupabaseAuthPort(supabase);

    await signUpGuest(
      { email, password, fullName, birthDate, sexo, homeStakeName, homeWardName },
      stakeId,
      { authPort, profileRepository }
    );

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
