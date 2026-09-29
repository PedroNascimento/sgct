import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { validateWeeklyTransfersAction } from "@/app/(admin)/[estaca_slug]/actions";
import { AlertIcon, CheckIcon } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/components/ui/format";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export default async function AdminEstacaValidacaoSemanalPage({ params }: Props) {
  const { estaca_slug } = await params;

  const serverClient = await createSupabaseServerClient();
  const { data: userData } = await serverClient.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;

  if (role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  const supabase = serverClient;

  // Busca caravanas abertas da Estaca
  const { data: caravans } = await supabase
    .from("caravans")
    .select("*")
    .eq("stake_id", stakeId)
    .eq("status", "open")
    .order("departure_date", { ascending: true });

  // Busca contagem de reservas pago_ala por caravana
  const caravansWithCounts = await Promise.all(
    (caravans ?? []).map(async (c) => {
      const { data: pagoAlaReservations } = await supabase
        .from("reservations")
        .select("id, payment_amount, seat_number, profiles!inner(full_name), wards!inner(name)")
        .eq("caravan_id", c.id)
        .eq("status", "pago_ala");

      const now = new Date();
      const depDate = new Date(c.departure_date);
      const diffDays = (depDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const isEmbarkmentWeek = diffDays <= 7;

      return {
        ...c,
        pagoAlaList: pagoAlaReservations ?? [],
        pagoAlaCount: pagoAlaReservations?.length ?? 0,
        isEmbarkmentWeek,
      };
    })
  );

  return (
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Cabeçalho */}
        <div>
            <p className="sgct-eyebrow">Ciclo financeiro</p>
            <h1 className="sgct-title mt-3">Validação semanal</h1>
            <p className="sgct-subtitle">
              Valide as transferências enviadas pelas Alas toda terça-feira para confirmar as vagas
              e reordenar o ranking oficial dos 50 assentos.
            </p>
        </div>

        {/* Lista de Caravanas */}
        <div className="space-y-6">
          {caravansWithCounts.length === 0 ? (
            <div className="sgct-panel p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-700"><CheckIcon className="h-7 w-7" /></span>
              <h2 className="mt-4 text-lg font-bold text-[#212225]">Nenhuma validação pendente</h2>
              <p className="mt-2 text-base text-[#53575b]">Não há caravanas com inscrições abertas no momento.</p>
            </div>
          ) : (
            caravansWithCounts.map((c) => (
              <div
                key={c.id}
                className="sgct-card space-y-5 p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#212225]">
                      Caravana de {formatDate(c.departure_date)}
                    </h2>
                    <p className="mt-1 text-sm text-[#53575b]">
                      {c.seat_limit} assentos · quórum mínimo de {c.min_quorum} pessoas
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <form
                      action={async () => {
                        "use server";
                        await validateWeeklyTransfersAction(c.id);
                      }}
                    >
                      <button
                        type="submit"
                        disabled={c.pagoAlaCount === 0}
                        className={`sgct-button w-full sm:w-auto ${
                          c.pagoAlaCount === 0
                            ? "bg-[#e0e2e2] text-[#676b6e]"
                            : "cursor-pointer bg-brand-600 text-white hover:bg-brand-700"
                        }`}
                      >
                        Validar {c.pagoAlaCount} pagamento(s)
                      </button>
                    </form>
                  </div>
                </div>

                {c.isEmbarkmentWeek && (
                  <div className="sgct-alert-warning flex gap-3">
                    <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      Esta caravana está na <strong>semana do embarque</strong> (≤ 7 dias). O job
                      automático de terça-feira está desativado; as validações devem ser feitas de forma
                      contínua pela liderança.
                    </span>
                  </div>
                )}

                {/* Lista de Reservas Pendentes de Validação da Estaca */}
                {c.pagoAlaCount > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-[#e0e2e2]">
                    <div className="divide-y divide-[#e0e2e2] md:hidden">
                      {c.pagoAlaList.map((res: any) => (
                        <div key={res.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="font-bold text-[#212225]">{res.profiles.full_name}</p><p className="mt-1 text-sm text-[#53575b]">{res.wards.name} · assento {res.seat_number}</p></div>
                            <strong className="text-brand-700">{formatCurrency(Number(res.payment_amount))}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                    <table className="hidden w-full text-left text-sm md:table">
                      <thead className="bg-[#f7f8f8] text-xs font-bold uppercase tracking-wider text-[#53575b]">
                        <tr>
                          <th className="py-2.5 px-3">Passageiro</th>
                          <th className="py-2.5 px-3">Ala</th>
                          <th className="py-2.5 px-3">Poltrona</th>
                          <th className="py-2.5 px-3">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0e2e2] text-[#3a3d40]">
                        {c.pagoAlaList.map((res: any) => (
                          <tr key={res.id}>
                            <td className="px-3 py-3 font-semibold text-[#212225]">
                              {res.profiles.full_name}
                            </td>
                            <td className="py-2.5 px-3">{res.wards.name}</td>
                            <td className="px-3 py-3 font-semibold text-brand-700">
                              {res.seat_number}
                            </td>
                            <td className="py-2.5 px-3">
                              {formatCurrency(Number(res.payment_amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-[#f7f8f8] p-4 text-sm text-[#53575b]">
                    Nenhum pagamento registrado pelas Alas aguardando validação para esta caravana.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
