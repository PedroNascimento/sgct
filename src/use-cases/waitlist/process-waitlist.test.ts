/**
 * Testes para processWaitlist (T005.1, T005.2, T005.5).
 * Spec 005 / US-005.1 e US-005.2
 *
 * Regras:
 * - T005.1: Promoção do 1º da lista de espera + geração de crédito de 12 meses na mesma transação atômica.
 * - T005.2: Falha simulada entre promoção e crédito -> nenhuma das duas operações persiste (rollback).
 * - T005.5: Sem lista de espera -> reserva transiciona para 'cancelada_sem_credito' (valor perdido, sem crédito).
 * - Artigo I e IV da Constituição: TDD obrigatório.
 */

import { processWaitlist } from "./process-waitlist";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { WaitlistTransactionPort } from "@/domain/interfaces/waitlist-transaction-port";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

const mockReservationRepository: jest.Mocked<ReservationRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCaravanId: jest.fn(),
  findByCaravanAndStatuses: jest.fn(),
  getSeatOccupancy: jest.fn(),
  addManifestEntry: jest.fn(),
  getManifestEntriesByReservationId: jest.fn(),
  updateStatus: jest.fn(),
  updateBatch: jest.fn(),
  findPendingExpired: jest.fn(),
};

const mockTransactionPort: jest.Mocked<WaitlistTransactionPort> = {
  executeAtomicPromotion: jest.fn(),
};

