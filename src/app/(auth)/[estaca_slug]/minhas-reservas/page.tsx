import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { listOwnReservations } from "@/use-cases/reservation/list-own-reservations";
import { PublicHeader } from "@/components/ui/public-header";
import { ReservationStatusPanel } from "@/components/reservation/reservation-status";
import { ArrowLeftIcon, BusIcon, CalendarIcon, ClockIcon, LocationIcon } from "@/components/ui/icons";
import { formatBoardingTime, formatCurrency, formatDate } from "@/components/ui/format";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export default async function MinhasReservasPage({ params }: Props) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${estaca_slug}/auth/login`);

  const stake = await resolveStakeFromSlug(estaca_slug, new SupabaseStakeRepository(supabase));
  if (!stake) notFound();
  if (user.app_metadata.stake_id !== stake.id) notFound();

  const reservations = await listOwnReservations(user.id, stake.id, {
    reservationRepository: new SupabaseReservationRepository(supabase),
    caravanRepository: new SupabaseCaravanRepository(supabase),
  });

  return (
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} stakeName={stake.name} />
      <main id="conteudo-principal" className="py-8 sm:py-12">
        <div className="sgct-container max-w-5xl">
          <Link href={`/${estaca_slug}`} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
            <ArrowLeftIcon className="h-5 w-5" />
            Voltar para o início
          </Link>

          <div className="mb-8 sm:mb-10">
            <p className="sgct-eyebrow">Área do passageiro</p>
            <h1 className="sgct-title mt-3">Minhas reservas</h1>
            <p className="sgct-subtitle">
              Acompanhe seu assento, o reconhecimento do pagamento pela Ala e a confirmação da Estaca.
            </p>
          </div>

          {reservations.length === 0 ? (
            <div className="sgct-panel px-5 py-12 text-center sm:p-14">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <BusIcon className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-[#212225]">Você ainda não possui reservas</h2>
              <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-[#53575b]">
                Consulte as próximas caravanas, escolha uma viagem e reserve seu assento.
              </p>
              <Link href={`/${estaca_slug}/calendario`} className="sgct-button-primary mt-6">
                Ver próximas caravanas
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {reservations.map(({ reservation, caravan, boardingPoint }) => (
                <article key={reservation.id} className="sgct-panel overflow-hidden">
                  <header className="border-b border-[#e0e2e2] bg-[#f7f8f8] px-5 py-5 sm:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                          <BusIcon className="h-6 w-6" />
                        </span>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-[0.1em] text-brand-700">Caravana ao Templo de Recife</p>
                          <h2 className="mt-1 text-xl font-bold text-[#212225] sm:text-2xl">{formatDate(caravan.departure_date)}</h2>
                          {caravan.return_date && <p className="mt-0.5 text-sm text-[#53575b]">Retorno em {formatDate(caravan.return_date)}</p>}
                        </div>
                      </div>
                      <p className="text-sm text-[#676b6e]">Reserva feita em {formatDate(reservation.created_at)}</p>
                    </div>
                  </header>

                  <div className="p-5 sm:p-8">
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e0e2e2] bg-[#e0e2e2] md:grid-cols-4">
                      <div className="bg-white p-4">
                        <span className="block text-sm text-[#676b6e]">Assento</span>
                        <strong className="mt-1 block text-xl text-[#212225]">{reservation.seat_number}</strong>
                      </div>
                      <div className="bg-white p-4">
                        <span className="block text-sm text-[#676b6e]">Valor</span>
                        <strong className="mt-1 block text-lg text-[#212225]">{formatCurrency(reservation.payment_amount)}</strong>
                      </div>
                      <div className="bg-white p-4">
                        <span className="block text-sm text-[#676b6e]">Categoria</span>
                        <strong className="mt-1 block text-base text-[#212225]">{reservation.category === "officiant" ? "Oficiante" : "Padrão"}</strong>
                      </div>
                      <div className="bg-white p-4">
                        <span className="block text-sm text-[#676b6e]">Posição</span>
                        <strong className="mt-1 block text-base text-[#212225]">
                          {reservation.confirmation_rank ? `${reservation.confirmation_rank}ª` : "Em processamento"}
                        </strong>
                      </div>
                    </div>

                    <div className="my-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex gap-3 rounded-xl border border-[#e0e2e2] p-4">
                        <LocationIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                        <div>
                          <p className="text-sm font-semibold text-[#676b6e]">Ponto de embarque</p>
                          <p className="mt-1 font-bold text-[#212225]">{boardingPoint?.name ?? "A confirmar pela liderança"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-[#e0e2e2] p-4">
                        {boardingPoint ? <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /> : <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />}
                        <div>
                          <p className="text-sm font-semibold text-[#676b6e]">Horário de embarque</p>
                          <p className="mt-1 font-bold text-[#212225]">{boardingPoint ? formatBoardingTime(boardingPoint.boarding_time) : "A confirmar"}</p>
                        </div>
                      </div>
                    </div>

                    <ReservationStatusPanel status={reservation.status} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
