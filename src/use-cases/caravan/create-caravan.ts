/**
 * Use-case: createCaravan (T002.1, T002.2)
 *
 * Criação de Caravana e Pontos de Embarque por um Admin de Estaca (US-002.1).
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode criar caravana (Artigo II.e).
 * - O stake_id é SEMPRE derivado da sessão do admin_estaca (Artigo II.c).
 *   Qualquer valor de stake_id enviado pelo cliente é deliberadamente ignorado.
 * - Validação Zod estrita de datas e valores (Artigo V).
 * - Cadastra ao menos um ponto de embarque (boarding_points) com o mesmo stake_id.
 */

import { createCaravanSchema, type CreateCaravanInput } from "@/domain/schemas/caravan";
import type { Caravan } from "@/domain/types/caravan";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface CreateCaravanDependencies {
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
}

export async function createCaravan(
  input: CreateCaravanInput,
  actingAdminEstacaId: string,
  deps: CreateCaravanDependencies
): Promise<Caravan> {
  // 1. Validação Zod (Artigo V)
  const parsed = createCaravanSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para criação da caravana.");
  }

  const {
    departureDate,
    returnDate,
    priceStandard,
    priceOfficiant,
    seatLimit,
    waitlistLimit,
    registrationDeadline,
    minQuorum,
    quorumCheckDate,
    caravanLeaderId,
    boardingPoints,
  } = parsed.data;

  // 2. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem criar caravanas.");
  }

  // 3. Criar a Caravana garantindo isolamento de Estaca (Artigo II.c)
  const caravan = await deps.caravanRepository.create({
    stake_id: actingAdmin.stake_id,
    departure_date: departureDate,
    return_date: returnDate ?? null,
    price_standard: priceStandard,
    price_officiant: priceOfficiant,
    seat_limit: seatLimit,
    waitlist_limit: waitlistLimit,
    registration_deadline: registrationDeadline,
    min_quorum: minQuorum,
    quorum_check_date: quorumCheckDate,
    status: "open",
    caravan_leader_id: caravanLeaderId ?? null,
    created_by: actingAdmin.id,
  });

  // 4. Cadastrar os Pontos de Embarque vinculados à Caravana e à Estaca
  const createdBoardingPoints = [];
  for (const bp of boardingPoints) {
    const createdPoint = await deps.caravanRepository.addBoardingPoint({
      caravan_id: caravan.id,
      stake_id: actingAdmin.stake_id,
      name: bp.name,
      boarding_time: bp.boardingTime,
    });
    createdBoardingPoints.push(createdPoint);
  }

  return {
    ...caravan,
    boarding_points: createdBoardingPoints,
  };
}
