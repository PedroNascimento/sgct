/**
 * Use-case: Adicionar Criança de Colo ao Manifesto de Passageiros (Spec 003 / US-003.3 / D06).
 *
 * Regras:
 * - Criança de colo deve ter entre 0 e 5 anos na data de partida da caravana.
 * - Não ocupa assento (sem seat_number).
 * - Não gera cobrança (sem payment_amount).
 * - Não conta para o limite de assentos da caravana.
 * - Vinculado à reserva do responsável autenticado.
 */

import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { PassengerManifestEntry } from "@/domain/types/reservation";
import { addManifestEntrySchema } from "@/domain/schemas/reservation";

export interface AddManifestEntryInput {
  userId: string;
  reservationId: string;
  fullName: string;
  birthDate: string;
  filiation: string;
}

export interface AddManifestEntryDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
}

function calculateAge(birthDateStr: string, referenceDateStr: string): number {
  const birth = new Date(birthDateStr);
  const ref = new Date(referenceDateStr);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function addManifestEntry(
  input: AddManifestEntryInput,
  deps: AddManifestEntryDependencies
): Promise<PassengerManifestEntry> {
  const { reservationRepository, caravanRepository } = deps;

  // 1. Validação de schema de entrada
  const validated = addManifestEntrySchema.parse({
    reservationId: input.reservationId,
    fullName: input.fullName,
    birthDate: input.birthDate,
    filiation: input.filiation,
  });

  // 2. Busca e validação da reserva
  const reservation = await reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada.");
  }

  if (reservation.user_id !== input.userId) {
    throw new Error("Não autorizado: a reserva não pertence a este usuário.");
  }

  if (reservation.status.startsWith("cancelada")) {
    throw new Error("Não é possível adicionar criança de colo a uma reserva cancelada.");
  }

  // 3. Busca a caravana para conferir data da viagem
  const caravan = await caravanRepository.findById(reservation.caravan_id);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  // 4. Validação de idade da criança de colo (0 a 5 anos na data de partida)
  const age = calculateAge(validated.birthDate, caravan.departure_date);
  if (age < 0) {
    throw new Error("Data de nascimento inválida (posterior à data da caravana).");
  }
  if (age > 5) {
    throw new Error("Criança de colo deve ter até 5 anos de idade na data da caravana.");
  }

  // 5. Inserção no manifesto (não altera assento nem cobrança)
  const entry = await reservationRepository.addManifestEntry({
    reservation_id: reservation.id,
    full_name: validated.fullName,
    birth_date: validated.birthDate,
    filiation: validated.filiation,
  });

  return entry;
}
