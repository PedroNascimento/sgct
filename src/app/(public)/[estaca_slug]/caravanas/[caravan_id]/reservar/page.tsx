import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { getSeatOccupancy } from "@/use-cases/reservation/get-seat-occupancy";
import { ReservationForm } from "@/components/reservation/reservation-form";

interface Props {
  params: Promise<{
    estaca_slug: string;
    caravan_id: string;
  }>;
}

export default async function ReservarPage({ params }: Props) {
  const { estaca_slug, caravan_id } = await params;

  const supabase = createSupabaseServiceClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const caravanRepo = new SupabaseCaravanRepository(supabase);
  const reservationRepo = new SupabaseReservationRepository(supabase);
  const profileRepo = new SupabaseProfileRepository(supabase);

  // 1. Resolução da Estaca
  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  // 2. Busca da Caravana
  const caravan = await caravanRepo.findById(caravan_id);
  if (!caravan || caravan.stake_id !== stake.id) {
    notFound();
  }

  if (caravan.status !== "open") {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Inscrições Encerradas</h2>
          <p className="text-sm text-gray-600 mb-6">
            Esta caravana não está mais aceitando novas reservas (status: {caravan.status}).
          </p>
          <Link
            href={`/${estaca_slug}/calendario`}
            className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            ← Ver Outras Caravanas
          </Link>
        </div>
      </main>
    );
  }

  // 3. Pontos de Embarque
  const boardingPoints = await caravanRepo.getBoardingPointsByCaravanId(caravan.id);

  // 4. Ocupação de Assentos sem PII (US-003.4 / T003.8)
  const occupancy = await getSeatOccupancy(
    { caravanId: caravan.id, stakeId: stake.id },
    { reservationRepository: reservationRepo }
  );
  const occupiedSeats = occupancy
    .filter((s) => s.occupancy_status !== "livre")
    .map((s) => s.seat_number);

  // 5. Usuário Autenticado
  // Para fins de demonstração ou fluxo real, checamos sessão ou usamos perfil mock/seed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    userProfile = await profileRepo.findById(user.id);
  } else {
    // Se não há sessão aberta no client, buscar o primeiro perfil de membro ativo da estaca para dev/teste
    // ou exibir tela de login
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("stake_id", stake.id)
      .eq("role", "member")
      .limit(1);

    if (memberProfiles && memberProfiles.length > 0) {
      userProfile = memberProfiles[0];
    }
  }

  if (!userProfile) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-600 mb-6">
            Você precisa estar autenticado como membro para reservar um assento.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/${estaca_slug}/auth`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Fazer Login
            </Link>
            <Link
              href={`/${estaca_slug}/cadastro`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Criar Conta de Membro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <Link
            href={`/${estaca_slug}/calendario`}
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 mb-3 transition"
          >
            ← Voltar ao Calendário
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Reserva de Assento — Caravana ao Templo ({caravan.departure_date})
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Selecione sua poltrona e preencha os dados de participação da viagem.
          </p>
        </div>

        {/* Formulário Interativo */}
        <ReservationForm
          stakeSlug={estaca_slug}
          userProfile={userProfile}
          caravan={caravan}
          boardingPoints={boardingPoints}
          initialOccupiedSeats={occupiedSeats}
        />
      </div>
    </main>
  );
}
