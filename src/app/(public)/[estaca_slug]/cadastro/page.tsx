import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { CadastroClient } from "./cadastro-client";
import type { Ward } from "@/domain/types/ward";

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
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Criar sua Conta
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Inscrições para caravanas ao templo da{" "}
          <span className="font-semibold text-gray-900">{stake.name}</span>.
        </p>
      </div>

      <CadastroClient
        stakeSlug={estaca_slug}
        stakeName={stake.name}
        wards={wards}
      />
    </main>
  );
}
