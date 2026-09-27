/**
 * Implementação Supabase do CaravanRepository (Spec 002).
 * Artigo I: camada infrastructure/.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Caravan,
  BoardingPoint,
  CaravanStatus,
  CaravanPublicSummary,
} from "@/domain/types/caravan";
import type {
  CaravanRepository,
  CreateCaravanData,
  CreateBoardingPointData,
} from "@/domain/interfaces/caravan-repository";

export class SupabaseCaravanRepository implements CaravanRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Caravan | null> {
    const { data: caravan, error } = await this.supabase
      .from("caravans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar caravana por ID: ${error.message}`);
    }

    if (!caravan) return null;

    const boardingPoints = await this.getBoardingPointsByCaravanId(id);

    return {
      ...caravan,
      price_standard: Number(caravan.price_standard),
      price_officiant: Number(caravan.price_officiant),
      boarding_points: boardingPoints,
    };
  }

  async findByStakeId(stakeId: string): Promise<Caravan[]> {
    const { data, error } = await this.supabase
      .from("caravans")
      .select("*")
      .eq("stake_id", stakeId)
      .order("departure_date", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar caravanas da Estaca: ${error.message}`);
    }

    if (!data) return [];

    return data.map((c) => ({
      ...c,
      price_standard: Number(c.price_standard),
      price_officiant: Number(c.price_officiant),
    }));
  }

  async create(data: CreateCaravanData): Promise<Caravan> {
    const { data: created, error } = await this.supabase
      .from("caravans")
      .insert({
        stake_id: data.stake_id,
        departure_date: data.departure_date,
        return_date: data.return_date ?? null,
        price_standard: data.price_standard,
        price_officiant: data.price_officiant,
        seat_limit: data.seat_limit ?? 50,
        waitlist_limit: data.waitlist_limit ?? 5,
        registration_deadline: data.registration_deadline,
        min_quorum: data.min_quorum ?? 48,
        quorum_check_date: data.quorum_check_date,
        status: data.status ?? "open",
        caravan_leader_id: data.caravan_leader_id ?? null,
        created_by: data.created_by,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao cadastrar caravana: ${error.message}`);
    }

    return {
      ...created,
      price_standard: Number(created.price_standard),
      price_officiant: Number(created.price_officiant),
    };
  }

  async updateStatus(id: string, status: CaravanStatus): Promise<Caravan> {
    const { data: updated, error } = await this.supabase
      .from("caravans")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status da caravana: ${error.message}`);
    }

    return {
      ...updated,
      price_standard: Number(updated.price_standard),
      price_officiant: Number(updated.price_officiant),
    };
  }

  async addBoardingPoint(data: CreateBoardingPointData): Promise<BoardingPoint> {
    const { data: created, error } = await this.supabase
      .from("boarding_points")
      .insert({
        caravan_id: data.caravan_id,
        stake_id: data.stake_id,
        name: data.name,
        boarding_time: data.boarding_time,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar ponto de embarque: ${error.message}`);
    }

    return created as BoardingPoint;
  }

  async getBoardingPointsByCaravanId(caravanId: string): Promise<BoardingPoint[]> {
    const { data, error } = await this.supabase
      .from("boarding_points")
      .select("*")
      .eq("caravan_id", caravanId)
      .order("boarding_time", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar pontos de embarque: ${error.message}`);
    }

    return (data ?? []) as BoardingPoint[];
  }

  async findPublicSummariesByStakeId(stakeId: string): Promise<CaravanPublicSummary[]> {
    // 1. Buscar caravanas ativas/futuras da Estaca
    const { data: caravans, error: caravanError } = await this.supabase
      .from("caravans")
      .select("*")
      .eq("stake_id", stakeId)
      .neq("status", "cancelled")
      .order("departure_date", { ascending: true });

    if (caravanError) {
      throw new Error(`Erro ao carregar calendário público: ${caravanError.message}`);
    }

    if (!caravans || caravans.length === 0) {
      return [];
    }

    const summaries: CaravanPublicSummary[] = [];

    for (const caravan of caravans) {
      // 2. Buscar pontos de embarque (sem PII)
      const { data: bpData } = await this.supabase
        .from("boarding_points")
        .select("name, boarding_time")
        .eq("caravan_id", caravan.id)
        .order("boarding_time", { ascending: true });

      // 3. Buscar status agregado de reservas (sem expor quem reservou nem Ala — US-002.2)
      const { data: reservations } = await this.supabase
        .from("reservations")
        .select("status")
        .eq("caravan_id", caravan.id);

      let confirmedCount = 0;
      let validatingCount = 0;
      let waitlistCount = 0;

      if (reservations) {
        for (const res of reservations) {
          if (res.status === "confirmado" || res.status === "presente") {
            confirmedCount++;
          } else if (
            res.status === "pendente" ||
            res.status === "pago_ala" ||
            res.status === "aguardando_auxilio" ||
            res.status === "aguardando_transferencia_interestaca"
          ) {
            validatingCount++;
          } else if (res.status === "lista_espera") {
            waitlistCount++;
          }
        }
      }

      const availableSeats = Math.max(
        0,
        caravan.seat_limit - confirmedCount - validatingCount
      );

      summaries.push({
        id: caravan.id,
        stake_id: caravan.stake_id,
        departure_date: caravan.departure_date,
        return_date: caravan.return_date,
        price_standard: Number(caravan.price_standard),
        price_officiant: Number(caravan.price_officiant),
        status: caravan.status,
        seat_limit: caravan.seat_limit,
        available_seats: availableSeats,
        confirmed_seats: confirmedCount,
        validating_seats: validatingCount,
        waitlist_seats: waitlistCount,
        boarding_points: (bpData ?? []).map((bp) => ({
          name: bp.name,
          boarding_time: bp.boarding_time,
        })),
      });
    }

    return summaries;
  }
}
