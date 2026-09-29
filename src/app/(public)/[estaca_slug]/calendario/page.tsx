import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { listPublicCaravans } from "@/use-cases/caravan/list-public-caravans";
import { PublicHeader } from "@/components/ui/public-header";
import { ArrowLeftIcon, ArrowRightIcon, BusIcon, CalendarIcon, ClockIcon, LocationIcon } from "@/components/ui/icons";
import { formatBoardingTime, formatCurrency, formatDate } from "@/components/ui/format";

/** Status exibíveis na lista pública de inscritos */
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  confirmado:    { label: "Confirmado",      color: "text-success-700 bg-success-50 border-success-200" },
  presente:      { label: "Presente",        color: "text-success-700 bg-success-50 border-success-200" },
  pago_ala:      { label: "Em validação",    color: "text-warning-700 bg-warning-50 border-warning-200" },
  aguardando_auxilio: { label: "Ag. auxílio", color: "text-warning-700 bg-warning-50 border-warning-200" },
  pendente:      { label: "Pendente",        color: "text-[#53575b] bg-[#f7f8f8] border-[#e0e2e2]" },
  lista_espera:  { label: "Lista de espera", color: "text-[#53575b] bg-[#f7f8f8] border-[#e0e2e2]" },
};

/** Ordem de prioridade para exibição (menor = primeiro) */
const STATUS_ORDER: Record<string, number> = {
  confirmado: 1,
  presente: 1,
  pago_ala: 2,
  aguardando_auxilio: 2,
  aguardando_transferencia_interestaca: 2,
  pendente: 3,
  lista_espera: 4,
};

interface ReservationRow {
  id: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  confirmation_rank: number | null;
  profiles: { full_name: string } | null;
  wards: { name: string } | null;
}


interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const revalidate = 60; // ISR — revalida a cada 60 segundos

/**
 * Página Pública de Calendário de Caravanas (T002.8 / US-002.2)
 * Rota: (public)/[estaca_slug]/calendario
 *
 * Exibe as caravanas da Estaca com status agregado de ocupação e sem PII.
 */
