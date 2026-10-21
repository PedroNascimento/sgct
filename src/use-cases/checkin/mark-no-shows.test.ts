import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MarkNoShows } from "./mark-no-shows";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CheckInRepository } from "@/domain/interfaces/checkin-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { CheckIn } from "@/domain/types/checkin";

describe("MarkNoShows (T007.7)", () => {
  let markNoShows: MarkNoShows;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;
  let mockCheckInRepo: jest.Mocked<CheckInRepository>;

  const caravanId = "caravan-123";

  beforeEach(() => {
    mockReservationRepo = {
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
      updateQrToken: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    mockCheckInRepo = {
      createCheckIn: jest.fn(),
      findByReservationAndDirection: jest.fn(),
      listByCaravan: jest.fn(),
      listValidCaravanTokens: jest.fn(),
    } as unknown as jest.Mocked<CheckInRepository>;

    markNoShows = new MarkNoShows(mockReservationRepo, mockCheckInRepo);
  });

  it("deve marcar como no_show todas as reservas 'confirmado' que não tiverem check-in de ida", async () => {
    const res1 = {
      id: "res-1",
      caravan_id: caravanId,
      status: "confirmado",
    } as Reservation;

    const res2 = {
      id: "res-2",
      caravan_id: caravanId,
      status: "confirmado",
    } as Reservation;

    const res3 = {
      id: "res-3",
      caravan_id: caravanId,
      status: "confirmado",
    } as Reservation;

    // res1 fez check-in de ida
    const checkin1 = {
      id: "chk-1",
      reservation_id: "res-1",
      direction: "ida",
    } as CheckIn;

    // res2 fez check-in mas só de volta (anômalo ou não de ida)
    const checkin2 = {
      id: "chk-2",
      reservation_id: "res-2",
      direction: "volta",
    } as CheckIn;

    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue([res1, res2, res3]);
    mockCheckInRepo.listByCaravan.mockResolvedValue([checkin1, checkin2]);
    mockReservationRepo.updateStatus.mockImplementation(async (id, data) => ({
      id,
      status: data.status,
    } as Reservation));

    const result = await markNoShows.execute({ caravanId });

    // res2 e res3 não tiveram check-in de ida -> devem virar no_show
    expect(result.markedCount).toBe(2);
    expect(result.markedReservationIds).toEqual(["res-2", "res-3"]);

    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith("res-2", {
      status: "no_show",
    });
    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith("res-3", {
      status: "no_show",
    });
    expect(mockReservationRepo.updateStatus).not.toHaveBeenCalledWith("res-1", expect.anything());
  });

  it("não deve alterar reservas quando todos os confirmados tiverem feito check-in de ida", async () => {
    const res1 = { id: "res-1", caravan_id: caravanId, status: "confirmado" } as Reservation;
    const checkin1 = { id: "chk-1", reservation_id: "res-1", direction: "ida" } as CheckIn;

    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue([res1]);
    mockCheckInRepo.listByCaravan.mockResolvedValue([checkin1]);

    const result = await markNoShows.execute({ caravanId });

    expect(result.markedCount).toBe(0);
    expect(result.markedReservationIds).toEqual([]);
    expect(mockReservationRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("não altera reservas se não houver reservas confirmadas", async () => {
    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue([]);
    mockCheckInRepo.listByCaravan.mockResolvedValue([]);

    const result = await markNoShows.execute({ caravanId });

    expect(result.markedCount).toBe(0);
    expect(result.markedReservationIds).toEqual([]);
    expect(mockReservationRepo.updateStatus).not.toHaveBeenCalled();
  });
});
