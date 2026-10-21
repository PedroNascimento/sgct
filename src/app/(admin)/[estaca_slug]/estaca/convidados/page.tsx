import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseGuestRepository } from "@/infrastructure/supabase/supabase-guest-repository";
import { ConvidadosClient } from "./convidados-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEstacaConvidadosPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;

  if (role !== "admin_estaca" || !stakeId) {
    redirect(`/${estaca_slug}`);
  }

  const guestRepo = new SupabaseGuestRepository(supabase);
  const pendingTransfers = await guestRepo.findPendingTransfersByStake(stakeId);

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Financeiro & Logística Inter-Estaca</p>
        <h1 className="sgct-title mt-2">Repasses de Convidados</h1>
        <p className="sgct-subtitle">
          Gerencie e confirme o repasse financeiro de membros de outras Estacas inscritos como convidados nas caravanas da sua Estaca.
        </p>
      </div>

      <ConvidadosClient
        initialTransfers={pendingTransfers}
        estacaSlug={estaca_slug}
      />
    </div>
  );
}
