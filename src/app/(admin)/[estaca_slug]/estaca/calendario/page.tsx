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
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Painel da Estaca</p>
        <h1 className="sgct-title mt-2">Gestão de Caravanas</h1>
        <p className="sgct-subtitle">
          Cadastre novas viagens e edite as caravanas existentes. Para acompanhar inscrições e pagamentos, use o Dashboard.
        </p>
      </div>

      <CalendarioAdminClient
        stakeSlug={estaca_slug}
        initialCaravans={caravans}
      />
    </div>
  );
}
