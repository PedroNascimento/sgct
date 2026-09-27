/**
 * Interface do repositório de Caravanas e Pontos de Embarque.
 * Artigo I: abstração pura para desacoplar use-cases de banco de dados.
 */

import type { Caravan, BoardingPoint, CaravanStatus, CaravanPublicSummary } from "@/domain/types/caravan";

export interface CreateCaravanData {
  stake_id: string;
  departure_date: string;
  return_date?: string | null;
  price_standard: number;
  price_officiant: number;
  seat_limit?: number;
  waitlist_limit?: number;
  registration_deadline: string;
  min_quorum?: number;
  quorum_check_date: string;
  status?: CaravanStatus;
  caravan_leader_id?: string | null;
  created_by: string;
}

export interface CreateBoardingPointData {
  caravan_id: string;
  stake_id: string;
  name: string;
  boarding_time: string;
}

export interface CaravanRepository {
  findById(id: string): Promise<Caravan | null>;
  findByStakeId(stakeId: string): Promise<Caravan[]>;
  create(data: CreateCaravanData): Promise<Caravan>;
  updateStatus(id: string, status: CaravanStatus): Promise<Caravan>;
  addBoardingPoint(data: CreateBoardingPointData): Promise<BoardingPoint>;
  getBoardingPointsByCaravanId(caravanId: string): Promise<BoardingPoint[]>;
  findPublicSummariesByStakeId(stakeId: string): Promise<CaravanPublicSummary[]>;
}
