import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { CaravanDashboardClient, type ReservationDetail } from "./dashboard-client";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Dashboard de Inscrições — Painel Admin da Estaca.
 * Rota: (admin)/[estaca_slug]/estaca/dashboard
 * Somente leitura; isolamento por stake_id garantido por RLS + filtro explícito.
 */
export default async function AdminDashboardPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const stakeRepo = new SupabaseStakeRepository(supabase);
  const caravanRepo = new SupabaseCaravanRepository(supabase);

  const stake = await resolveStakeFromSlug(estaca_slug, stakeRepo);
  if (!stake) {
    notFound();
  }

  const caravans = await caravanRepo.findByStakeId(stake.id);
  // Regra: o Dashboard acompanha somente caravanas com inscrições abertas
  const openCaravans = caravans.filter((c) => c.status === "open");
  const openCaravanIds = openCaravans.map((c) => c.id);

  let reservations: ReservationDetail[] = [];
  if (openCaravanIds.length > 0) {
    const { data } = await supabase
      .from("reservations")
      .select(
        "id, caravan_id, seat_number, status, payment_amount, category, created_at, profiles!inner(full_name, cpf, phone), wards!inner(name)"
      )
      .eq("stake_id", stake.id)
      .in("caravan_id", openCaravanIds)
      .order("seat_number", { ascending: true, nullsFirst: false });

    reservations = (data as unknown as ReservationDetail[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Painel da Estaca</p>
        <h1 className="sgct-title mt-2">Dashboard de Inscrições</h1>
        <p className="sgct-subtitle">
          Acompanhe ocupação, pagamentos, quórum e passageiros de caravanas com inscrições abertas.
        </p>
      </div>

      <CaravanDashboardClient
        initialCaravans={openCaravans}
        initialReservations={reservations}
      />
    </div>
  );
}
