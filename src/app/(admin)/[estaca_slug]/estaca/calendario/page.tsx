import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { CalendarioAdminClient } from "./calendario-admin-client";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Gestão de Caravanas — Painel Admin da Estaca (T002.5)
 * Rota: (admin)/[estaca_slug]/estaca/calendario
 */
export default async function AdminCalendarioPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const caravanRepo = new SupabaseCaravanRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  const caravans = await caravanRepo.findByStakeId(stake.id);

  return (
    <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Gestão de Caravanas — {stake.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre novas viagens ao Templo de Recife, configure pontos de embarque e monitore os prazos.
        </p>
      </div>

      <CalendarioAdminClient
        stakeSlug={estaca_slug}
        initialCaravans={caravans}
      />
    </main>
  );
}
