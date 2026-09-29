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
  redirect(`/${slug}`);
}