export default async function PublicCalendarioPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const caravanRepo = new SupabaseCaravanRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  const caravans = await listPublicCaravans(stake.id, {
    caravanRepository: caravanRepo,
  });

  // Busca os inscritos de todas as caravanas listadas via service client
  // (RLS de reservations restringe leituras anônimas, mas a lista pública
  //  expõe apenas nome, Ala e status — sem PII sensível)
  const serviceClient = createSupabaseServiceClient();
  const caravanIds = caravans.map((c) => c.id);

  const reservationsByCaravan: Record<string, ReservationRow[]> = {};

  if (caravanIds.length > 0) {
    const { data: rawReservations } = await serviceClient
      .from("reservations")
      .select("id, caravan_id, status, created_at, confirmed_at, confirmation_rank, profiles(full_name), wards(name)")
      .in("caravan_id", caravanIds)
      .not("status", "in", "(cancelada_com_credito,cancelada_sem_credito,expirada,no_show)")
      .order("created_at", { ascending: true });

    if (rawReservations) {
      for (const row of rawReservations as any[]) {
        const profileData = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const wardData = Array.isArray(row.wards) ? row.wards[0] : row.wards;
        if (!profileData) continue;
        const caravanId = row.caravan_id;
        if (!reservationsByCaravan[caravanId]) reservationsByCaravan[caravanId] = [];
        reservationsByCaravan[caravanId].push({
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          confirmed_at: row.confirmed_at,
          confirmation_rank: row.confirmation_rank,
          profiles: profileData,
          wards: wardData,
        });
      }
    }
  }

  /**
   * Ordena a lista: confirmados primeiro (por confirmation_rank),
   * depois em validação (por created_at), depois pendentes, depois lista de espera.
   */
  function sortReservations(list: ReservationRow[]): ReservationRow[] {
    return [...list].sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 9;
      const orderB = STATUS_ORDER[b.status] ?? 9;
      if (orderA !== orderB) return orderA - orderB;
      // Dentro do mesmo grupo: confirmados por rank, demais por created_at
      if (a.status === "confirmado" && b.status === "confirmado") {
        return (a.confirmation_rank ?? 999) - (b.confirmation_rank ?? 999);
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

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
            <p className="sgct-eyebrow">Próximas viagens</p>
            <h1 className="sgct-title mt-3">Caravanas ao Templo de Recife</h1>
            <p className="sgct-subtitle">
              Veja as datas organizadas pela <strong className="font-semibold text-[#212225]">{stake.name}</strong> e escolha a melhor viagem para você.
            </p>
          </div>

          <div className="space-y-6">
        {caravans.length === 0 ? (
          <div className="sgct-panel px-5 py-12 text-center sm:p-14">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <CalendarIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-[#212225]">Ainda não há caravanas abertas</h2>
            <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-[#53575b]">
              A liderança da {stake.name} divulgará aqui as próximas datas. Consulte novamente após o próximo comunicado da sua Ala.
            </p>
          </div>
        ) : (
          caravans.map((caravan) => (
            <article key={caravan.id} className="sgct-panel overflow-hidden">
              <div className="border-b border-[#e0e2e2] bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-6 text-white sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
                      <BusIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand-200">Viagem ao templo</p>
                      <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                        {formatDate(caravan.departure_date)}
                      </h2>
                      {caravan.return_date && (
                        <p className="mt-1 text-sm text-brand-100">Retorno em {formatDate(caravan.return_date)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`sgct-chip w-fit border-white/20 ${caravan.status === "open" ? "bg-white text-success-700" : "bg-warning-50 text-warning-700"}`}>
                    <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                    {caravan.status === "open" ? "Inscrições abertas" : "Inscrições indisponíveis"}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e0e2e2] bg-[#e0e2e2] sm:grid-cols-4">
                  {[
                    [caravan.available_seats, "Vagas disponíveis", "text-brand-700"],
                    [caravan.confirmed_seats, "Confirmadas", "text-success-700"],
                    [caravan.validating_seats, "Em validação", "text-warning-700"],
                    [caravan.waitlist_seats, "Lista de espera", "text-[#53575b]"],
                  ].map(([value, label, color]) => (
                    <div key={String(label)} className="bg-[#f7f8f8] p-4 text-center">
                      <div className={`text-2xl font-bold ${color}`}>{value}</div>
                      <div className="mt-1 text-sm font-semibold leading-tight text-[#53575b]">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 grid gap-7 md:grid-cols-2">
                  <section>
                    <h3 className="text-base font-bold text-[#212225]">Contribuição da viagem</h3>
                    <ul className="mt-3 divide-y divide-[#e0e2e2] text-sm text-[#53575b]">
                      <li className="flex justify-between gap-3 py-2.5">
                        <span>Adulto ou jovem</span>
                        <strong className="text-[#212225]">{formatCurrency(caravan.price_standard)}</strong>
                      </li>
                      <li className="flex justify-between gap-3 py-2.5">
                        <span>Oficiante do Templo</span>
                        <strong className="text-[#212225]">{formatCurrency(caravan.price_officiant)}</strong>
                      </li>
                      <li className="flex justify-between gap-3 py-2.5">
                        <span>Criança de colo (0 a 5 anos)</span>
                        <strong className="text-success-700">Gratuito</strong>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-base font-bold text-[#212225]">Embarque</h3>
                    {caravan.boarding_points.length === 0 ? (
                      <p className="mt-3 text-sm leading-relaxed text-[#53575b]">
                        Locais e horários serão divulgados pela liderança.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {caravan.boarding_points.map((bp) => (
                          <li key={`${bp.name}-${bp.boarding_time}`} className="flex items-center gap-3 text-sm text-[#53575b]">
                            <LocationIcon className="h-5 w-5 shrink-0 text-brand-700" />
                            <span className="min-w-0 flex-1">{bp.name}</span>
                            <span className="inline-flex items-center gap-1.5 font-bold text-[#212225]">
                              <ClockIcon className="h-4 w-4" />
                              {formatBoardingTime(bp.boarding_time)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <div className="mt-7 flex flex-col gap-4 border-t border-[#e0e2e2] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3 text-sm leading-relaxed text-[#53575b]">
                    <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                    <p>
                      Inscrições até o domingo anterior.<br />
                      Verificação de quórum na terça anterior.
                    </p>
                  </div>

                  {caravan.status === "open" ? (
                    <Link
                      href={`/${estaca_slug}/caravanas/${caravan.id}/reservar`}
                      className="sgct-button-primary w-full sm:w-auto"
                    >
                      Escolher assento
                      <ArrowRightIcon className="h-5 w-5" />
                    </Link>
                  ) : (
                    <span className="sgct-button-quiet w-full text-[#676b6e] sm:w-auto" aria-disabled="true">
                      Inscrições fechadas
                    </span>
                  )}
                </div>

                {/* ─── Lista de inscritos ─── */}
                {(() => {
                  const members = sortReservations(reservationsByCaravan[caravan.id] ?? []);
                  if (members.length === 0) return null;

                  // Separar confirmados/validação da lista de espera
                  const active = members.filter((r) => r.status !== "lista_espera");
                  const waiting = members.filter((r) => r.status === "lista_espera");

                  return (
                    <section className="mt-7 border-t border-[#e0e2e2] pt-6" aria-label="Membros inscritos">
                      <h3 className="text-base font-bold text-[#212225]">
                        Membros inscritos{" "}
                        <span className="ml-1 text-sm font-normal text-[#53575b]">({active.length} inscrição{active.length !== 1 ? "s" : ""})</span>
                      </h3>

                      <div className="mt-4 overflow-hidden rounded-xl border border-[#e0e2e2]">
                        <table className="w-full text-sm" role="table" aria-label="Lista de inscritos na caravana">
                          <thead>
                            <tr className="border-b border-[#e0e2e2] bg-[#f7f8f8]">
                              <th scope="col" className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[#53575b]">#</th>
                              <th scope="col" className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[#53575b]">Nome</th>
                              <th scope="col" className="hidden px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[#53575b] sm:table-cell">Ala</th>
                              <th scope="col" className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-[#53575b]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e0e2e2]">
                            {active.map((r, idx) => {
                              const wardName = (r.wards as { name: string } | null)?.name ?? "—";
                              const fullName = (r.profiles as { full_name: string } | null)?.full_name ?? "—";
                              const badge = STATUS_LABEL[r.status] ?? { label: r.status, color: "text-[#53575b] bg-[#f7f8f8] border-[#e0e2e2]" };
                              return (
                                <tr key={r.id} className="bg-white hover:bg-[#f7f8f8] transition-colors">
                                  <td className="px-4 py-3 text-xs font-bold text-[#8d9194] tabular-nums">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium text-[#212225]">
                                    <span>{fullName}</span>
                                    {/* Ala visível inline no mobile */}
                                    <span className="block text-xs text-[#53575b] sm:hidden">{wardName}</span>
                                  </td>
                                  <td className="hidden px-4 py-3 text-[#53575b] sm:table-cell">{wardName}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Lista de espera */}
                      {waiting.length > 0 && (
                        <details className="mt-4 group">
                          <summary className="cursor-pointer select-none text-sm font-semibold text-[#53575b] hover:text-[#212225] list-none flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e0e2e2] text-xs font-bold text-[#53575b]">
                              {waiting.length}
                            </span>
                            Lista de espera
                            <span className="ml-auto text-xs font-normal text-[#8d9194] group-open:hidden">▼ ver</span>
                            <span className="ml-auto text-xs font-normal text-[#8d9194] hidden group-open:inline">▲ ocultar</span>
                          </summary>
                          <div className="mt-3 overflow-hidden rounded-xl border border-[#e0e2e2]">
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-[#e0e2e2]">
                                {waiting.map((r, idx) => {
                                  const wardName = (r.wards as { name: string } | null)?.name ?? "—";
                                  const fullName = (r.profiles as { full_name: string } | null)?.full_name ?? "—";
                                  return (
                                    <tr key={r.id} className="bg-white hover:bg-[#f7f8f8] transition-colors">
                                      <td className="px-4 py-3 text-xs font-bold text-[#8d9194] tabular-nums">{idx + 1}º</td>
                                      <td className="px-4 py-3 font-medium text-[#212225]">
                                        <span>{fullName}</span>
                                        <span className="block text-xs text-[#53575b] sm:hidden">{wardName}</span>
                                      </td>
                                      <td className="hidden px-4 py-3 text-[#53575b] sm:table-cell">{wardName}</td>
                                      <td className="px-4 py-3 text-right">
                                        <span className="inline-flex items-center rounded-full border border-[#e0e2e2] bg-[#f7f8f8] px-2.5 py-0.5 text-xs font-semibold text-[#53575b]">
                                          Lista de espera
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </section>
                  );
                })()}
              </div>
            </article>
          ))
        )}
          </div>
        </div>
      </main>
      </div>
  );
}
