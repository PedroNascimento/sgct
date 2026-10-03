import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { getWardsWithStats } from "../../actions";
import { WardsManager } from "./wards-manager";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Tela de Gestão de Alas da Estaca.
 * Rota: (admin)/[estaca_slug]/estaca/alas
 * Artigo II: isolado por stake_id. Apenas admin_estaca tem acesso.
 */
export default async function EstacaAlasPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const role = userData.user.app_metadata?.role;
  if (role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  const stakeRepo = new SupabaseStakeRepository(supabase);
  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) notFound();

  // Buscar Alas da Estaca com métricas de membros e liderança
  const wards = await getWardsWithStats(stake.id);

  return (
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="sgct-eyebrow">Painel da Estaca</p>
          <h1 className="sgct-title mt-3">Gestão de Alas e Ramos</h1>
          <p className="sgct-subtitle">
            Cadastre e gerencie as unidades da {stake.name}. As Alas cadastradas estarão disponíveis para seleção pelos membros durante o cadastro e para a liderança.
          </p>
        </div>

        <WardsManager initialWards={wards} stakeName={stake.name} />
      </div>
    </main>
  );
}
