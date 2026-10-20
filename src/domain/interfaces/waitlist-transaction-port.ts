/**
 * Porta transacional para promoção atômica da lista de espera e geração de crédito.
 * Artigo I e IV: garante execução de rollback caso qualquer etapa falhe (T005.1 / T005.2).
 */

import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";
import type { CreateCreditEntryData } from "./credit-repository";

export interface WaitlistAtomicPromotionParams {
  vacatedReservationId: string;
  promotedReservationId: string;
  assignedSeatNumber: number;
  creditData: CreateCreditEntryData;
}

export interface WaitlistTransactionPort {
  executeAtomicPromotion(params: WaitlistAtomicPromotionParams): Promise<{
    promoted: Reservation;
    credit: CreditLedgerEntry;
    vacated: Reservation;
  }>;
}
