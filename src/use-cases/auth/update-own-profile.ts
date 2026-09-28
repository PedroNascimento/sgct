import {
  updateOwnProfileSchema,
  type UpdateOwnProfileInput,
} from "@/domain/schemas/auth";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Profile } from "@/domain/types/tenant";

export async function updateOwnProfile(
  input: UpdateOwnProfileInput,
  actingUserId: string,
  profileRepository: ProfileRepository
): Promise<Profile> {
  const parsed = updateOwnProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados de perfil inválidos.");
  }

  const profile = await profileRepository.findById(actingUserId);
  if (!profile || !profile.is_active) {
    throw new Error("Perfil não encontrado ou inativo.");
  }
  if (!profileRepository.updateOwnContact) {
    throw new Error("Atualização de perfil não suportada pelo repositório.");
  }

  return profileRepository.updateOwnContact(actingUserId, {
    full_name: parsed.data.fullName,
    cpf: parsed.data.cpf,
    phone: parsed.data.phone,
    sexo: parsed.data.sexo,
  });
}
