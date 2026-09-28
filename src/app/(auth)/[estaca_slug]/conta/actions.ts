"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { updateOwnProfile } from "@/use-cases/auth/update-own-profile";

export async function updateOwnProfileAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Não autenticado.");
  }

  const repository = new SupabaseProfileRepository(supabase);
  await updateOwnProfile(
    {
      fullName: String(formData.get("fullName") ?? ""),
      cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
      phone: String(formData.get("phone") ?? "").replace(/\D/g, ""),
      sexo: String(formData.get("sexo") ?? "") as "masculino" | "feminino",
    },
    user.id,
    repository
  );

  revalidatePath("/[estaca_slug]/conta", "page");
}
