import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import {
  SeatSwapManager,
  type SwapRequestWithDetails,
} from "@/components/admin/seat-swap-manager";
import {
  registerSeatSwapAction,
  approveSeatSwapAction,
} from "../../actions";

interface PermutasPageProps {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export default async function PermutasPage({ params }: PermutasPageProps) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${estaca_slug}/auth/login?redirectTo=/${estaca_slug}/estaca/permutas`);
  }

  const stakeRepo = new SupabaseStakeRepository(supabase);
  const stake = await stakeRepo.findBySlug(estaca_slug);
  if (!stake) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, stake_id")
    .eq("id", user.id)
    .single();

  const isStakeAdmin = profile?.role === "admin_estaca" && profile?.stake_id === stake.id;

  const caravanRepo = new SupabaseCaravanRepository(supabase);
  const caravans = await caravanRepo.findByStakeId(stake.id);

  // Verifica se o usuário é líder de alguma dessas caravanas
  const isLeaderOfAny = caravans.some((c) => c.caravan_leader_id === user.id);

  if (!isStakeAdmin && !isLeaderOfAny) {
    redirect(`/${estaca_slug}`);
  }

  // Busca reservas confirmadas das caravanas desta Estaca
  const reservationRepo = new SupabaseReservationRepository(supabase);
  const allReservationsPromises = caravans.map((c) =>
    reservationRepo.findByCaravanAndStatuses(c.id, ["confirmado"])
  );
  const reservationsArrays = await Promise.all(allReservationsPromises);
  const confirmedReservations = reservationsArrays.flat();

  // Busca as permutas registradas no banco para esta Estaca
  const { data: swapRows } = await supabase
    .from("seat_swap_requests")
    .select(`
      id,
      stake_id,
      ward_id,
      original_reservation_id,
      new_holder_full_name,
      new_holder_document,
      requested_by,
      status,
      created_at,
      reservations:original_reservation_id (
        seat_number,
        caravan_id,
        caravans:caravan_id (
          name
        )
      )
    `)
    .eq("stake_id", stake.id)
    .order("created_at", { ascending: false });

  const swapRequests: SwapRequestWithDetails[] = (swapRows ?? []).map((row: any) => {
    const res = Array.isArray(row.reservations) ? row.reservations[0] : row.reservations;
    const caravan = res?.caravans ? (Array.isArray(res.caravans) ? res.caravans[0] : res.caravans) : null;

    return {
      id: row.id,
      stake_id: row.stake_id,
      ward_id: row.ward_id,
      original_reservation_id: row.original_reservation_id,
      new_holder_full_name: row.new_holder_full_name,
      new_holder_document: row.new_holder_document,
      requested_by: row.requested_by,
      status: row.status,
      created_at: row.created_at,
      seat_number: res?.seat_number,
      caravan_name: caravan?.name,
    };
  });

  async function handleRegister(data: {
    reservationId: string;
    newHolderFullName: string;
    newHolderDocument?: string;
  }) {
    "use server";
    const res = await registerSeatSwapAction(estaca_slug, data);
    if (!res.success) {
      throw new Error(res.error || "Erro ao registrar permuta.");
    }
  }

  async function handleApprove(swapRequestId: string) {
    "use server";
    const res = await approveSeatSwapAction(estaca_slug, swapRequestId);
    if (!res.success) {
      throw new Error(res.error || "Erro ao aprovar permuta.");
    }
  }

  return (
    <div className="py-6">
      <SeatSwapManager
        caravans={caravans}
        confirmedReservations={confirmedReservations}
        swapRequests={swapRequests}
        canApprove={isStakeAdmin || isLeaderOfAny}
        onRegisterSwap={handleRegister}
        onApproveSwap={handleApprove}
      />
    </div>
  );
}
