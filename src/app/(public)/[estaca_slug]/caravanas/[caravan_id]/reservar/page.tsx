import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { getSeatOccupancy } from "@/use-cases/reservation/get-seat-occupancy";
import { ReservationForm } from "@/components/reservation/reservation-form";
import { PublicHeader } from "@/components/ui/public-header";
import { ArrowLeftIcon, CalendarIcon, InfoIcon } from "@/components/ui/icons";
import { formatDate } from "@/components/ui/format";

interface Props {
  params: Promise<{
    estaca_slug: string;
    caravan_id: string;
  }>;
}

export default async function ReservarPage({ params }: Props) {
  const { estaca_slug, caravan_id } = await params;

  const supabase = await createSupabaseServerClient();
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
      <main id="conteudo-principal" className="sgct-page py-12">
        <div className="sgct-narrow">
        <div className="sgct-panel p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-700"><InfoIcon className="h-7 w-7" /></span>
          <h2 className="mt-5 text-2xl font-bold text-[#212225]">Inscrições encerradas</h2>
          <p className="mx-auto mb-6 mt-2 max-w-md text-base leading-relaxed text-[#53575b]">
            Esta caravana não está aceitando novas reservas. Consulte o calendário para ver outras datas.
          </p>
          <Link
            href={`/${estaca_slug}/calendario`}
            className="sgct-button-primary"
          >
            Ver outras caravanas
          </Link>
        </div>
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    userProfile = await profileRepo.findById(user.id);
  }

  if (!userProfile) {
    return (
      <main id="conteudo-principal" className="sgct-page py-12">
        <div className="sgct-narrow max-w-lg">
        <div className="sgct-panel p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><InfoIcon className="h-7 w-7" /></span>
          <h2 className="mt-5 text-2xl font-bold text-[#212225]">Entre para reservar</h2>
          <p className="mx-auto mb-6 mt-2 max-w-md text-base leading-relaxed text-[#53575b]">
            Você precisa estar autenticado como membro para reservar um assento.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/${estaca_slug}/auth/login`}
              className="sgct-button-primary"
            >
              Fazer Login
            </Link>
            <Link
              href={`/${estaca_slug}/cadastro`}
              className="sgct-button-secondary"
            >
              Criar Conta de Membro
            </Link>
          </div>
        </div>
        </div>
      </main>
    );
  }

  return (
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} stakeName={stake.name} />
    <main id="conteudo-principal" className="py-8 sm:py-12">
      <div className="sgct-container max-w-4xl">
        {/* Cabeçalho */}
        <div className="mb-8">
          <Link
            href={`/${estaca_slug}/calendario`}
            className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Voltar para as caravanas
          </Link>
          <p className="sgct-eyebrow">Reserva de assento</p>
          <h1 className="sgct-title mt-3">Caravana de {formatDate(caravan.departure_date)}</h1>
          <p className="sgct-subtitle">Escolha seu assento e confira os dados da viagem antes de registrar a reserva.</p>
          <div className="sgct-alert-info mt-6 flex gap-3">
            <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong>Importante:</strong> o assento fica reservado, mas a viagem só é confirmada após o pagamento e a validação da Estaca.</p>
          </div>
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
    </div>
  );
}
