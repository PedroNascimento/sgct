import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseFinancialReportRepository } from "@/infrastructure/supabase/supabase-financial-report-repository";
import { getWardFinancialPanel } from "@/use-cases/reports/get-ward-financial-panel";
import { AlaRelatoriosClient } from "./ala-relatorios-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
  searchParams: Promise<{
    caravanId?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminAlaRelatoriosPage({
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
  const wardId = user.app_metadata?.ward_id;

  if ((role !== "admin_ala" && role !== "admin_estaca") || !stakeId || !wardId) {
    redirect(`/${estaca_slug}`);
  }

  // Caravanas da Estaca
  const { data: caravans } = await supabase
    .from("caravans")
    .select("id, title, departure_date, return_date, price_standard, overnight, status")
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
  const panelData = await getWardFinancialPanel(
    {
      stakeId,
      wardId,
      caravanId: selectedCaravanId,
    },
    { repository }
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Painel Financeiro da Ala</p>
        <h1 className="sgct-title mt-1">
          Controle Financeiro — {panelData.wardName}
        </h1>
        <p className="sgct-subtitle">
          Acompanhe o valor devido à Estaca, pagamentos recebidos na Ala, repasses já confirmados, lista de inscritos e créditos dos membros de {panelData.wardName}.
        </p>
      </div>

      <AlaRelatoriosClient
        estacaSlug={estaca_slug}
        caravans={caravanList}
        selectedCaravanId={selectedCaravanId || ""}
        panelData={panelData}
      />
    </div>
  );
}
