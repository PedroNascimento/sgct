/**
 * Implementação Supabase da WaitlistTransactionPort (Spec 005 / US-005.1 / T005.1 e T005.2).
 * Artigo I e IV: garante atomicidade e rollback em falhas via stored procedure ou transação Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WaitlistTransactionPort,
  WaitlistAtomicPromotionParams,
} from "@/domain/interfaces/waitlist-transaction-port";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

export class SupabaseWaitlistTransaction implements WaitlistTransactionPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async executeAtomicPromotion(params: WaitlistAtomicPromotionParams): Promise<{
    promoted: Reservation;
    credit: CreditLedgerEntry;
    vacated: Reservation;
  }> {
    // 1. Tenta executar via RPC atômica (PostgreSQL plpgsql) para garantia estrita de ACID rollback
    const { data: rpcData, error: rpcError } = await this.supabase.rpc(
      "process_waitlist_atomic_promotion",
      {
        p_vacated_reservation_id: params.vacatedReservationId,
        p_promoted_reservation_id: params.promotedReservationId,
        p_assigned_seat_number: params.assignedSeatNumber,
        p_credit_user_id: params.creditData.user_id,
        p_credit_amount: params.creditData.amount,
        p_credit_source: params.creditData.source,
        p_credit_expires_at: params.creditData.expires_at,
        p_credit_reason: params.creditData.reason ?? "Promoção da fila de espera",
      }
    );

    if (rpcError) {
      // Se a procedure falhou, propaga o erro diretamente (o banco garantiu o rollback)
      throw new Error(`Falha na transação atômica de promoção: ${rpcError.message}`);
    }

    if (rpcData) {
      return {
        promoted: rpcData.promoted as Reservation,
        credit: rpcData.credit as CreditLedgerEntry,
        vacated: rpcData.vacated as Reservation,
      };
    }

    // Fallback caso a procedure não retorne o formato json: busca os registros atualizados
    const { data: vacatedRow } = await this.supabase
      .from("reservations")
      .select()
      .eq("id", params.vacatedReservationId)
      .single();

    const { data: promotedRow } = await this.supabase
      .from("reservations")
      .select()
      .eq("id", params.promotedReservationId)
      .single();

    const { data: creditRow } = await this.supabase
      .from("credit_ledger")
      .select()
      .eq("origin_reservation_id", params.vacatedReservationId)
      .single();

    return {
      promoted: promotedRow as Reservation,
      credit: creditRow as CreditLedgerEntry,
      vacated: vacatedRow as Reservation,
    };
  }
}
