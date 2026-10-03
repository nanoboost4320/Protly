/**
 * クラウド同期（Supabase）
 *
 * - ログイン中は、記録・設定の変更後に自動でクラウドへ保存
 * - 起動時／ログイン時は、中身を見て安全に同期（空データで上書きしない）
 */

import { createBackup, parseBackup, restoreBackup, type BackupData } from "./exportImport";
import {
  getLastSyncedAt,
  getLocalUpdatedAt,
  loadAllRecords,
  setLastSyncedAt,
  setSuppressChangeNotify,
} from "./storage";
import { getSupabase, isCloudConfigured } from "./supabase";
import type { DayRecord } from "./types";

export { isCloudConfigured };

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "logged-out"
  | "not-configured";

export const SYNC_STATUS_EVENT = "meal-tracker-sync-status";

let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

function emitSyncStatus(status: SyncStatus, detail?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SYNC_STATUS_EVENT, { detail: { status, detail } })
  );
}

/** 記録されている食品の件数 */
export function countFoodItems(
  records: Record<string, DayRecord> = loadAllRecords()
): number {
  let total = 0;
  for (const record of Object.values(records)) {
    total +=
      record.meals.breakfast.length +
      record.meals.lunch.length +
      record.meals.dinner.length;
  }
  return total;
}

export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signUp(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("クラウドが設定されていません");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("クラウドが設定されていません");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
  emitSyncStatus("logged-out");
}

async function requireUser() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("クラウドが設定されていません");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインしてください");
  }

  return { supabase, user };
}

/** ローカルのデータをクラウドへ保存（上書き） */
export async function uploadToCloud(): Promise<void> {
  const { supabase, user } = await requireUser();

  const backup = createBackup();
  const updatedAt = new Date().toISOString();

  const { error } = await supabase.from("user_backups").upsert(
    {
      user_id: user.id,
      data: backup,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;

  // 本当に書けたか確認する
  const { data: saved, error: verifyError } = await supabase
    .from("user_backups")
    .select("updated_at, data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (verifyError) throw verifyError;
  if (!saved) {
    throw new Error(
      "クラウドへの保存確認に失敗しました。Supabase の user_backups テーブルを確認してください。"
    );
  }

  setLastSyncedAt(saved.updated_at ?? updatedAt);
  if (typeof window !== "undefined") {
    localStorage.setItem(
      "meal-tracker-local-updated-at",
      saved.updated_at ?? updatedAt
    );
  }
}

/** クラウドのデータをローカルへ復元（上書き） */
export async function downloadFromCloud(): Promise<BackupData> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("user_backups")
    .select("data, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("クラウドに保存データがありません");
  }

  const backup = parseBackup(data.data);

  setSuppressChangeNotify(true);
  try {
    restoreBackup(backup);
    if (data.updated_at) {
      setLastSyncedAt(data.updated_at);
      localStorage.setItem("meal-tracker-local-updated-at", data.updated_at);
    }
  } finally {
    setSuppressChangeNotify(false);
  }

  return backup;
}

export async function getCloudUpdatedAt(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_backups")
    .select("updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.updated_at ?? null;
}

/** クラウド上の食品件数（ローカルは変更しない） */
export async function getCloudFoodCount(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from("user_backups")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.data) return 0;

  try {
    const backup = parseBackup(data.data);
    return countFoodItems(backup.records);
  } catch {
    return 0;
  }
}

/**
 * 記録変更後に呼ぶ。少し待ってからクラウドへ自動アップロード。
 */
export function scheduleAutoUpload(): void {
  if (!isCloudConfigured()) return;
  if (typeof window === "undefined") return;

  if (uploadTimer) clearTimeout(uploadTimer);

  emitSyncStatus("syncing", "変更をクラウドに送る準備中…");

  uploadTimer = setTimeout(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        emitSyncStatus("logged-out");
        return;
      }
      emitSyncStatus("syncing", "クラウドに保存中…");
      await uploadToCloud();
      const count = countFoodItems();
      emitSyncStatus("synced", `自動同期しました（食品 ${count} 件）`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emitSyncStatus("error", msg);
    }
  }, 1500);
}

/**
 * 起動時・ログイン直後の同期
 * - ローカルが空でクラウドにデータがある → 必ずダウンロード
 * - クラウドが空でローカルにデータがある → アップロード
 * - 両方ある → 新しい方を優先（空で上書きしない）
 */
export async function syncOnStartup(): Promise<
  "downloaded" | "uploaded" | "none" | "skipped"
> {
  if (!isCloudConfigured()) {
    emitSyncStatus("not-configured");
    return "skipped";
  }

  if (syncing) return "skipped";
  syncing = true;

  try {
    const user = await getCurrentUser();
    if (!user) {
      emitSyncStatus("logged-out");
      return "skipped";
    }

    emitSyncStatus("syncing", "同期中…");

    const { supabase } = await requireUser();
    const localCount = countFoodItems();
    const localUpdatedAt = getLocalUpdatedAt();
    const lastSyncedAt = getLastSyncedAt();

    const { data: cloudRow, error: cloudError } = await supabase
      .from("user_backups")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cloudError) throw cloudError;

    let cloudCount = 0;
    let cloudUpdatedAt: string | null = null;

    if (cloudRow?.data) {
      cloudUpdatedAt = cloudRow.updated_at ?? null;
      try {
        const cloudBackup = parseBackup(cloudRow.data);
        cloudCount = countFoodItems(cloudBackup.records);
      } catch {
        cloudCount = 0;
      }
    }

    // クラウドにデータなし → ローカルにあれば上げる
    if (!cloudRow) {
      if (localCount === 0) {
        emitSyncStatus("synced", "同期する記録がまだありません");
        return "none";
      }
      await uploadToCloud();
      emitSyncStatus(
        "synced",
        `クラウドへ初回保存しました（食品 ${localCount} 件）`
      );
      return "uploaded";
    }

    // ローカル空＆クラウドに記録あり → 必ず取り込む
    if (localCount === 0 && cloudCount > 0) {
      await downloadFromCloud();
      emitSyncStatus(
        "synced",
        `クラウドから取り込みました（食品 ${cloudCount} 件）`
      );
      return "downloaded";
    }

    // クラウド空＆ローカルに記録あり → 上げる
    if (cloudCount === 0 && localCount > 0) {
      await uploadToCloud();
      emitSyncStatus("synced", `クラウドを更新しました（食品 ${localCount} 件）`);
      return "uploaded";
    }

    // 両方空
    if (localCount === 0 && cloudCount === 0) {
      emitSyncStatus("synced", "同期する記録がまだありません");
      return "none";
    }

    // 両方にデータがある → 更新時刻で判断
    const cloudTime = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : 0;
    const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
    const syncedTime = lastSyncedAt ? Date.parse(lastSyncedAt) : 0;

    if (cloudTime > localTime && cloudTime > syncedTime) {
      await downloadFromCloud();
      emitSyncStatus(
        "synced",
        `クラウドから取り込みました（食品 ${cloudCount} 件）`
      );
      return "downloaded";
    }

    if (localTime > cloudTime) {
      await uploadToCloud();
      emitSyncStatus("synced", `クラウドを更新しました（食品 ${localCount} 件）`);
      return "uploaded";
    }

    emitSyncStatus("synced", `同期済み（食品 ${localCount} 件）`);
    return "none";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emitSyncStatus("error", msg);
    return "skipped";
  } finally {
    syncing = false;
  }
}
