/**
 * Interface do repositório de Formulários de Autorização de Menores e Storage Port.
 * Artigo I: camada domain/ pura, desacoplada de Supabase e frameworks.
 */

import type { MinorApprovalForm, MinorFormStatus } from "@/domain/types/minor";

export interface CreateMinorFormData {
  stake_id?: string;
  ward_id?: string;
  reservation_id: string;
  storage_path: string;
  status?: MinorFormStatus;
}

export interface StoragePort {
  uploadFile(bucket: string, path: string, fileBytes: Uint8Array | Buffer, contentType: string): Promise<string>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
}

export interface AuditLogPort {
  recordLog(entry: {
    stakeId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export interface MinorRepository {
  createForm(data: CreateMinorFormData): Promise<MinorApprovalForm>;
  findFormById(id: string): Promise<MinorApprovalForm | null>;
  findFormByReservationId(reservationId: string): Promise<MinorApprovalForm | null>;
  findPendingFormsByWard(stakeId: string, wardId: string): Promise<MinorApprovalForm[]>;
  updateFormStatus(id: string, status: MinorFormStatus, approvedBy: string): Promise<MinorApprovalForm>;
}
