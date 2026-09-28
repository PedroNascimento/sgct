const mockGetUser = jest.fn();
const mockCreateReservation = jest.fn();
const mockAddManifestEntry = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
  createSupabaseServiceClient: jest.fn(() => ({})),
}));

jest.mock("@/use-cases/reservation/create-reservation", () => ({
  createReservation: (...args: unknown[]) => mockCreateReservation(...args),
}));

jest.mock("@/use-cases/reservation/add-manifest-entry", () => ({
  addManifestEntry: (...args: unknown[]) => mockAddManifestEntry(...args),
}));

import {
  addManifestEntryAction,
  createReservationAction,
} from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";

const reservationInput = {
  caravanId: "10000000-0000-4000-8000-000000000001",
  seatNumber: 12,
  category: "standard" as const,
  participantType: "adulto" as const,
  fundingSource: "membro" as const,
  isPreferentialSeating: false,
};

describe("Server Actions de reserva — identidade confiável", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("recusa criar reserva sem usuário autenticado", async () => {
    const result = await createReservationAction(reservationInput);

    expect(result).toEqual({ success: false, error: "Não autenticado." });
    expect(mockCreateReservation).not.toHaveBeenCalled();
  });

  it("recusa adicionar manifesto sem usuário autenticado", async () => {
    const result = await addManifestEntryAction({
      reservationId: "20000000-0000-4000-8000-000000000001",
      fullName: "Criança Teste",
      birthDate: "2023-01-01",
      filiation: "Responsável Teste",
    });

    expect(result).toEqual({ success: false, error: "Não autenticado." });
    expect(mockAddManifestEntry).not.toHaveBeenCalled();
  });

  it("recusa reserva quando o limite distribuído do banco é excedido", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "30000000-0000-4000-8000-000000000001" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: false, error: null });

    const result = await createReservationAction(reservationInput);

    expect(mockRpc).toHaveBeenCalledWith("check_reservation_rate_limit");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Muitas tentativas");
    expect(mockCreateReservation).not.toHaveBeenCalled();
  });
});
