import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { AlaRelatoriosClient } from "./ala-relatorios-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminAlaRelatoriosPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

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

  let wardName = "Sua Ala";
  if (wardId) {
    const { data: wardData } = await supabase
      .from("wards")
      .select("name")
      .eq("id", wardId)
      .maybeSingle();
    if (wardData) wardName = wardData.name;
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
        <h1 className="text-2xl font-bold text-[#212225]">Relatório Financeiro da Ala</h1>
        <p className="text-sm text-[#53575b]">
          Prestação de contas e exportação de reservas para {wardName}.
        </p>
      </div>

      <AlaRelatoriosClient
        estacaSlug={estaca_slug}
        wardName={wardName}
        caravans={caravans || []}
      />
    </div>
  );
}
