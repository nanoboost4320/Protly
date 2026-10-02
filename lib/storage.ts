/**
 * ブラウザの localStorage にデータを保存・読み込みする
 */

import {
  createEmptyDayRecord,
  DEFAULT_SETTINGS,
  type DayRecord,
  type Settings,
} from "./types";

const SETTINGS_KEY = "meal-tracker-settings";
const RECORDS_KEY = "meal-tracker-records";
const LOCAL_UPDATED_KEY = "meal-tracker-local-updated-at";
const LAST_SYNCED_KEY = "meal-tracker-last-synced-at";

/** データ変更を他の処理（自動同期など）に知らせるイベント名 */
export const DATA_CHANGED_EVENT = "meal-tracker-data-changed";

/** クラウド復元中など、自動アップロードを一時停止するフラグ */
let suppressChangeNotify = false;

export function setSuppressChangeNotify(value: boolean): void {
  suppressChangeNotify = value;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyDataChanged(): void {
  if (!isBrowser() || suppressChangeNotify) return;
  localStorage.setItem(LOCAL_UPDATED_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

export function getLocalUpdatedAt(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(LOCAL_UPDATED_KEY);
}

export function getLastSyncedAt(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(LAST_SYNCED_KEY);
}

export function setLastSyncedAt(iso: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(LAST_SYNCED_KEY, iso);
}

export function loadSettings(): Settings {
  if (!isBrowser()) return DEFAULT_SETTINGS;

  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  notifyDataChanged();
}

export function loadAllRecords(): Record<string, DayRecord> {
  if (!isBrowser()) return {};

  const raw = localStorage.getItem(RECORDS_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAllRecords(records: Record<string, DayRecord>): void {
  if (!isBrowser()) return;
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  notifyDataChanged();
}

export function loadDayRecord(date: string): DayRecord {
  const all = loadAllRecords();
  return all[date] ?? createEmptyDayRecord(date);
}

export function saveDayRecord(record: DayRecord): void {
  const all = loadAllRecords();
  all[record.date] = record;
  saveAllRecords(all);
}
