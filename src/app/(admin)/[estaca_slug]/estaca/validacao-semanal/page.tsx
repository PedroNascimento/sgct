import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { validateWeeklyTransfersAction } from "@/app/(admin)/[estaca_slug]/actions";

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
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <Link
              href={`/${estaca_slug}`}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold mb-2 inline-block"
            >
              ← Voltar ao Início
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Validação Semanal de Transferências — Estaca
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Valide as transferências enviadas pelas Alas toda terça-feira para confirmar as vagas
              e reordenar o ranking oficial dos 50 assentos.
            </p>
          </div>
        </div>

        {/* Lista de Caravanas */}
        <div className="space-y-6">
          {caravansWithCounts.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm shadow-sm">
              Nenhuma caravana com inscrições abertas no momento.
            </div>
          ) : (
            caravansWithCounts.map((c) => (
              <div
                key={c.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Caravana ao Templo — {new Date(c.departure_date).toLocaleDateString("pt-BR")}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Limite: {c.seat_limit} assentos | Quórum mínimo: {c.min_quorum} pessoas
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
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition ${
                          c.pagoAlaCount === 0
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
                        }`}
                      >
                        Validar em Lote ({c.pagoAlaCount} Pagamentos da Ala)
                      </button>
                    </form>
                  </div>
                </div>

                {c.isEmbarkmentWeek && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      Esta caravana está na <strong>semana do embarque</strong> (≤ 7 dias). O job
                      automático de terça-feira está desativado; as validações devem ser feitas de forma
                      contínua pela liderança.
                    </span>
                  </div>
                )}

                {/* Lista de Reservas Pendentes de Validação da Estaca */}
                {c.pagoAlaCount > 0 ? (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Passageiro</th>
                          <th className="py-2.5 px-3">Ala</th>
                          <th className="py-2.5 px-3">Poltrona</th>
                          <th className="py-2.5 px-3">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {c.pagoAlaList.map((res: any) => (
                          <tr key={res.id}>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {res.profiles.full_name}
                            </td>
                            <td className="py-2.5 px-3">{res.wards.name}</td>
                            <td className="py-2.5 px-3 font-semibold text-blue-700">
                              #{res.seat_number}
                            </td>
                            <td className="py-2.5 px-3">
                              R$ {Number(res.payment_amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
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
