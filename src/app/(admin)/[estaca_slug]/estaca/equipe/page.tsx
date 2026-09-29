import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { WardAdminForm } from "./ward-admin-form";
import { WardAdminList } from "./ward-admin-list";
import { getEstacaMembersList } from "../../actions";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Tela de Equipe — cadastro e gestão de Admins de Ala e membros da Estaca.
 * Rota: (admin)/[estaca_slug]/estaca/equipe
 * Artigo II.d: somente Admin Estaca pode criar Admin Ala para a mesma stake_id.
 */
export default async function EstacaEquipePage({ params }: Props) {
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

  // Buscar Alas da Estaca e Lista de membros/admins em paralelo
  const [wardsResult, members] = await Promise.all([
    supabase
      .from("wards")
      .select("id, name")
      .eq("stake_id", stake.id)
      .order("name", { ascending: true }),
    getEstacaMembersList(stake.id),
  ]);

  const wards = wardsResult.data ?? [];

  return (
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="sgct-eyebrow">Painel da Estaca</p>
          <h1 className="sgct-title mt-3">Equipe — Admins de Ala</h1>
          <p className="sgct-subtitle">
            Cadastre os Administradores de cada Ala da {stake.name} e gerencie as permissões dos membros da Estaca.
          </p>
        </div>

        {/* Formulário de promoção no topo */}
        {wards.length > 0 ? (
          <WardAdminForm wards={wards} stakeId={stake.id} />
        ) : (
          <div className="sgct-alert-warning">
            Nenhuma Ala cadastrada na Estaca. Contate o Super Admin.
          </div>
        )}

        {/* Lista de membros e admins logo abaixo */}
        <WardAdminList members={members} />
      </div>
    </main>
  );
}
