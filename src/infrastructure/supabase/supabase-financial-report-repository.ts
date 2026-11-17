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
  StakeFinancialPanelData,
  WardFinancialPanelData,
  FinancialRegistrantRow,
  FinancialCreditRow,
  WardTransferSummary,
} from "@/domain/types/report";
import {
  buildWardTransferSummary,
  sumWardTransferSummaries,
} from "@/domain/financial/transfer-summary";

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

  async getStakeFinancialPanelData(
    stakeId: string,
    caravanId?: string
  ): Promise<StakeFinancialPanelData> {
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

    let resQuery = this.supabase
      .from("reservations")
      .select(
        `
        id,
        caravan_id,
        ward_id,
        created_at,
        funding_source,
        category,
        participant_type,
        payment_amount,
        status,
        confirmed_at,
        caravans!inner ( departure_date ),
        profiles!inner ( full_name )
      `
      )
      .eq("stake_id", stakeId);

    if (caravanId) {
      resQuery = resQuery.eq("caravan_id", caravanId);
    }

    const { data: reservations, error: resError } = await resQuery.order(
      "created_at",
      { ascending: true }
    );

    if (resError) {
      throw new Error(
        `Erro ao buscar reservas da Estaca: ${resError.message}`
      );
    }

    const wardMap = new Map<string, string>();
    for (const w of wards || []) {
      wardMap.set(w.id, w.name);
    }

    const guestOriginMap = new Map<string, string>();
    const guestReservationIds = (reservations || [])
      .filter((r: any) => !r.ward_id || !wardMap.has(r.ward_id))
      .map((r: any) => r.id);

    if (guestReservationIds.length > 0) {
      const { data: guestRows } = await this.supabase
        .from("guest_transfer_confirmations")
        .select("reservation_id, origin_stake_name, origin_ward_name")
        .eq("stake_id", stakeId)
        .in("reservation_id", guestReservationIds);

      for (const g of guestRows || []) {
        guestOriginMap.set(
          g.reservation_id,
          `${g.origin_stake_name} • ${g.origin_ward_name}`
        );
      }
    }

    const registrants: FinancialRegistrantRow[] = (reservations || []).map(
      (r: any) => {
        const isGuest = !r.ward_id || !wardMap.has(r.ward_id);
        return {
          reservationId: r.id,
          caravanId: r.caravan_id,
          caravanDepartureDate: r.caravans?.departure_date ?? "",
          createdAt: r.created_at,
          passengerName: r.profiles?.full_name ?? "Não identificado",
          wardId: isGuest ? null : r.ward_id,
          wardName: isGuest
            ? "Outra Estaca"
            : wardMap.get(r.ward_id) ?? "Ala",
          originLabel: isGuest ? guestOriginMap.get(r.id) : undefined,
          fundingSource: r.funding_source ?? "membro",
          category: r.category ?? "standard",
          participantType: r.participant_type ?? "adulto",
          paymentAmount: Number(r.payment_amount || 0),
          status: r.status,
          confirmedAt: r.confirmed_at ?? null,
          isGuest,
        };
      }
    );

    const transfersByWard: WardTransferSummary[] = (wards || []).map(
      (w: any) => {
        const wardRows = registrants.filter((r) => r.wardId === w.id);
        return buildWardTransferSummary(w.id, w.name, false, wardRows);
      }
    );

    const guestRegistrants = registrants.filter((r) => r.isGuest);
    if (guestRegistrants.length > 0) {
      transfersByWard.push(
        buildWardTransferSummary(
          "convidados",
          "Outra Estaca",
          true,
          guestRegistrants
        )
      );
    }

    const totals = sumWardTransferSummaries(transfersByWard);

    // Consulta de créditos da Estaca (Spec 015 / US-015.3)
    const { data: creditRows, error: creditError } = await this.supabase
      .from("credit_ledger")
      .select(
        `
        id,
        user_id,
        ward_id,
        amount,
        source,
        status,
        origin_reservation_id,
        reason,
        expires_at,
        used_at,
        created_at,
        profiles!user_id ( full_name ),
        wards ( name )
      `
      )
      .eq("stake_id", stakeId)
      .order("created_at", { ascending: false });

    if (creditError) {
      throw new Error(
        `Erro ao buscar créditos da Estaca: ${creditError.message}`
      );
    }

    const credits: FinancialCreditRow[] = (creditRows || []).map((c: any) => ({
      creditId: c.id,
      userId: c.user_id,
      memberName: c.profiles?.full_name ?? "Não identificado",
      wardId: c.ward_id ?? null,
      wardName:
        c.wards?.name ?? (c.ward_id ? wardMap.get(c.ward_id) ?? "Ala" : "Outra Estaca"),
      amount: Number(c.amount || 0),
      source: c.source,
      status: c.status,
      originReservationId: c.origin_reservation_id ?? null,
      reason: c.reason ?? null,
      expiresAt: c.expires_at,
      usedAt: c.used_at ?? null,
      createdAt: c.created_at,
    }));

    return {
      stakeId: stake.id,
      stakeName: stake.name,
      caravanId,
      transfersByWard,
      totals,
      registrants,
      credits,
    };
  }

  async getWardFinancialPanelData(
    stakeId: string,
    wardId: string,
    caravanId?: string
  ): Promise<WardFinancialPanelData> {
    const { data: ward, error: wardError } = await this.supabase
      .from("wards")
      .select("id, name, stake_id")
      .eq("id", wardId)
      .eq("stake_id", stakeId)
      .single();

    if (wardError || !ward) {
      throw new Error(`Ala não encontrada: ${wardError?.message ?? wardId}`);
    }

    let resQuery = this.supabase
      .from("reservations")
      .select(
        `
        id,
        caravan_id,
        ward_id,
        created_at,
        funding_source,
        category,
        participant_type,
        payment_amount,
        status,
        confirmed_at,
        caravans!inner ( departure_date ),
        profiles!inner ( full_name )
      `
      )
      .eq("stake_id", stakeId)
      .eq("ward_id", wardId);

    if (caravanId) {
      resQuery = resQuery.eq("caravan_id", caravanId);
    }

    const { data: reservations, error: resError } = await resQuery.order(
      "created_at",
      { ascending: true }
    );

    if (resError) {
      throw new Error(
        `Erro ao buscar reservas da Ala: ${resError.message}`
      );
    }

    const registrants: FinancialRegistrantRow[] = (reservations || []).map(
      (r: any) => ({
        reservationId: r.id,
        caravanId: r.caravan_id,
        caravanDepartureDate: r.caravans?.departure_date ?? "",
        createdAt: r.created_at,
        passengerName: r.profiles?.full_name ?? "Não identificado",
        wardId: ward.id,
        wardName: ward.name,
        fundingSource: r.funding_source ?? "membro",
        category: r.category ?? "standard",
        participantType: r.participant_type ?? "adulto",
        paymentAmount: Number(r.payment_amount || 0),
        status: r.status,
        confirmedAt: r.confirmed_at ?? null,
        isGuest: false,
      })
    );

    const summary = buildWardTransferSummary(
      ward.id,
      ward.name,
      false,
      registrants
    );

    const { data: creditRows, error: creditError } = await this.supabase
      .from("credit_ledger")
      .select(
        `
        id,
        user_id,
        ward_id,
        amount,
        source,
        status,
        origin_reservation_id,
        reason,
        expires_at,
        used_at,
        created_at,
        profiles!user_id ( full_name )
      `
      )
      .eq("stake_id", stakeId)
      .eq("ward_id", wardId)
      .order("created_at", { ascending: false });

    if (creditError) {
      throw new Error(
        `Erro ao buscar créditos da Ala: ${creditError.message}`
      );
    }

    const credits: FinancialCreditRow[] = (creditRows || []).map((c: any) => ({
      creditId: c.id,
      userId: c.user_id,
      memberName: c.profiles?.full_name ?? "Não identificado",
      wardId: ward.id,
      wardName: ward.name,
      amount: Number(c.amount || 0),
      source: c.source,
      status: c.status,
      originReservationId: c.origin_reservation_id ?? null,
      reason: c.reason ?? null,
      expiresAt: c.expires_at,
      usedAt: c.used_at ?? null,
      createdAt: c.created_at,
    }));

    return {
      stakeId: ward.stake_id,
      wardId: ward.id,
      wardName: ward.name,
      caravanId,
      summary,
      registrants,
      credits,
    };
  }
}
