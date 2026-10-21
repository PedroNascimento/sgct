import type { AidRequest, AidStatus, AidType } from "../types/aid";

export interface CreateAidRequestData {
  reservation_id: string;
  aid_type: AidType;
  requested_by: string;
  stake_id?: string;
  ward_id?: string;
  notes?: string | null;
}

export interface AidRepository {
  create(data: CreateAidRequestData): Promise<AidRequest>;
  findById(id: string): Promise<AidRequest | null>;
  findByReservationId(reservationId: string): Promise<AidRequest | null>;
  findPendingByWard(stakeId: string, wardId: string): Promise<AidRequest[]>;
  findPendingByStake(stakeId: string): Promise<AidRequest[]>;
  updateStatus(
    id: string,
    status: AidStatus,
    approvedBy: string,
    notes?: string | null
  ): Promise<AidRequest>;
}
