/**
 * Use-case: signUpMinor (T001.3, T001.4)
 *
 * Cadastro de conta própria para jovens de 12 a 17 anos (US-001.2).
 *
 * Regras não-negociáveis:
 * - Idade permitida para conta própria: estritamente 12 a 17 anos.
 * - guardian_id é OPCIONAL, nunca obrigatório (D07).
 * - Consentimento do responsável obrigatório no payload (Constituição Artigo VI).
 * - stake_id é sempre derivado da Ward (Artigo II.c).
 */

import { signUpMinorSchema, type SignUpMinorInput } from "@/domain/schemas/auth";
import type { Profile } from "@/domain/types/tenant";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface SignUpMinorDependencies {
  authPort: AuthPort;
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

/**
 * Calcula a idade em anos a partir de uma string de data YYYY-MM-DD.
 */
function calculateAge(birthDateString: string): number {
  const birthDate = new Date(birthDateString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export async function signUpMinor(
  input: SignUpMinorInput,
  deps: SignUpMinorDependencies,
  expectedStakeId?: string
): Promise<Profile> {
  // Artigo V — Validação Zod
  const parsed = signUpMinorSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para cadastro de menor.");
  }

  const { email, password, fullName, cpf, phone, birthDate, sexo, wardId, guardianId } = parsed.data;

  // Validar faixa etária (12 a 17 anos)
  const age = calculateAge(birthDate);
  if (age < 12) {
    throw new Error("Cadastro próprio disponível apenas para jovens de 12 a 17 anos.");
  }
  if (age >= 18) {
    throw new Error("Usuários com 18 anos ou mais devem utilizar o cadastro regular de membro.");
  }

  // Validar Ala e derivar Estaca de forma confiável
  const ward = await deps.wardRepository.findById(wardId);
  if (!ward) {
    throw new Error("Ala informada não foi encontrada.");
  }

  if (expectedStakeId && ward.stake_id !== expectedStakeId) {
    throw new Error("A Ala selecionada não pertence a esta Estaca.");
  }

  // Se o menor optou por vincular um responsável, validar se o responsável existe
  if (guardianId) {
    const guardian = await deps.profileRepository.findById(guardianId);
    if (!guardian) {
      throw new Error("Responsável informado não foi encontrado.");
    }
  }

  // 1. Criar usuário no Auth
  const { userId } = await deps.authPort.signUp({
    email,
    password,
    fullName,
    metadata: {
      role: "member",
      stake_id: ward.stake_id,
      ward_id: ward.id,
      is_minor: true,
    },
  });

  // 2. Criar Profile
  return deps.profileRepository.insert({
    id: userId,
    stake_id: ward.stake_id,
    ward_id: ward.id,
    full_name: fullName,
    birth_date: birthDate,
    sexo,
    cpf,
    phone,
    role: "member",
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: guardianId ?? null,
    is_active: true,
  });
}
