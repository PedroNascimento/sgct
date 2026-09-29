/**
 * Use-case: signUpGuest (US-001.6 / D28)
 *
 * Cadastro de conta leve para convidado de outra Estaca (inter-Estaca).
 *
 * Regras não-negociáveis:
 * - stake_id é SEMPRE a Estaca anfitriã resolvida no servidor (Artigo II.d).
 * - ward_id é SEMPRE null (convidado não pertence a nenhuma Ala da Estaca anfitriã).
 * - home_stake_name e home_ward_name são texto livre.
 * - role é estritamente 'guest'.
 */

import { signUpGuestSchema, type SignUpGuestInput } from "@/domain/schemas/auth";
import type { Profile } from "@/domain/types/tenant";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface SignUpGuestDependencies {
  authPort: AuthPort;
  profileRepository: ProfileRepository;
}

export async function signUpGuest(
  input: SignUpGuestInput,
  hostStakeId: string,
  deps: SignUpGuestDependencies
): Promise<Profile> {
  // Artigo V — Validação Zod
  const parsed = signUpGuestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para convidado.");
  }

  const { email, password, fullName, cpf, birthDate, sexo, homeStakeName, homeWardName } =
    parsed.data;

  // 1. Criar usuário no Auth
  const { userId } = await deps.authPort.signUp({
    email,
    password,
    fullName,
    metadata: {
      role: "guest",
      stake_id: hostStakeId,
      ward_id: null,
    },
  });

  // 2. Criar profile
  return deps.profileRepository.insert({
    id: userId,
    stake_id: hostStakeId,
    ward_id: null,
    full_name: fullName,
    birth_date: birthDate,
    sexo,
    cpf,
    phone: null,
    role: "guest",
    home_stake_name: homeStakeName,
    home_ward_name: homeWardName,
    guardian_id: null,
    is_active: true,
  });
}
