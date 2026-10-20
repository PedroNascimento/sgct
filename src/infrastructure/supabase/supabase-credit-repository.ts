/**
 * Implementação Supabase do CreditRepository (Spec 005 / US-005.1 e US-005.3).
 * Artigo I: infraestrutura que implementa a interface de domínio pura.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreditRepository,
  CreateCreditEntryData,
} from "@/domain/interfaces/credit-repository";
import type { CreditLedgerEntry, CreditStatus } from "@/domain/types/credit";

export class SupabaseCreditRepository implements CreditRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateCreditEntryData): Promise<CreditLedgerEntry> {
    const { data: created, error } = await this.supabase
      .from("credit_ledger")
      .insert({
        stake_id: data.stake_id,
        ward_id: data.ward_id,
        user_id: data.user_id,
        amount: data.amount,
        source: data.source,
        origin_reservation_id: data.origin_reservation_id,
        granted_by: data.granted_by,
        reason: data.reason,
        expires_at: data.expires_at,
        status: data.status ?? "active",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar entrada no livro de créditos: ${error.message}`);
    }

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<CreditLedgerEntry | null> {
    const { data, error } = await this.supabase
      .from("credit_ledger")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar crédito: ${error.message}`);
    }

    return data ? this.mapToDomain(data) : null;
  }

  async findByUserId(userId: string): Promise<CreditLedgerEntry[]> {
    const { data, error } = await this.supabase
      .from("credit_ledger")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar créditos do usuário: ${error.message}`);
    }

    return (data ?? []).map(this.mapToDomain);
  }

  async findActiveByUserId(userId: string): Promise<CreditLedgerEntry[]> {
    const { data, error } = await this.supabase
      .from("credit_ledger")
      .select()
      .eq("user_id", userId)
      .eq("status", "active")
      .order("expires_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar créditos ativos do usuário: ${error.message}`);
    }

    return (data ?? []).map(this.mapToDomain);
  }

  async findExpiredActive(currentDate: string): Promise<CreditLedgerEntry[]> {
    const { data, error } = await this.supabase
      .from("credit_ledger")
      .select()
      .eq("status", "active")
      .lte("expires_at", currentDate);

    if (error) {
      throw new Error(`Erro ao buscar créditos ativos expirados: ${error.message}`);
    }

    return (data ?? []).map(this.mapToDomain);
  }

  async updateStatus(
    id: string,
    status: CreditStatus,
    usedAt?: string | null
  ): Promise<CreditLedgerEntry> {
    const updatePayload: Record<string, unknown> = { status };
    if (usedAt !== undefined) {
      updatePayload.used_at = usedAt;
    }

    const { data, error } = await this.supabase
      .from("credit_ledger")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status do crédito: ${error.message}`);
    }

    return this.mapToDomain(data);
  }

  private mapToDomain(row: Record<string, unknown>): CreditLedgerEntry {
    return {
      id: row.id as string,
      stake_id: row.stake_id as string,
      ward_id: row.ward_id as string,
      user_id: row.user_id as string,
      amount: Number(row.amount),
      source: row.source as CreditLedgerEntry["source"],
      origin_reservation_id: (row.origin_reservation_id as string) ?? null,
      granted_by: (row.granted_by as string) ?? null,
      reason: (row.reason as string) ?? null,
      expires_at: row.expires_at as string,
      used_at: (row.used_at as string) ?? null,
      status: row.status as CreditLedgerEntry["status"],
      created_at: row.created_at as string,
    };
  }
}
