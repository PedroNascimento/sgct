import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { WardMinorFormsManager } from "@/components/admin/ward-minor-forms-manager";
import { formatDate } from "@/components/ui/format";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminAlaMenoresPage({ params }: Props) {
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

  // Busca o nome da Ala
  let wardName = "Sua Ala";
  if (wardId) {
    const { data: wardData } = await supabase
      .from("wards")
      .select("name")
      .eq("id", wardId)
      .maybeSingle();
    if (wardData) wardName = wardData.name;
  }

  // Busca formulários pendentes da Ala com dados de reserva, membro e caravana
  const { data: formsData } = await supabase
    .from("minor_approval_forms")
    .select(`
      id,
      reservation_id,
      storage_path,
      status,
      reservations!inner (
        id,
        seat_number,
        profiles!inner (
          full_name,
          cpf
        ),
        caravans!inner (
          departure_date
        )
      )
    `)
    .eq("stake_id", stakeId)
    .eq("ward_id", wardId)
    .eq("status", "pending");

  const formattedForms = (formsData ?? []).map((f: any) => ({
    id: f.id,
    reservationId: f.reservation_id,
    memberName: f.reservations?.profiles?.full_name || "Membro",
    memberCpf: f.reservations?.profiles?.cpf || "Não informado",
    seatNumber: f.reservations?.seat_number || 0,
    caravanDepartureDate: f.reservations?.caravans?.departure_date
      ? formatDate(f.reservations.caravans.departure_date)
      : "Data não definida",
    storagePath: f.storage_path,
    status: f.status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Ala {wardName}</p>
        <h1 className="sgct-title mt-2">Autorizações de Menores de Idade</h1>
        <p className="sgct-subtitle">
          Confira e avalie os termos de autorização enviados pelos jovens de 12 a 17 anos da sua Ala.
        </p>
      </div>

      <WardMinorFormsManager
        estacaSlug={estaca_slug}
        forms={formattedForms}
      />
    </div>
  );
}
