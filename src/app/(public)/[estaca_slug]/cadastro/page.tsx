import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseWardRepository } from "@/infrastructure/supabase/supabase-ward-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { CadastroClient } from "./cadastro-client";

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

  const supabase = createSupabaseServiceClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const wardRepo = new SupabaseWardRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  // Lista exclusivamente as Alas da Estaca resolvida
  const wards = await wardRepo.findByStakeId(stake.id);

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
        stakeId={stake.id}
        stakeName={stake.name}
        wards={wards}
      />
    </main>
  );
}
