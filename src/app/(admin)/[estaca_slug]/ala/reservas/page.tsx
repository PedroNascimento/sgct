import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { AlaReservasClient } from "./ala-reservas-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

function formatWardDisplayName(name: string): string {
  const trimmed = name.trim();
  if (/^(ala|ramo)\s+/i.test(trimmed) || /^sua\s+ala$/i.test(trimmed)) {
    return trimmed;
  }
  return `Ala ${trimmed}`;
}

export default async function AdminAlaReservasPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;
  const wardId = user.app_metadata?.ward_id;

  if (role !== "admin_ala" && role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  // 1. Busca o nome da Ala
  let wardName = "Sua Ala";
  if (wardId) {
    const { data: wardData } = await supabase
      .from("wards")
      .select("name")
      .eq("id", wardId)
      .maybeSingle();
    if (wardData) wardName = wardData.name;
  }

  // 2. Busca Caravanas ativas da Estaca
  const { data: caravans } = await supabase
    .from("caravans")
    .select("id, departure_date, status")
    .eq("stake_id", stakeId)
    .order("departure_date", { ascending: true });

  // 3. Busca todas as reservas da Ala (pendentes, pago_ala, confirmadas, waitlist)
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, user_id, seat_number, category, payment_amount, status, created_at, caravan_id, profiles!inner(full_name, cpf, phone), caravans!inner(id, departure_date, status)")
    .eq("stake_id", stakeId)
    .eq("ward_id", wardId)
    .order("seat_number", { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">{formatWardDisplayName(wardName)}</p>
        <h1 className="sgct-title mt-2">Painel de Reservas e Pagamentos</h1>
        <p className="sgct-subtitle">
          Gerencie as inscrições dos membros da sua Ala, acompanhe pagamentos e confirme os comprovantes recebidos.
        </p>
      </div>

      <AlaReservasClient
        currentUserId={user.id}
        reservations={(reservations as any) ?? []}
        caravans={caravans ?? []}
        wardName={wardName}
      />
    </div>
  );
}
