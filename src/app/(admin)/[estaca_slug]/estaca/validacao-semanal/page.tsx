import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { ValidacaoSemanalClient } from "./validacao-semanal-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEstacaValidacaoSemanalPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;

  if (role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

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
        .select("id, payment_amount, seat_number, profiles!inner(full_name, cpf), wards!inner(name)")
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
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Ciclo Financeiro</p>
        <h1 className="sgct-title mt-2">Validação Semanal</h1>
        <p className="sgct-subtitle">
          Valide as transferências enviadas pelas Alas em lote ou individualmente por passageiro, ou recuse caso necessite reanálise da liderança da Ala.
        </p>
      </div>

      <ValidacaoSemanalClient caravans={caravansWithCounts as any} />
    </div>
  );
}
