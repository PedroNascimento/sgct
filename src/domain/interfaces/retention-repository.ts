/**
 * Interface do repositório para políticas de retenção de dados e expurgo LGPD (Spec 009 / Artigo VI).
 * Artigo I: desacoplamento de infraestrutura.
 */

export interface ExpiredMinorFormItem {
  id: string;
  stakeId: string;
  storagePath: string;
  caravanDepartureDate: string;
  caravanReturnDate?: string | null;
}

export interface RetentionRepository {
  findExpiredMinorForms(cutoffDate: Date): Promise<ExpiredMinorFormItem[]>;
  deleteMinorForm(id: string): Promise<void>;
  deleteExpiredManifestEntries(cutoffDate: Date): Promise<number>;
  deleteFile(bucket: string, path: string): Promise<void>;
}
