/**
 * Use-case: signUpMember (T001.1, T001.2)
 *
 * Cria a conta de um membro comum (adulto).
 *
 * Regras não-negociáveis:
 * - stake_id é SEMPRE derivado da ward_id (Artigo II.c da Constituição).
 * - A Ala informada deve pertencer à Estaca da rota atual (US-001.1).
 * - Validação Zod estrita antes de tocar o banco (Artigo V).
 */

import { signUpMemberSchema, type SignUpMemberInput } from "@/domain/schemas/auth";
import type { Profile } from "@/domain/types/tenant";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface SignUpMemberDependencies {
  authPort: AuthPort;
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function signUpMember(
  input: SignUpMemberInput,
  deps: SignUpMemberDependencies,
  expectedStakeId?: string
): Promise<Profile> {
  // Artigo V — Validação com Zod
  const parsed = signUpMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para cadastro.");
  }

  const { email, password, fullName, cpf, phone, birthDate, sexo, wardId } = parsed.data;

  // Buscar a Ala para derivar a Estaca de forma segura
  const ward = await deps.wardRepository.findById(wardId);
  if (!ward) {
    throw new Error("Ala informada não foi encontrada.");
  }

  // Se a rota define um contexto de Estaca, validar isolamento
  if (expectedStakeId && ward.stake_id !== expectedStakeId) {
    throw new Error("A Ala selecionada não pertence a esta Estaca.");
  }

  // 1. Criar o usuário no Auth
  const { userId } = await deps.authPort.signUp({
    email,
    password,
    fullName,
    metadata: {
      role: "member",
      stake_id: ward.stake_id,
      ward_id: ward.id,
    },
  });

  // 2. Criar o Profile com stake_id derivado da Ala (Artigo II.c)
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
    guardian_id: null,
    is_active: true,
  });
}
