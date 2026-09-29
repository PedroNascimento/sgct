import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { CadastroClient } from "./cadastro-client";
import type { Ward } from "@/domain/types/ward";
import { PublicHeader } from "@/components/ui/public-header";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Tela de Cadastro de Usuário (T001.5)
 *
 * Rota: (public)/[estaca_slug]/cadastro
 * Lista apenas as Alas da Estaca resolvida a partir do slug.
 */
export default async function CadastroPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  // Lista exclusivamente as Alas da Estaca resolvida
  const { data: wardsData, error: wardsError } = await supabase.rpc(
    "get_public_wards",
    { target_stake_slug: estaca_slug }
  );
  if (wardsError) {
    throw new Error(`Erro ao carregar Alas públicas: ${wardsError.message}`);
  }
  const wards = (wardsData ?? []).map((ward: { id: string; name: string }) => ({
    id: ward.id,
    stake_id: stake.id,
    name: ward.name,
    created_at: "",
  })) as Ward[];

  return (
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} stakeName={stake.name} />
      <main id="conteudo-principal" className="py-8 sm:py-12">
        <div className="sgct-narrow">
          <p className="sgct-eyebrow">Cadastro de participante</p>
          <h1 className="sgct-title mt-3">Crie sua conta</h1>
          <p className="sgct-subtitle">
            Informe seus dados para participar das caravanas da{" "}
            <strong className="font-semibold text-[#212225]">{stake.name}</strong>.
          </p>
        </div>

        <div className="mt-8">
          <CadastroClient stakeSlug={estaca_slug} stakeName={stake.name} wards={wards} />
        </div>
      </main>
    </div>
  );
}
