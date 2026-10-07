/**
 * バックアップのエクスポート / インポート
 *
 * エクスポート: JSONファイルをダウンロード（バックアップ）
 * インポート: JSONファイルから復元
 */

import { loadAllRecords, loadSettings, saveAllRecords, saveSettings } from "./storage";
import {
  loadFavorites,
  loadRecentFoods,
  saveFavorites,
  saveRecentFoods,
  type SavedFood,
} from "./favorites";
import {
  loadJoyLunchMonths,
  saveJoyLunchMonths,
  type JoyLunchMonth,
} from "./joyLunch";
import { DEFAULT_SETTINGS, type DayRecord, type Settings } from "./types";

export const BACKUP_VERSION = 3;

const APP_IDS = ["protly", "meal-tracker"] as const;
export type AppId = (typeof APP_IDS)[number];

export interface BackupData {
  version: number;
  exportedAt: string;
  app: AppId;
  settings: Settings;
  records: Record<string, DayRecord>;
  favorites?: SavedFood[];
  recentFoods?: SavedFood[];
  joyLunch?: JoyLunchMonth[];
}

/** 現在のデータをバックアップオブジェクトにする */
export function createBackup(): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "protly",
    settings: loadSettings(),
    records: loadAllRecords(),
    favorites: loadFavorites(),
    recentFoods: loadRecentFoods(),
    joyLunch: loadJoyLunchMonths(),
  };
}

/** JSONファイルとしてダウンロードする */
export function downloadBackup(): void {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `protly-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** バックアップデータかどうか検証する */
export function parseBackup(raw: unknown): BackupData {
  if (!raw || typeof raw !== "object") {
    throw new Error("ファイルの形式が正しくありません");
  }

  const data = raw as Partial<BackupData>;

  if (data.app && !APP_IDS.includes(data.app as AppId)) {
    throw new Error("このアプリのバックアップファイルではありません");
  }

  if (!data.settings || typeof data.settings !== "object") {
    throw new Error("設定データが見つかりません");
  }

  if (!data.records || typeof data.records !== "object") {
    throw new Error("記録データが見つかりません");
  }

  return {
    version: data.version ?? 1,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    app: "protly",
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    records: data.records as Record<string, DayRecord>,
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    recentFoods: Array.isArray(data.recentFoods) ? data.recentFoods : [],
    joyLunch: Array.isArray(data.joyLunch) ? data.joyLunch : [],
  };
}

/** バックアップで上書き復元する */
export function restoreBackup(backup: BackupData): void {
  saveSettings(backup.settings);
  saveAllRecords(backup.records);
  saveFavorites(backup.favorites ?? [], { silent: true });
  saveRecentFoods(backup.recentFoods ?? [], { silent: true });
  saveJoyLunchMonths(backup.joyLunch ?? [], { silent: true });
}

/** ファイルから読み込んで復元する */
export async function importBackupFile(file: File): Promise<BackupData> {
  const text = await file.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("JSONの読み込みに失敗しました");
  }
  const backup = parseBackup(json);
  restoreBackup(backup);
  return backup;
}
