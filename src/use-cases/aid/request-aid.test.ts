import { requestAid } from "./request-aid";
import type { AidRepository } from "@/domain/interfaces/aid-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";

describe("Use-case: requestAid (Spec 012 / T012.2 / US-012.1 / US-012.3)", () => {
  const mockAidRepo: jest.Mocked<AidRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByReservationId: jest.fn(),
    findPendingByWard: jest.fn(),
    findPendingByStake: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockReservationRepo: jest.Mocked<ReservationRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByCaravanAndSeat: jest.fn(),
    listByCaravan: jest.fn(),
    listByUser: jest.fn(),
    updateStatus: jest.fn(),
    updateBatch: jest.fn(),
    addManifestEntry: jest.fn(),
    getManifestEntriesByReservationId: jest.fn(),
    countWaitlistAhead: jest.fn(),
    findPendingExpired: jest.fn(),
  };

  const mockProfileRepo: jest.Mocked<ProfileRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockCaravanRepo: jest.Mocked<CaravanRepository> = {
    findById: jest.fn(),
    listByStake: jest.fn(),
    listOpenCaravans: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReservation = {
    id: "res-123",
    stake_id: "stake-1",
    ward_id: "ward-1",
    caravan_id: "caravan-1",
    user_id: "member-1",
    seat_number: 10,
    category: "standard" as const,
    participant_type: "adulto" as const,
    funding_source: "auxilio_area_investidura" as const,
    is_preferential_seating: false,
    status: "aguardando_auxilio" as const,
    payment_amount: 130,
    created_at: new Date().toISOString(),
  };

  const adminProfile = {
    id: "admin-1",
    stake_id: "stake-1",
    ward_id: "ward-1",
    full_name: "Admin da Ala",
    role: "admin_ala",
    is_active: true,
    birth_date: "1980-01-01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const caravanFuture = {
    id: "caravan-1",
    stake_id: "stake-1",
    departure_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 dias
    price_standard: 130,
    price_officiant: 117,
    seat_limit: 50,
    registration_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open" as const,
    created_by: "admin-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("cria solicitação de auxílio com sucesso para reserva em aguardando_auxilio", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
    mockProfileRepo.findById.mockResolvedValueOnce(adminProfile);
    mockCaravanRepo.findById.mockResolvedValueOnce(caravanFuture);
    mockAidRepo.findByReservationId.mockResolvedValueOnce(null);
    mockAidRepo.create.mockResolvedValueOnce({
      id: "aid-1",
      stake_id: "stake-1",
      ward_id: "ward-1",
      reservation_id: "res-123",
      aid_type: "auxilio_area_investidura",
      status: "pending",
      requested_by: "admin-1",
      approved_by: null,
      requested_at: new Date().toISOString(),
      approved_at: null,
      notes: "Processo em andamento no bispado",
    });

    const result = await requestAid(
      {
        reservationId: "res-123",
        aidType: "auxilio_area_investidura",
        requestedBy: "admin-1",
        notes: "Processo em andamento no bispado",
      },
      {
        aidRepository: mockAidRepo,
        reservationRepository: mockReservationRepo,
        profileRepository: mockProfileRepo,
        caravanRepository: mockCaravanRepo,
      }
    );

    expect(result.aidRequest.status).toBe("pending");
    expect(result.aidRequest.aid_type).toBe("auxilio_area_investidura");
    expect(result.hasInsufficientTimeWarning).toBe(false);
    expect(mockAidRepo.create).toHaveBeenCalledTimes(1);
  });

  it("emite alerta não-bloqueante quando antecedência é menor que 25 dias (US-012.3)", async () => {
    const caravanSoon = {
      ...caravanFuture,
      departure_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias (< 25 dias)
    };

    mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
    mockProfileRepo.findById.mockResolvedValueOnce(adminProfile);
    mockCaravanRepo.findById.mockResolvedValueOnce(caravanSoon);
    mockAidRepo.findByReservationId.mockResolvedValueOnce(null);
    mockAidRepo.create.mockResolvedValueOnce({
      id: "aid-2",
      stake_id: "stake-1",
      ward_id: "ward-1",
      reservation_id: "res-123",
      aid_type: "auxilio_area_investidura",
      status: "pending",
      requested_by: "admin-1",
      approved_by: null,
      requested_at: new Date().toISOString(),
      approved_at: null,
      notes: null,
    });

    const result = await requestAid(
      {
        reservationId: "res-123",
        aidType: "auxilio_area_investidura",
        requestedBy: "admin-1",
      },
      {
        aidRepository: mockAidRepo,
        reservationRepository: mockReservationRepo,
        profileRepository: mockProfileRepo,
        caravanRepository: mockCaravanRepo,
      }
    );

    expect(result.hasInsufficientTimeWarning).toBe(true);
    expect(result.warningMessage).toContain("menos de 25 dias");
  });

  it("rejeita criação se o solicitante pertencer a outra Ala (Artigo II)", async () => {
    const crossAdmin = {
      ...adminProfile,
      id: "admin-other-ward",
      ward_id: "ward-other",
    };

    mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
    mockProfileRepo.findById.mockResolvedValueOnce(crossAdmin);

    await expect(
      requestAid(
        {
          reservationId: "res-123",
          aidType: "auxilio_area_investidura",
          requestedBy: "admin-other-ward",
        },
        {
          aidRepository: mockAidRepo,
          reservationRepository: mockReservationRepo,
          profileRepository: mockProfileRepo,
          caravanRepository: mockCaravanRepo,
        }
      )
    ).rejects.toThrow("Permissão negada");
  });
});
