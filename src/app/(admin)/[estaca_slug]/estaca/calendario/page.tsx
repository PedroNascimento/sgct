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
    <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">
      <div className="mb-8">
        <p className="sgct-eyebrow">Painel da Estaca</p>
        <h1 className="sgct-title mt-3">Gestão de caravanas</h1>
        <p className="sgct-subtitle">
          Cadastre novas viagens ao Templo de Recife, configure pontos de embarque e monitore os prazos.
        </p>
        <p className="mt-3 text-sm font-semibold text-brand-700">{stake.name}</p>
      </div>

      <CalendarioAdminClient
        stakeSlug={estaca_slug}
        initialCaravans={caravans}
      />
    </main>
  );
}