describe("processWaitlist (T005.1, T005.2, T005.5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";
  const VACATED_USER_ID = "33333333-3333-3333-3333-333333333333";
  const PROMOTED_USER_ID = "44444444-4444-4444-4444-444444444444";
  const VACATED_RES_ID = "55555555-5555-5555-5555-555555555555";
  const WAITLIST_RES_ID_1 = "66666666-6666-6666-6666-666666666661";
  const WAITLIST_RES_ID_2 = "66666666-6666-6666-6666-666666666662";

  const confirmedVacatedReservation: Reservation = {
    id: VACATED_RES_ID,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: VACATED_USER_ID,
    ward_id: WARD_ID,
    seat_number: 14,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "confirmado",
    payment_amount: 130,
    confirmed_at: "2026-08-01T10:00:00Z",
    confirmation_rank: 5,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-08-01T09:00:00Z",
  };

  const waitlistReservation1: Reservation = {
    id: WAITLIST_RES_ID_1,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: PROMOTED_USER_ID,
    ward_id: WARD_ID,
    seat_number: 0,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "lista_espera",
    payment_amount: 130,
    confirmed_at: null,
    confirmation_rank: 1,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-08-02T08:00:00Z",
  };

  const waitlistReservation2: Reservation = {
    id: WAITLIST_RES_ID_2,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: "77777777-7777-7777-7777-777777777777",
    ward_id: WARD_ID,
    seat_number: 0,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "lista_espera",
    payment_amount: 130,
    confirmed_at: null,
    confirmation_rank: 2,
    created_at: "2026-08-02T09:00:00Z",
    qr_token: null,
    qr_token_expires_at: null,
  };

  describe("T005.1 — Promoção automática da lista de espera com geração de crédito", () => {
    it("promove a reserva mais antiga da lista de espera para o assento desocupado e gera crédito de 12 meses", async () => {
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedVacatedReservation);
      mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([
        waitlistReservation2,
        waitlistReservation1, // Ordem deliberadamente desordenada para validar ordenação
      ]);

      const expectedCredit: CreditLedgerEntry = {
        id: "credit-uuid-1",
        stake_id: STAKE_ID,
        ward_id: WARD_ID,
        user_id: VACATED_USER_ID,
        amount: 130,
        source: "waitlist_promotion",
        origin_reservation_id: VACATED_RES_ID,
        granted_by: null,
        reason: "Promoção da fila de espera",
        expires_at: "2027-08-10T12:00:00.000Z",
        used_at: null,
        status: "active",
        created_at: "2026-08-10T12:00:00.000Z",
      };

      const promotedReservation: Reservation = {
        ...waitlistReservation1,
        status: "confirmado",
        seat_number: 14,
        confirmed_at: "2026-08-10T12:00:00.000Z",
      };

      const vacatedReservationWithCredit: Reservation = {
        ...confirmedVacatedReservation,
        status: "cancelada_com_credito",
      };

      mockTransactionPort.executeAtomicPromotion.mockResolvedValueOnce({
        promoted: promotedReservation,
        credit: expectedCredit,
        vacated: vacatedReservationWithCredit,
      });

      const result = await processWaitlist(
        {
          caravanId: CARAVAN_ID,
          vacatedReservationId: VACATED_RES_ID,
          currentDate: "2026-08-10T12:00:00.000Z",
        },
        {
          reservationRepository: mockReservationRepository,
          transactionPort: mockTransactionPort,
        }
      );

      // Verifica chamada transacional atômica
      expect(mockTransactionPort.executeAtomicPromotion).toHaveBeenCalledTimes(1);
      const callArgs = mockTransactionPort.executeAtomicPromotion.mock.calls[0][0];

      expect(callArgs.vacatedReservationId).toBe(VACATED_RES_ID);
      expect(callArgs.promotedReservationId).toBe(WAITLIST_RES_ID_1);
      expect(callArgs.assignedSeatNumber).toBe(14);
      expect(callArgs.creditData.user_id).toBe(VACATED_USER_ID);
      expect(callArgs.creditData.amount).toBe(130);
      expect(callArgs.creditData.source).toBe("waitlist_promotion");
      expect(callArgs.creditData.origin_reservation_id).toBe(VACATED_RES_ID);
      expect(callArgs.creditData.expires_at).toBe("2027-08-10T12:00:00.000Z");

      expect(result.promoted?.id).toBe(WAITLIST_RES_ID_1);
      expect(result.promoted?.status).toBe("confirmado");
      expect(result.credit?.amount).toBe(130);
      expect(result.credit?.source).toBe("waitlist_promotion");
      expect(result.vacated?.status).toBe("cancelada_com_credito");
    });
  });

  describe("T005.2 — Falha simulada na transação -> Rollback atômico", () => {
    it("se a transação atômica falhar, propaga o erro e não faz mutação parcial fora da transação", async () => {
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedVacatedReservation);
      mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([waitlistReservation1]);

      mockTransactionPort.executeAtomicPromotion.mockRejectedValueOnce(
        new Error("Erro simulado no banco durante geração de crédito")
      );

      await expect(
        processWaitlist(
          {
            caravanId: CARAVAN_ID,
            vacatedReservationId: VACATED_RES_ID,
            currentDate: "2026-08-10T12:00:00.000Z",
          },
          {
            reservationRepository: mockReservationRepository,
            transactionPort: mockTransactionPort,
          }
        )
      ).rejects.toThrow("Erro simulado no banco durante geração de crédito");

      // Confirma que nenhuma atualização de status separada foi chamada fora da transação
      expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
      expect(mockReservationRepository.updateBatch).not.toHaveBeenCalled();
    });
  });

  describe("T005.5 — Ausência de lista de espera -> cancelada_sem_credito (valor perdido)", () => {
    it("se não houver lista de espera, marca a reserva como cancelada_sem_credito e não gera crédito", async () => {
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedVacatedReservation);
      mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([]); // Fila vazia

      const cancelledReservation: Reservation = {
        ...confirmedVacatedReservation,
        status: "cancelada_sem_credito",
      };

      mockReservationRepository.updateStatus.mockResolvedValueOnce(cancelledReservation);

      const result = await processWaitlist(
        {
          caravanId: CARAVAN_ID,
          vacatedReservationId: VACATED_RES_ID,
          currentDate: "2026-08-10T12:00:00.000Z",
        },
        {
          reservationRepository: mockReservationRepository,
          transactionPort: mockTransactionPort,
        }
      );

      expect(mockTransactionPort.executeAtomicPromotion).not.toHaveBeenCalled();
      expect(mockReservationRepository.updateStatus).toHaveBeenCalledWith(VACATED_RES_ID, {
        status: "cancelada_sem_credito",
      });
      expect(result.promoted).toBeUndefined();
      expect(result.credit).toBeUndefined();
      expect(result.vacated?.status).toBe("cancelada_sem_credito");
    });
  });

  describe("Validações de segurança e consistência", () => {
    it("rejeita se a reserva desocupada não for encontrada", async () => {
      mockReservationRepository.findById.mockResolvedValueOnce(null);

      await expect(
        processWaitlist(
          {
            caravanId: CARAVAN_ID,
            vacatedReservationId: VACATED_RES_ID,
          },
          {
            reservationRepository: mockReservationRepository,
            transactionPort: mockTransactionPort,
          }
        )
      ).rejects.toThrow("Reserva desocupada não encontrada.");
    });

    it("rejeita se a reserva pertencer a outra caravana", async () => {
      mockReservationRepository.findById.mockResolvedValueOnce({
        ...confirmedVacatedReservation,
        caravan_id: "99999999-9999-9999-9999-999999999999",
      });

      await expect(
        processWaitlist(
          {
            caravanId: CARAVAN_ID,
            vacatedReservationId: VACATED_RES_ID,
          },
          {
            reservationRepository: mockReservationRepository,
            transactionPort: mockTransactionPort,
          }
        )
      ).rejects.toThrow("Reserva não pertence à caravana indicada.");
    });

    it("ordena corretamente quando um candidato tem rank de confirmação e outro tem nulo", async () => {
      const waitlistWithoutRank: Reservation = {
        ...waitlistReservation1,
        id: "res-no-rank",
        confirmation_rank: null,
      };
      const waitlistWithRank: Reservation = {
        ...waitlistReservation2,
        id: "res-with-rank",
        confirmation_rank: 3,
      };

      mockReservationRepository.findById.mockResolvedValueOnce(confirmedVacatedReservation);
      mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([
        waitlistWithoutRank,
        waitlistWithRank,
      ]);

      mockTransactionPort.executeAtomicPromotion.mockResolvedValueOnce({
        promoted: waitlistWithRank,
        credit: {} as any,
        vacated: confirmedVacatedReservation,
      });

      // Sem informar currentDate (usa fallback de new Date())
      const result = await processWaitlist(
        {
          caravanId: CARAVAN_ID,
          vacatedReservationId: VACATED_RES_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          transactionPort: mockTransactionPort,
        }
      );

      expect(mockTransactionPort.executeAtomicPromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          promotedReservationId: "res-with-rank",
        })
      );
      expect(result.promoted?.id).toBe("res-with-rank");
    });
  });
});
