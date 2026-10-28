import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManifestDataProvider,
  ConfirmedPassengerData,
  LapChildData,
} from "@/use-cases/checkin/generate-passenger-manifest";

export class SupabaseManifestDataProvider implements ManifestDataProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async getConfirmedReservationsWithProfile(
    caravanId: string
  ): Promise<ConfirmedPassengerData[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select(`
        id,
        seat_number,
        participant_type,
        status,
        transferred_to_name,
        transferred_to_document,
        profiles (
          full_name,
          cpf,
          birth_date,
          phone
        ),
        wards (
          name
        )
      `)
      .eq("caravan_id", caravanId)
      .in("status", ["confirmado", "presente"]);

    if (error) {
      throw new Error(`Erro ao buscar passageiros da caravana: ${error.message}`);
    }

    if (!data) return [];

    return data.map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const ward = Array.isArray(row.wards) ? row.wards[0] : row.wards;

      const hasTransferredHolder = Boolean(row.transferred_to_name);

      return {
        reservationId: row.id,
        seatNumber: row.seat_number,
        passengerName: hasTransferredHolder
          ? row.transferred_to_name
          : profile?.full_name || "Membro",
        document: hasTransferredHolder
          ? row.transferred_to_document || profile?.cpf || null
          : profile?.cpf || null,
        birthDate: profile?.birth_date || null,
        passengerType: row.participant_type,
        wardName: ward?.name || "Ala Não Identificada",
        phone: profile?.phone || null,
        status: row.status,
      };
    });
  }

  async getLapChildrenByCaravanId(caravanId: string): Promise<LapChildData[]> {
    const { data, error } = await this.supabase
      .from("passenger_manifest_entries")
      .select(`
        id,
        reservation_id,
        full_name,
        birth_date,
        filiation,
        reservations!inner (
          id,
          caravan_id,
          status,
          profiles (
            full_name
          ),
          wards (
            name
          )
        )
      `)
      .eq("reservations.caravan_id", caravanId)
      .in("reservations.status", ["confirmado", "presente"]);

    if (error) {
      throw new Error(
        `Erro ao buscar crianças de colo do manifesto: ${error.message}`
      );
    }

    if (!data) return [];

    return data.map((row: any) => {
      const reservation = Array.isArray(row.reservations)
        ? row.reservations[0]
        : row.reservations;
      const profile = reservation?.profiles
        ? Array.isArray(reservation.profiles)
          ? reservation.profiles[0]
          : reservation.profiles
        : null;
      const ward = reservation?.wards
        ? Array.isArray(reservation.wards)
          ? reservation.wards[0]
          : reservation.wards
        : null;

      return {
        id: row.id,
        reservationId: row.reservation_id,
        fullName: row.full_name,
        birthDate: row.birth_date,
        filiation: row.filiation,
        wardName: ward?.name || "Ala Não Identificada",
        responsibleName: profile?.full_name || "Responsável",
      };
    });
  }
}
