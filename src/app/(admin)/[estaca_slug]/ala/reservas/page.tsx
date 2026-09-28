import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { confirmWardPaymentAction } from "@/app/(admin)/[estaca_slug]/actions";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export default async function AdminAlaReservasPage({ params }: Props) {
  const { estaca_slug } = await params;

  const serverClient = await createSupabaseServerClient();
  const { data: sessionData } = await serverClient.auth.getSession();

  if (!sessionData.session?.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = sessionData.session.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;
  const wardId = user.app_metadata?.ward_id;

  if (role !== "admin_ala" && role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  const supabase = createSupabaseServiceClient();

  // Busca o nome da Ala
  let wardName = "Sua Ala";
  if (wardId) {
    const { data: wardData } = await supabase
      .from("wards")
      .select("name")
      .eq("id", wardId)
      .single();
    if (wardData) wardName = wardData.name;
  }

  // Busca reservas pendentes da Ala
  const { data: pendingReservations, error } = await supabase
    .from("reservations")
    .select("*, profiles!inner(full_name, cpf, phone), caravans!inner(departure_date)")
    .eq("stake_id", stakeId)
    .eq("ward_id", wardId)
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

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
              Gerenciar Pagamentos da Ala — {wardName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Confirme os pagamentos recebidos pelos canais oficiais para avançar as reservas
              ao ciclo de validação semanal da Estaca.
            </p>
          </div>
        </div>

        {/* Tabela de Reservas Pendentes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Reservas Aguardando Confirmação de Pagamento ({pendingReservations?.length ?? 0})
            </h2>
          </div>

          {!pendingReservations || pendingReservations.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              Nenhuma reserva pendente de pagamento no momento para esta Ala.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Passageiro</th>
                    <th className="py-3 px-4">Poltrona</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Data Embarque</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingReservations.map((res: any) => {
                    const isOwnReservation = res.user_id === user.id;

                    return (
                      <tr key={res.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div>{res.profiles.full_name}</div>
                          <div className="text-[11px] text-slate-400">
                            CPF: {res.profiles.cpf || "Não informado"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-blue-700">
                          #{res.seat_number}
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          {res.category === "officiant" ? "Oficiante" : "Padrão"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          R$ {Number(res.payment_amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(res.caravans.departure_date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isOwnReservation ? (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                              Sua Reserva (Bloqueio de Autoaprovação)
                            </span>
                          ) : (
                            <form
                              action={async () => {
                                "use server";
                                await confirmWardPaymentAction(res.id);
                              }}
                            >
                              <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
                              >
                                Confirmar Pagamento ✓
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
