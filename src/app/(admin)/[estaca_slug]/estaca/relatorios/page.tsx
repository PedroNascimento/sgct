import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseFinancialReportRepository } from "@/infrastructure/supabase/supabase-financial-report-repository";
import { getStakeFinancialPanel } from "@/use-cases/reports/get-stake-financial-panel";
import { EstacaRelatoriosClient } from "./estaca-relatorios-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
  searchParams: Promise<{
    caravanId?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEstacaRelatoriosPage({
  params,
  searchParams,
}: Props) {
  const { estaca_slug } = await params;
  const { caravanId: caravanIdParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;

  if (role !== "admin_estaca" || !stakeId) {
    redirect(`/${estaca_slug}`);
  }

  // Caravanas da Estaca
  const { data: caravans } = await supabase
    .from("caravans")
    .select("id, title, departure_date, return_date, price_standard, price_officiant, overnight, status")
    .eq("stake_id", stakeId)
    .order("departure_date", { ascending: false });

  const caravanList = (caravans || []).map((c: any) => ({
    id: c.id,
    title: c.title ?? null,
    departure_date: c.departure_date,
    return_date: c.return_date ?? null,
    price: Number(c.price_standard ?? 0),
    overnight: Boolean(c.overnight),
    status: c.status,
  }));

  const selectedCaravanId =
    caravanIdParam && caravanList.some((c) => c.id === caravanIdParam)
      ? caravanIdParam
      : caravanList[0]?.id;

  const repository = new SupabaseFinancialReportRepository(supabase);
  const panelData = await getStakeFinancialPanel(
    {
      stakeId,
      caravanId: selectedCaravanId,
    },
    { repository }
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Painel Financeiro & Repasses</p>
        <h1 className="sgct-title mt-1">Controle Financeiro da Estaca</h1>
        <p className="sgct-subtitle">
          Acompanhe quanto cada Ala deve transferir para {panelData.stakeName}, valores já recebidos, saldo pendente, inscritos por caravana e créditos de cancelamento.
        </p>
      </div>

      <EstacaRelatoriosClient
        estacaSlug={estaca_slug}
        caravans={caravanList}
        selectedCaravanId={selectedCaravanId || ""}
        panelData={panelData}
      />
    </div>
  );
}
