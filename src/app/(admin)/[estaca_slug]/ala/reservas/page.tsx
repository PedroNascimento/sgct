import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { confirmWardPaymentAction } from "@/app/(admin)/[estaca_slug]/actions";
import { formatCurrency, formatDate } from "@/components/ui/format";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export default async function AdminAlaReservasPage({ params }: Props) {
  const { estaca_slug } = await params;

  const serverClient = await createSupabaseServerClient();
  const { data: userData } = await serverClient.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;
  const wardId = user.app_metadata?.ward_id;

  if (role !== "admin_ala" && role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  const supabase = serverClient;

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
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Cabeçalho */}
        <div>
          <div>
            <p className="sgct-eyebrow">{wardName}</p>
            <h1 className="sgct-title mt-3">Pagamentos da Ala</h1>
            <p className="sgct-subtitle">
              Confirme os pagamentos recebidos pelos canais oficiais para avançar as reservas
              ao ciclo de validação semanal da Estaca.
            </p>
          </div>
        </div>

        {/* Tabela de Reservas Pendentes */}
        <section className="sgct-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e0e2e2] p-5 sm:px-6">
            <div>
            <h2 className="text-lg font-bold text-[#212225]">Aguardando confirmação</h2>
            <p className="mt-1 text-sm text-[#53575b]">{pendingReservations?.length ?? 0} reserva(s) pendente(s)</p>
            </div>
            <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-warning-50 px-3 font-bold text-warning-700">{pendingReservations?.length ?? 0}</span>
          </div>

          {error && (
            <div role="alert" className="sgct-alert-danger m-5">Não foi possível carregar as reservas. Tente novamente.</div>
          )}

          {!pendingReservations || pendingReservations.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-bold text-[#212225]">Tudo em dia</h3>
              <p className="mt-2 text-base text-[#53575b]">Nenhuma reserva aguarda confirmação de pagamento nesta Ala.</p>
            </div>
          ) : (
            <>
            <div className="space-y-3 p-4 md:hidden">
              {pendingReservations.map((res: any) => {
                const isOwnReservation = res.user_id === user.id;
                return (
                  <article key={res.id} className="rounded-xl border border-[#d0d3d3] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-bold text-[#212225]">{res.profiles.full_name}</h3><p className="mt-1 text-sm text-[#53575b]">Assento {res.seat_number} · {formatDate(res.caravans.departure_date)}</p></div>
                      <strong className="text-brand-700">{formatCurrency(Number(res.payment_amount))}</strong>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-[#53575b]">Categoria</dt><dd className="font-semibold text-[#212225]">{res.category === "officiant" ? "Oficiante" : "Padrão"}</dd></div>
                      <div><dt className="text-[#53575b]">CPF</dt><dd className="font-semibold text-[#212225]">{res.profiles.cpf || "Não informado"}</dd></div>
                    </dl>
                    <div className="mt-4 border-t border-[#e0e2e2] pt-4">
                      {isOwnReservation ? (
                        <p className="sgct-alert-warning">Sua própria reserva não pode ser aprovada por você.</p>
                      ) : (
                        <form action={async () => { "use server"; await confirmWardPaymentAction(res.id); }}>
                          <button type="submit" className="sgct-button w-full bg-success-700 text-white hover:brightness-90">Confirmar pagamento</button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d0d3d3] bg-[#f7f8f8] text-xs font-bold uppercase tracking-wider text-[#53575b]">
                    <th className="px-4 py-3">Passageiro</th>
                    <th className="px-4 py-3">Assento</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Embarque</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e2e2] text-[#3a3d40]">
                  {pendingReservations.map((res: any) => {
                    const isOwnReservation = res.user_id === user.id;
                    return (
                      <tr key={res.id} className="hover:bg-brand-50/40">
                        <td className="px-4 py-4 font-semibold text-[#212225]"><div>{res.profiles.full_name}</div><div className="mt-1 text-xs font-normal text-[#676b6e]">CPF: {res.profiles.cpf || "Não informado"}</div></td>
                        <td className="px-4 py-4 font-bold text-brand-700">{res.seat_number}</td>
                        <td className="px-4 py-4">{res.category === "officiant" ? "Oficiante" : "Padrão"}</td>
                        <td className="px-4 py-4 font-semibold text-[#212225]">{formatCurrency(Number(res.payment_amount))}</td>
                        <td className="px-4 py-4">{formatDate(res.caravans.departure_date)}</td>
                        <td className="px-4 py-4 text-right">
                          {isOwnReservation ? <span className="sgct-chip border-warning-200 bg-warning-50 text-warning-700">Autoaprovação bloqueada</span> : (
                            <form action={async () => { "use server"; await confirmWardPaymentAction(res.id); }}>
                              <button type="submit" className="sgct-button min-h-11 bg-success-700 px-4 py-2 text-sm text-white hover:brightness-90">Confirmar pagamento</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
