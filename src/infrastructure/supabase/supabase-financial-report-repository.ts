/**
 * Implementação Supabase do FinancialReportRepository (Spec 009).
 * Artigo I: infraestrutura que implementa a interface do domínio.
 * Artigo II: respeita estritamente o isolamento de Estaca e Ala.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type {
  WardFinancialSummary,
  StakeFinancialSummary,
  WardFinancialReportRow,
} from "@/domain/types/report";

export class SupabaseFinancialReportRepository
  implements FinancialReportRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async getWardFinancialData(
    wardId: string,
    caravanId?: string
  ): Promise<WardFinancialSummary> {
    // 1. Busca dados da Ala
    const { data: ward, error: wardError } = await this.supabase
      .from("wards")
      .select("id, name, stake_id")
      .eq("id", wardId)
      .single();

    if (wardError || !ward) {
      throw new Error(`Ala não encontrada: ${wardError?.message ?? wardId}`);
    }

    // 2. Busca reservas da Ala
    let query = this.supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        payment_amount,
        participant_type,
        category,
        caravans!inner ( departure_date ),
        profiles!inner ( full_name )
      `
      )
      .eq("ward_id", wardId);

    if (caravanId) {
      query = query.eq("caravan_id", caravanId);
    }

    const { data: reservations, error: resError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (resError) {
      throw new Error(
        `Erro ao buscar reservas da Ala: ${resError.message}`
      );
    }

    const rows: WardFinancialReportRow[] = (reservations || []).map(
      (r: any) => ({
        reservationId: r.id,
        caravanDepartureDate: r.caravans?.departure_date ?? "",
        passengerName: r.profiles?.full_name ?? "Não identificado",
        participantType: r.participant_type ?? "adulto",
        category: r.category ?? "standard",
        paymentAmount: Number(r.payment_amount || 0),
        status: r.status,
      })
    );

    let totalConfirmed = 0;
    let totalPagoAla = 0;
    let totalPendente = 0;
    let totalCollected = 0;

    for (const r of rows) {
      if (r.status === "confirmado" || r.status === "presente") {
        totalConfirmed++;
        totalCollected += r.paymentAmount;
      } else if (r.status === "pago_ala") {
        totalPagoAla++;
        totalCollected += r.paymentAmount;
      } else if (r.status === "pendente") {
        totalPendente++;
      }
    }

    return {
      stakeId: ward.stake_id,
      wardId: ward.id,
      wardName: ward.name,
      totalConfirmed,
      totalPagoAla,
      totalPendente,
      totalCollected,
      rows,
    };
  }

  async getStakeFinancialData(
    stakeId: string,
    caravanId?: string
  ): Promise<StakeFinancialSummary> {
    // 1. Busca dados da Estaca
    const { data: stake, error: stakeError } = await this.supabase
      .from("stakes")
      .select("id, name")
      .eq("id", stakeId)
      .single();

    if (stakeError || !stake) {
      throw new Error(
        `Estaca não encontrada: ${stakeError?.message ?? stakeId}`
      );
    }

    // 2. Busca todas as Alas da Estaca
    const { data: wards, error: wardsError } = await this.supabase
      .from("wards")
      .select("id, name, stake_id")
      .eq("stake_id", stakeId)
      .order("name", { ascending: true });

    if (wardsError) {
      throw new Error(
        `Erro ao buscar alas da Estaca: ${wardsError.message}`
      );
    }

    // 3. Busca todas as reservas da Estaca
    let resQuery = this.supabase
      .from("reservations")
      .select("id, ward_id, status, payment_amount")
      .eq("stake_id", stakeId);

    if (caravanId) {
      resQuery = resQuery.eq("caravan_id", caravanId);
    }

    const { data: reservations, error: resError } = await resQuery;

    if (resError) {
      throw new Error(
        `Erro ao buscar reservas da Estaca: ${resError.message}`
      );
    }

    const allRes = reservations || [];
    const wardIdSet = new Set((wards || []).map((w: any) => w.id));

    const byWard = (wards || []).map((w: any) => {
      const wardReservations = allRes.filter((r: any) => r.ward_id === w.id);
      let totalConfirmed = 0;
      let totalPagoAla = 0;
      let totalPendente = 0;
      let totalCollected = 0;

      for (const r of wardReservations) {
        const val = Number(r.payment_amount || 0);
        if (r.status === "confirmado" || r.status === "presente") {
          totalConfirmed++;
          totalCollected += val;
        } else if (r.status === "pago_ala") {
          totalPagoAla++;
          totalCollected += val;
        } else if (r.status === "pendente") {
          totalPendente++;
        }
      }

      return {
        wardId: w.id,
        wardName: w.name,
        totalConfirmed,
        totalPagoAla,
        totalPendente,
        totalCollected,
      };
    });

    // 4. Reconciliação dos Convidados Inter-Estaca da Estaca anfitriã (M02 / Artigo II.d)
    const guestReservations = allRes.filter(
      (r: any) => !r.ward_id || !wardIdSet.has(r.ward_id)
    );

    if (guestReservations.length > 0) {
      let guestConfirmed = 0;
      let guestPagoAla = 0;
      let guestPendente = 0;
      let guestCollected = 0;

      for (const r of guestReservations) {
        const val = Number(r.payment_amount || 0);
        if (r.status === "confirmado" || r.status === "presente") {
          guestConfirmed++;
          guestCollected += val;
        } else if (r.status === "pago_ala") {
          guestPagoAla++;
          guestCollected += val;
        } else if (r.status === "pendente") {
          guestPendente++;
        }
      }

      byWard.push({
        wardId: "convidados",
        wardName: "Convidados Inter-Estaca",
        totalConfirmed: guestConfirmed,
        totalPagoAla: guestPagoAla,
        totalPendente: guestPendente,
        totalCollected: guestCollected,
      });
    }

    const totalConfirmed = byWard.reduce(
      (acc: number, w: any) => acc + w.totalConfirmed,
      0
    );
    const totalPagoAla = byWard.reduce(
      (acc: number, w: any) => acc + w.totalPagoAla,
      0
    );
    const totalPendente = byWard.reduce(
      (acc: number, w: any) => acc + w.totalPendente,
      0
    );
    const totalCollected = byWard.reduce(
      (acc: number, w: any) => acc + w.totalCollected,
      0
    );

    return {
      stakeId: stake.id,
      stakeName: stake.name,
      byWard,
      totalConfirmed,
      totalPagoAla,
      totalPendente,
      totalCollected,
    };
  }
}
