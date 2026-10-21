import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  GeneratePassengerManifest,
  formatManifestAsCsv,
  type ManifestRow,
  type ManifestDataProvider,
} from "./generate-passenger-manifest";

describe("GeneratePassengerManifest (T007.9)", () => {
  let generatePassengerManifest: GeneratePassengerManifest;
  let mockDataProvider: jest.Mocked<ManifestDataProvider>;

  const caravanId = "caravan-natal-recife-01";

  beforeEach(() => {
    mockDataProvider = {
      getConfirmedReservationsWithProfile: jest.fn(),
      getLapChildrenByCaravanId: jest.fn(),
    };

    generatePassengerManifest = new GeneratePassengerManifest(mockDataProvider);
  });

  it("deve consolidar passageiros sentados ordenados por poltrona e incluir crianças de colo", async () => {
    mockDataProvider.getConfirmedReservationsWithProfile.mockResolvedValue([
      {
        reservationId: "res-2",
        seatNumber: 15,
        passengerName: "Maria Oliveira",
        document: "987.654.321-00",
        birthDate: "1988-03-20",
        passengerType: "adulto",
        wardName: "Ala Potengi",
        phone: "(84) 98888-2222",
        status: "confirmado",
      },
      {
        reservationId: "res-1",
        seatNumber: 3,
        passengerName: "João Silva",
        document: "123.456.789-00",
        birthDate: "1980-05-12",
        passengerType: "adulto",
        wardName: "Ala Candelária",
        phone: "(84) 99999-1111",
        status: "presente",
      },
    ]);

    mockDataProvider.getLapChildrenByCaravanId.mockResolvedValue([
      {
        id: "lap-1",
        reservationId: "res-1",
        fullName: "Bebê Silva",
        birthDate: "2024-01-10",
        filiation: "João Silva e Ana Silva",
        wardName: "Ala Candelária",
        responsibleName: "João Silva",
      },
    ]);

    const rows = await generatePassengerManifest.execute(caravanId);

    expect(rows).toHaveLength(3);

    // Primeiro passageiro sentado deve ser o assento 3
    expect(rows[0]).toEqual({
      seatNumber: 3,
      seatLabel: "3",
      passengerName: "João Silva",
      document: "123.456.789-00",
      birthDate: "1980-05-12",
      passengerType: "adulto",
      wardName: "Ala Candelária",
      isLapChild: false,
      responsibleName: null,
      filiation: null,
      phone: "(84) 99999-1111",
      status: "presente",
    });

    // Segundo passageiro sentado deve ser o assento 15
    expect(rows[1]).toEqual({
      seatNumber: 15,
      seatLabel: "15",
      passengerName: "Maria Oliveira",
      document: "987.654.321-00",
      birthDate: "1988-03-20",
      passengerType: "adulto",
      wardName: "Ala Potengi",
      isLapChild: false,
      responsibleName: null,
      filiation: null,
      phone: "(84) 98888-2222",
      status: "confirmado",
    });

    // Terceiro item deve ser a criança de colo (sem assento físico)
    expect(rows[2]).toEqual({
      seatNumber: null,
      seatLabel: "Colo",
      passengerName: "Bebê Silva",
      document: null,
      birthDate: "2024-01-10",
      passengerType: "crianca_colo",
      wardName: "Ala Candelária",
      isLapChild: true,
      responsibleName: "João Silva",
      filiation: "João Silva e Ana Silva",
      phone: null,
      status: "confirmado",
    });
  });

  it("deve formatar o manifesto corretamente para CSV (ANTT/DER)", () => {
    const rows: ManifestRow[] = [
      {
        seatNumber: 1,
        seatLabel: "1",
        passengerName: "Carlos Souza",
        document: "111.222.333-44",
        birthDate: "1995-10-15",
        passengerType: "adulto",
        wardName: "Ala Neópolis",
        isLapChild: false,
        responsibleName: null,
        filiation: null,
        phone: "(84) 97777-3333",
        status: "confirmado",
      },
      {
        seatNumber: null,
        seatLabel: "Colo",
        passengerName: "Lucas Souza",
        document: null,
        birthDate: "2023-08-01",
        passengerType: "crianca_colo",
        wardName: "Ala Neópolis",
        isLapChild: true,
        responsibleName: "Carlos Souza",
        filiation: "Carlos Souza e Mariana Souza",
        phone: null,
        status: "confirmado",
      },
    ];

    const csv = formatManifestAsCsv(rows);

    expect(csv).toContain("Poltrona;Nome Completo;Documento / CPF;Data Nascimento;Tipo;Ala;Responsavel;Filiacao;Telefone");
    expect(csv).toContain("1;\"Carlos Souza\";111.222.333-44;1995-10-15;adulto;\"Ala Neópolis\";;;\"(84) 97777-3333\"");
    expect(csv).toContain("Colo;\"Lucas Souza\";;2023-08-01;crianca_colo;\"Ala Neópolis\";\"Carlos Souza\";\"Carlos Souza e Mariana Souza\";");
  });
});
