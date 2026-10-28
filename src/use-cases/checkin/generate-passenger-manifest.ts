/**
 * Caso de uso: Geração do Manifesto Consolidado de Passageiros (Spec 007 / T007.9 / D06).
 *
 * Consolida passageiros com assento confirmado/presente + crianças de colo vinculadas
 * (0 a 5 anos), gerando estrutura para visualização e exportação CSV para fiscalização (ANTT / DER).
 */

export interface ManifestRow {
  seatNumber: number | null;
  seatLabel: string;
  passengerName: string;
  document: string | null;
  birthDate: string | null;
  passengerType: string;
  wardName: string;
  isLapChild: boolean;
  responsibleName?: string | null;
  filiation?: string | null;
  phone?: string | null;
  status: string;
}

export interface ConfirmedPassengerData {
  reservationId: string;
  seatNumber: number;
  passengerName: string;
  document: string | null;
  birthDate: string | null;
  passengerType: string;
  wardName: string;
  phone: string | null;
  status: string;
}

export interface LapChildData {
  id: string;
  reservationId: string;
  fullName: string;
  birthDate: string;
  filiation: string;
  wardName: string;
  responsibleName: string;
}

export interface ManifestDataProvider {
  getConfirmedReservationsWithProfile(
    caravanId: string
  ): Promise<ConfirmedPassengerData[]>;
  getLapChildrenByCaravanId(caravanId: string): Promise<LapChildData[]>;
}

export class GeneratePassengerManifest {
  constructor(private readonly dataProvider: ManifestDataProvider) {}

  async execute(caravanId: string): Promise<ManifestRow[]> {
    const [confirmedPassengers, lapChildren] = await Promise.all([
      this.dataProvider.getConfirmedReservationsWithProfile(caravanId),
      this.dataProvider.getLapChildrenByCaravanId(caravanId),
    ]);

    // Ordenar passageiros com assento pelo número da poltrona crescente
    const sortedPassengers = [...confirmedPassengers].sort(
      (a, b) => a.seatNumber - b.seatNumber
    );

    const manifestRows: ManifestRow[] = sortedPassengers.map((p) => ({
      seatNumber: p.seatNumber,
      seatLabel: String(p.seatNumber),
      passengerName: p.passengerName,
      document: p.document,
      birthDate: p.birthDate,
      passengerType: p.passengerType,
      wardName: p.wardName,
      isLapChild: false,
      responsibleName: null,
      filiation: null,
      phone: p.phone,
      status: p.status,
    }));

    // Anexar crianças de colo (sem assento físico)
    for (const child of lapChildren) {
      manifestRows.push({
        seatNumber: null,
        seatLabel: "Colo",
        passengerName: child.fullName,
        document: null,
        birthDate: child.birthDate,
        passengerType: "crianca_colo",
        wardName: child.wardName,
        isLapChild: true,
        responsibleName: child.responsibleName,
        filiation: child.filiation,
        phone: null,
        status: "confirmado",
      });
    }

    return manifestRows;
  }
}

/**
 * Utilitário para formatar a lista de passageiros em formato CSV compatível
 * com o padrão exigido por fiscalizações de transporte rodoviário e Excel no Brasil.
 */
import { sanitizeCsvField } from "@/domain/utils/csv-sanitizer";

export function formatManifestAsCsv(rows: ManifestRow[]): string {
  const headers = [
    "Poltrona",
    "Nome Completo",
    "Documento / CPF",
    "Data Nascimento",
    "Tipo",
    "Ala",
    "Responsavel",
    "Filiacao",
    "Telefone",
  ];

  const lines = [headers.join(";")];

  for (const row of rows) {
    const escapeCsv = (val: string | null | undefined) =>
      val ? sanitizeCsvField(val, { alwaysQuote: true }) : "";

    const line = [
      row.seatLabel,
      escapeCsv(row.passengerName),
      row.document || "",
      row.birthDate || "",
      row.passengerType,
      escapeCsv(row.wardName),
      escapeCsv(row.responsibleName),
      escapeCsv(row.filiation),
      escapeCsv(row.phone),
    ].join(";");

    lines.push(line);
  }

  // Adiciona BOM UTF-8 (\uFEFF) para garantir correta acentuação no Excel
  return "\uFEFF" + lines.join("\n");
}
