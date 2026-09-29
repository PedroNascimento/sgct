import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { WardAdminForm } from "./ward-admin-form";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Tela de Equipe — cadastro de Admins de Ala.
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

  // Buscar Alas da Estaca
  const { data: wards } = await supabase
    .from("wards")
    .select("id, name")
    .eq("stake_id", stake.id)
    .order("name", { ascending: true });

  // Buscar Admins de Ala já cadastrados
  const { data: wardAdmins } = await supabase
    .from("profiles")
    .select("id, full_name, ward_id, wards(name)")
    .eq("stake_id", stake.id)
    .eq("role", "admin_ala")
    .order("full_name", { ascending: true });

  return (
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="sgct-eyebrow">Painel da Estaca</p>
          <h1 className="sgct-title mt-3">Equipe — Admins de Ala</h1>
          <p className="sgct-subtitle">
            Cadastre os Administradores de cada Ala da {stake.name}. Cada Admin de Ala
            poderá confirmar os pagamentos dos membros da sua Ala.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Formulário de promoção */}
          <div className="lg:col-span-2">
            {wards && wards.length > 0 ? (
              <WardAdminForm wards={wards} stakeId={stake.id} />
            ) : (
              <div className="sgct-alert-warning">
                Nenhuma Ala cadastrada na Estaca. Contate o Super Admin.
              </div>
            )}
          </div>

          {/* Lista de admins já cadastrados */}
          <div className="lg:col-span-3">
            <section className="sgct-card overflow-hidden">
              <div className="border-b border-[#e0e2e2] px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-[#212225]">
                  Admins de Ala cadastrados ({wardAdmins?.length ?? 0})
                </h2>
              </div>

              {!wardAdmins || wardAdmins.length === 0 ? (
                <div className="p-8 text-center text-base text-[#53575b]">
                  Nenhum Admin de Ala cadastrado ainda. Use o formulário ao lado para
                  adicionar o primeiro.
                </div>
              ) : (
                <div className="divide-y divide-[#e0e2e2]">
                  {wardAdmins.map((admin) => {
                    const wardData = Array.isArray(admin.wards)
                      ? (admin.wards[0] as { name: string } | undefined)
                      : (admin.wards as { name: string } | null);
                    return (
                      <div key={admin.id} className="flex items-center justify-between px-5 py-4 sm:px-6">
                        <div>
                          <p className="font-semibold text-[#212225]">{admin.full_name}</p>
                          <p className="mt-0.5 text-sm text-[#53575b]">
                            {wardData?.name ?? "Ala não identificada"}
                          </p>
                        </div>
                        <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700">
                          Admin Ala
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
