import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { listPublicCaravans } from "@/use-cases/caravan/list-public-caravans";

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

  const supabase = createSupabaseServiceClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const caravanRepo = new SupabaseCaravanRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  const caravans = await listPublicCaravans(stake.id, {
    caravanRepository: caravanRepo,
  });

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-10 text-center">
        <Link
          href={`/${estaca_slug}`}
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 mb-4 transition"
        >
          ← Voltar à página da {stake.name}
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          Calendário de Caravanas ao Templo
        </h1>
        <p className="mt-3 text-base text-gray-600 max-w-2xl mx-auto">
          Confira as próximas viagens ao Templo de Recife da{" "}
          <span className="font-semibold text-gray-900">{stake.name}</span>. Garanta
          sua vaga e planeje sua adoração no templo.
        </p>
      </div>

      {/* Grid de Caravanas */}
      <div className="max-w-4xl mx-auto space-y-6">
        {caravans.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-4xl mb-3">🏛️</div>
            <h2 className="text-lg font-semibold text-gray-900">
              Nenhuma caravana com inscrições abertas no momento
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              A liderança da {stake.name} divulgará em breve novas datas de viagens ao
              Templo. Fique atento aos comunicados da sua Ala!
            </p>
          </div>
        ) : (
          caravans.map((caravan) => (
            <div
              key={caravan.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div className="p-6 sm:p-8">
                {/* Linha superior: datas e status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 mb-5 gap-3">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Viagem ao Templo de Recife
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      Saída: {caravan.departure_date}
                      {caravan.return_date && (
                        <span className="text-gray-500 text-base font-normal">
                          {" "}
                          • Retorno: {caravan.return_date}
                        </span>
                      )}
                    </h2>
                  </div>
                  <div>
                    {caravan.status === "open" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        ● Inscrições Abertas
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        ● {caravan.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vagas e Ocupação Agregada (US-002.2 — sem PII) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-gray-50 p-4 rounded-xl text-center">
                  <div>
                    <div className="text-2xl font-extrabold text-blue-600">
                      {caravan.available_seats}
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                      Vagas Disponíveis
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-800">
                      {caravan.confirmed_seats}
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                      Confirmadas
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-amber-600">
                      {caravan.validating_seats}
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                      Em Validação
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-600">
                      {caravan.waitlist_seats}
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                      Lista de Espera
                    </div>
                  </div>
                </div>

                {/* Detalhes: Tabela de Preços e Embarque */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  {/* Valores */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Tabela de Contribuição
                    </h3>
                    <ul className="space-y-1.5 text-gray-600">
                      <li className="flex justify-between">
                        <span>Padrão (Adulto / Jovem):</span>
                        <span className="font-semibold text-gray-900">
                          R$ {caravan.price_standard.toFixed(2)}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Oficiante do Templo:</span>
                        <span className="font-semibold text-gray-900">
                          R$ {caravan.price_officiant.toFixed(2)}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Criança de Colo (0-5 anos):</span>
                        <span className="font-semibold text-green-700">Gratuito</span>
                      </li>
                    </ul>
                  </div>

                  {/* Pontos de Embarque */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Pontos de Embarque
                    </h3>
                    {caravan.boarding_points.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Horários a serem divulgados pela liderança.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-gray-600">
                        {caravan.boarding_points.map((bp, i) => (
                          <li key={i} className="flex justify-between">
                            <span>📍 {bp.name}</span>
                            <span className="font-medium text-gray-900">
                              {bp.boarding_time.includes("T")
                                ? bp.boarding_time.split("T")[1]?.slice(0, 5) + "h"
                                : bp.boarding_time}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card com Prazos e Ação */}
                <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>
                      Inscrições até o domingo anterior:{" "}
                      <span className="font-medium text-gray-700">
                        {caravan.departure_date}
                      </span>
                    </div>
                    <div>
                      Verificação de quórum na terça anterior.
                    </div>
                  </div>

                  {caravan.status === "open" ? (
                    <Link
                      href={`/${estaca_slug}/caravanas/${caravan.id}/reservar`}
                      className="inline-flex justify-center items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
                    >
                      Reservar Assento →
                    </Link>
                  ) : (
                    <span className="inline-flex justify-center items-center px-4 py-2 bg-gray-100 text-gray-400 font-medium text-xs rounded-lg cursor-not-allowed">
                      Inscrições Fechadas
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
