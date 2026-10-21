/**
 * Utilitário IndexedDB para cache de passageiros e check-ins offline (Spec 007 / T007.4 / A08).
 * Funciona de forma resiliente tanto no browser quanto seguro contra execução no SSR.
 * Particionado por caravana para isolamento multi-viagem e prevenção de vazamento local.
 */

import type { CheckInPassengerInfo } from "@/domain/interfaces/checkin-repository";
import type { OfflineCheckInItem } from "@/use-cases/checkin/sync-offline-checkins";

const BASE_DB_NAME = "sgct_checkin_db";
const DB_VERSION = 1;

export interface StoredPendingCheckIn extends OfflineCheckInItem {
  id?: number;
}

function getDatabaseName(caravanId?: string): string {
  return caravanId ? `${BASE_DB_NAME}_${caravanId}` : BASE_DB_NAME;
}

function openDatabase(caravanId?: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não está disponível no ambiente atual"));
    }

    const dbName = getDatabaseName(caravanId);
    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("valid_tokens")) {
        db.createObjectStore("valid_tokens", { keyPath: "reservationId" });
      }

      if (!db.objectStoreNames.contains("pending_checkins")) {
        db.createObjectStore("pending_checkins", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheValidTokens(
  tokens: CheckInPassengerInfo[],
  caravanId?: string
): Promise<void> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("valid_tokens", "readwrite");
    const store = tx.objectStore("valid_tokens");

    store.clear();
    for (const t of tokens) {
      store.put(t);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedValidTokens(caravanId?: string): Promise<CheckInPassengerInfo[]> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("valid_tokens", "readonly");
    const store = tx.objectStore("valid_tokens");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingCheckIn(
  item: OfflineCheckInItem,
  caravanId?: string
): Promise<number> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readwrite");
    const store = tx.objectStore("pending_checkins");
    const req = store.add(item);

    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCheckIns(caravanId?: string): Promise<StoredPendingCheckIn[]> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readonly");
    const store = tx.objectStore("pending_checkins");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingCheckIns(caravanId?: string): Promise<void> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readwrite");
    const store = tx.objectStore("pending_checkins");
    const req = store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove apenas check-ins pendentes confirmados ou duplicados na sincronização (A08).
 * Preserva itens que falharam para auditoria do líder e re-tentativa.
 */
export async function removePendingCheckIns(
  tokensOrIds: Array<string | number>,
  caravanId?: string
): Promise<void> {
  if (tokensOrIds.length === 0) return;
  const db = await openDatabase(caravanId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readwrite");
    const store = tx.objectStore("pending_checkins");
    const req = store.getAll();

    req.onsuccess = () => {
      const all = (req.result || []) as StoredPendingCheckIn[];
      const targets = new Set(tokensOrIds.map(String));

      for (const item of all) {
        const matchesId = item.id !== undefined && targets.has(String(item.id));
        const matchesToken = targets.has(item.token);
        if ((matchesId || matchesToken) && item.id !== undefined) {
          store.delete(item.id);
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCheckInsCount(caravanId?: string): Promise<number> {
  const db = await openDatabase(caravanId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readonly");
    const store = tx.objectStore("pending_checkins");
    const req = store.count();

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Expurgo completo de dados de uma caravana específica no IndexedDB local.
 */
export async function clearCaravanOfflineData(caravanId: string): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const dbName = getDatabaseName(caravanId);
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
