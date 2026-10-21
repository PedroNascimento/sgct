/**
 * Utilitário IndexedDB para cache de passageiros e check-ins offline (Spec 007 / T007.4).
 * Funciona de forma resiliente tanto no browser quanto seguro contra execução no SSR.
 */

import type { CheckInPassengerInfo } from "@/domain/interfaces/checkin-repository";
import type { OfflineCheckInItem } from "@/use-cases/checkin/sync-offline-checkins";

const DB_NAME = "sgct_checkin_db";
const DB_VERSION = 1;

export interface StoredPendingCheckIn extends OfflineCheckInItem {
  id?: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não está disponível no ambiente atual"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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

export async function cacheValidTokens(tokens: CheckInPassengerInfo[]): Promise<void> {
  const db = await openDatabase();
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

export async function getCachedValidTokens(): Promise<CheckInPassengerInfo[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("valid_tokens", "readonly");
    const store = tx.objectStore("valid_tokens");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingCheckIn(item: OfflineCheckInItem): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readwrite");
    const store = tx.objectStore("pending_checkins");
    const req = store.add(item);

    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCheckIns(): Promise<StoredPendingCheckIn[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readonly");
    const store = tx.objectStore("pending_checkins");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingCheckIns(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readwrite");
    const store = tx.objectStore("pending_checkins");
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCheckInsCount(): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_checkins", "readonly");
    const store = tx.objectStore("pending_checkins");
    const req = store.count();

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
