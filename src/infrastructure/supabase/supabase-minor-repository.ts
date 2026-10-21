/**
 * Implementação do MinorRepository e StoragePort no Supabase (Spec 006).
 * Artigo I: camada infrastructure/.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MinorRepository,
  CreateMinorFormData,
  StoragePort,
  AuditLogPort,
} from "@/domain/interfaces/minor-repository";
import type { MinorApprovalForm, MinorFormStatus } from "@/domain/types/minor";

export class SupabaseMinorRepository implements MinorRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createForm(data: CreateMinorFormData): Promise<MinorApprovalForm> {
    const { data: form, error } = await this.supabase
      .from("minor_approval_forms")
      .insert({
        reservation_id: data.reservation_id,
        storage_path: data.storage_path,
        status: data.status ?? "pending",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao registrar formulário de menor: ${error.message}`);
    }

    return form;
  }

  async findFormById(id: string): Promise<MinorApprovalForm | null> {
    const { data: form, error } = await this.supabase
      .from("minor_approval_forms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar formulário: ${error.message}`);
    }

    return form;
  }

  async findFormByReservationId(reservationId: string): Promise<MinorApprovalForm | null> {
    const { data: form, error } = await this.supabase
      .from("minor_approval_forms")
      .select("*")
      .eq("reservation_id", reservationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar formulário por reserva: ${error.message}`);
    }

    return form;
  }

  async findPendingFormsByWard(stakeId: string, wardId: string): Promise<MinorApprovalForm[]> {
    const { data, error } = await this.supabase
      .from("minor_approval_forms")
      .select("*")
      .eq("stake_id", stakeId)
      .eq("ward_id", wardId)
      .eq("status", "pending")
      .order("reservation_id");

    if (error) {
      throw new Error(`Erro ao buscar formulários pendentes da Ala: ${error.message}`);
    }

    return data ?? [];
  }

  async updateFormStatus(
    id: string,
    status: MinorFormStatus,
    approvedBy: string
  ): Promise<MinorApprovalForm> {
    const { data: updated, error } = await this.supabase
      .from("minor_approval_forms")
      .update({
        status,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status do formulário: ${error.message}`);
    }

    return updated;
  }
}

export class SupabaseStoragePort implements StoragePort {
  constructor(private readonly supabase: SupabaseClient) {}

  async uploadFile(
    bucket: string,
    path: string,
    fileBytes: Uint8Array | Buffer,
    contentType: string
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileBytes, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Erro no upload para o Storage: ${error.message}`);
    }

    return data.path;
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Erro ao gerar URL assinada: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Erro ao remover arquivo do Storage: ${error.message}`);
    }
  }
}

export class SupabaseAuditLogPort implements AuditLogPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async recordLog(entry: {
    stakeId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.supabase.from("audit_logs").insert({
      stake_id: entry.stakeId,
      actor_id: entry.userId,
      action: entry.action,
      entity: entry.resourceType,
      entity_id: entry.resourceId,
      metadata: entry.details ?? null,
    });

    if (error) {
      console.error("Falha ao registrar auditoria LGPD:", error);
    }
  }
}
