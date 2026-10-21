import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { EstacaRelatoriosClient } from "./estaca-relatorios-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEstacaRelatoriosPage({ params }: Props) {
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

  // Busca dados da Estaca
  let stakeName = "Estaca";
  if (stakeId) {
    const { data: stakeData } = await supabase
      .from("stakes")
      .select("name")
      .eq("id", stakeId)
      .maybeSingle();
    if (stakeData) stakeName = stakeData.name;
  }

  // Caravanas da Estaca
  const { data: caravans } = await supabase
    .from("caravans")
    .select("id, departure_date, return_date, price, status")
    .eq("stake_id", stakeId)
    .order("departure_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212225]">Relatórios Financeiros da Estaca</h1>
        <p className="text-sm text-[#53575b]">
          Demonstrativo consolidado por Ala e exportação de prestação de contas para {stakeName}.
        </p>
      </div>

      <EstacaRelatoriosClient
        estacaSlug={estaca_slug}
        stakeName={stakeName}
        caravans={caravans || []}
      />
    </div>
  );
}
