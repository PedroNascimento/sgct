/**
 * Caso de uso: Upload de formulário de autorização de menor (Spec 006 - T006.6 / US-006.3).
 * Artigo I: Domínio puro / Use-case.
 * Artigo II: Storage path no padrão estrito {stake_id}/{ward_id}/{reservation_id}/{filename}.
 * Artigo V: Validação Zod estrita de tamanho e tipo MIME.
 */

import { uploadMinorApprovalFormSchema } from "@/domain/schemas/minor";
import type { MinorRepository, StoragePort } from "@/domain/interfaces/minor-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { MinorApprovalForm } from "@/domain/types/minor";

export interface UploadMinorApprovalFormInput {
  userId: string;
  reservationId: string;
  fileName: string;
  fileType: "application/pdf" | "image/jpeg" | "image/png";
  fileSize: number;
  fileBytes: Uint8Array | Buffer;
}

export interface UploadMinorApprovalFormDependencies {
  minorRepository: MinorRepository;
  storagePort: StoragePort;
  reservationRepository: ReservationRepository;
}

export async function uploadMinorApprovalForm(
  input: UploadMinorApprovalFormInput,
  deps: UploadMinorApprovalFormDependencies
): Promise<MinorApprovalForm> {
  const { minorRepository, storagePort, reservationRepository } = deps;

  // 1. Validação com Zod (Artigo V)
  const validated = uploadMinorApprovalFormSchema.parse({
    reservationId: input.reservationId,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
  });

  // 2. Busca e validação da reserva
  const reservation = await reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error(`Reserva não encontrada: ${validated.reservationId}`);
  }

  // Verifica que o usuário é o dono da reserva
  if (reservation.user_id !== input.userId) {
    throw new Error("Não autorizado: a reserva pertence a outro usuário.");
  }

  // 3. Monta o path estrito: {stake_id}/{ward_id}/{reservation_id}/{cleanFileName}
  const cleanFileName = validated.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const wardId = reservation.ward_id ?? "no-ward";
  const storagePath = `${reservation.stake_id}/${wardId}/${reservation.id}/${cleanFileName}`;

  // 4. Upload no bucket privado 'minor-forms'
  await storagePort.uploadFile("minor-forms", storagePath, input.fileBytes, validated.fileType);

  // 5. Registro em minor_approval_forms com compensação atômica (A03)
  try {
    const form = await minorRepository.createForm({
      stake_id: reservation.stake_id,
      ward_id: reservation.ward_id ?? undefined,
      reservation_id: reservation.id,
      storage_path: storagePath,
      status: "pending",
    });

    return form;
  } catch (dbError) {
    // Compensação: se o registro no banco falhar, remove o arquivo do Storage
    if (typeof storagePort.deleteFile === "function") {
      await storagePort.deleteFile("minor-forms", storagePath).catch(() => {});
    }
    throw dbError;
  }
}
