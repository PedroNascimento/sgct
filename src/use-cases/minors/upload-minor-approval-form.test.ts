/**
 * Teste unitário para uploadMinorApprovalForm (T006.6).
 * Valida upload para bucket privado 'minor-forms' no path {stake_id}/{ward_id}/{reservation_id}/...
 * Artigo I e Artigo V da Constituição.
 */

import { uploadMinorApprovalForm } from "./upload-minor-approval-form";
import type { MinorRepository, StoragePort } from "@/domain/interfaces/minor-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { MinorApprovalForm } from "@/domain/types/minor";

describe("uploadMinorApprovalForm (T006.6)", () => {
  let mockMinorRepo: jest.Mocked<MinorRepository>;
  let mockStoragePort: jest.Mocked<StoragePort>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;

  const reservation: Reservation = {
    id: "99999999-9999-9999-9999-999999999999",
    stake_id: "11111111-1111-1111-1111-111111111111",
    ward_id: "22222222-2222-2222-2222-222222222222",
    caravan_id: "33333333-3333-3333-3333-333333333333",
    user_id: "44444444-4444-4444-4444-444444444444",
    seat_number: 10,
    boarding_point_id: null,
    category: "standard",
    participant_type: "jovem",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pendente",
    payment_amount: 130,
    confirmed_at: null,
    confirmation_rank: null,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockMinorRepo = {
      createForm: jest.fn(),
      findFormById: jest.fn(),
      findFormByReservationId: jest.fn(),
      findPendingFormsByWard: jest.fn(),
      updateFormStatus: jest.fn(),
    };

    mockStoragePort = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

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
    };
  });

  it("deve fazer upload no path correto '{stake_id}/{ward_id}/{reservation_id}/{filename}' e salvar em minor_approval_forms", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(reservation);
    mockStoragePort.uploadFile.mockResolvedValueOnce("path-returned");
    mockMinorRepo.createForm.mockResolvedValueOnce({
      id: "form-1",
      stake_id: reservation.stake_id,
      ward_id: reservation.ward_id!,
      reservation_id: reservation.id,
      storage_path: `${reservation.stake_id}/${reservation.ward_id}/${reservation.id}/autorizacao.pdf`,
      status: "pending",
      approved_by: null,
      approved_at: null,
    });

    const fileBytes = Buffer.from("conteudo-pdf-ficticio");

    const result = await uploadMinorApprovalForm(
      {
        userId: reservation.user_id,
        reservationId: reservation.id,
        fileName: "autorizacao.pdf",
        fileType: "application/pdf",
        fileSize: fileBytes.length,
        fileBytes,
      },
      {
        minorRepository: mockMinorRepo,
        storagePort: mockStoragePort,
        reservationRepository: mockReservationRepo,
      }
    );

    expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
      "minor-forms",
      `${reservation.stake_id}/${reservation.ward_id}/${reservation.id}/autorizacao.pdf`,
      fileBytes,
      "application/pdf"
    );

    expect(mockMinorRepo.createForm).toHaveBeenCalledWith({
      stake_id: reservation.stake_id,
      ward_id: reservation.ward_id!,
      reservation_id: reservation.id,
      storage_path: `${reservation.stake_id}/${reservation.ward_id}/${reservation.id}/autorizacao.pdf`,
      status: "pending",
    });

    expect(result.status).toBe("pending");
  });

  it("deve rejeitar se o usuário autenticado não for o dono da reserva", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(reservation);

    await expect(
      uploadMinorApprovalForm(
        {
          userId: "outro-usuario-invalido",
          reservationId: reservation.id,
          fileName: "autorizacao.pdf",
          fileType: "application/pdf",
          fileSize: 100,
          fileBytes: Buffer.from("teste"),
        },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          reservationRepository: mockReservationRepo,
        }
      )
    ).rejects.toThrow("Não autorizado: a reserva pertence a outro usuário");
  });

  it("deve rejeitar tipo de arquivo não permitido (ex: .exe ou .txt)", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(reservation);

    await expect(
      uploadMinorApprovalForm(
        {
          userId: reservation.user_id,
          reservationId: reservation.id,
          fileName: "malware.exe",
          fileType: "application/x-msdownload" as any,
          fileSize: 100,
          fileBytes: Buffer.from("teste"),
        },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          reservationRepository: mockReservationRepo,
        }
      )
    ).rejects.toThrow("Apenas arquivos PDF, JPEG ou PNG são permitidos");
  });

  it("deve remover arquivo do storage por compensação se a criação no banco falhar (A03)", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(reservation);
    mockStoragePort.uploadFile.mockResolvedValueOnce("path-ok");
    mockMinorRepo.createForm.mockRejectedValueOnce(new Error("Erro de banco de dados"));

    await expect(
      uploadMinorApprovalForm(
        {
          userId: reservation.user_id,
          reservationId: reservation.id,
          fileName: "documento.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          fileBytes: Buffer.from("conteudo"),
        },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          reservationRepository: mockReservationRepo,
        }
      )
    ).rejects.toThrow("Erro de banco de dados");

    expect(mockStoragePort.uploadFile).toHaveBeenCalled();
    expect(mockStoragePort.deleteFile).toHaveBeenCalledWith(
      "minor-forms",
      `${reservation.stake_id}/${reservation.ward_id}/${reservation.id}/documento.pdf`
    );
  });
});
