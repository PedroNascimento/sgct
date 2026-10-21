"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const stakeSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Identificador de Estaca inválido.");

export async function signOutAction(stakeSlug: string): Promise<never> {
  const slug = stakeSlugSchema.parse(stakeSlug);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${slug}/auth/login`);
}

export async function superAdminSignOutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/super-admin/login");
}

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "A senha é obrigatória."),
  stakeSlug: z.string().optional(),
});

export interface SignInActionResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
  retryAfter?: number;
}

export async function signInAction(formData: FormData): Promise<SignInActionResult> {
  const rawEmail = String(formData.get("email") ?? "").trim();
  const rawPassword = String(formData.get("password") ?? "");
  const rawSlug = formData.get("stakeSlug") ? String(formData.get("stakeSlug")) : undefined;

  const parsed = signInSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
    stakeSlug: rawSlug,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos.",
    };
  }

  const { email, password, stakeSlug } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const supabase = await createSupabaseServerClient();

  const { checkRateLimit, RATE_LIMIT_CONFIGS } = await import(
    "@/infrastructure/rate-limit/rate-limiter"
  );

  // Rate Limiting de login: 5 tentativas por 15 min (docs/SECURITY.md seção 3)
  const rateLimitResult = await checkRateLimit(
    `login:${normalizedEmail}`,
    RATE_LIMIT_CONFIGS.LOGIN.limit,
    RATE_LIMIT_CONFIGS.LOGIN.windowSeconds,
    supabase
  );

  if (!rateLimitResult.allowed) {
    const minutes = Math.ceil((rateLimitResult.retryAfter ?? 900) / 60);
    return {
      success: false,
      error: `Muitas tentativas de login. Por segurança, tente novamente em ${minutes} minuto(s).`,
      retryAfter: rateLimitResult.retryAfter,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: "E-mail ou senha inválidos.",
    };
  }

  const role = data.user.app_metadata?.role;
  let redirectUrl = `/${stakeSlug || ""}`;
  if (role === "super_admin") {
    redirectUrl = "/estacas";
  } else if (role === "admin_estaca" && stakeSlug) {
    redirectUrl = `/${stakeSlug}/estaca/calendario`;
  } else if (role === "admin_ala" && stakeSlug) {
    redirectUrl = `/${stakeSlug}/ala/reservas`;
  }

  return {
    success: true,
    redirectUrl,
  };
}
