/**
 * クラウド同期（Supabase）
 *
 * - ログイン中は、記録・設定の変更後に自動でクラウドへ保存（約1.5秒後にまとめて送信）
 * - アプリ起動時／ログイン時は、新しい方のデータを優先して同期
 */

import { createBackup, parseBackup, restoreBackup, type BackupData } from "./exportImport";
import {
  getLastSyncedAt,
  getLocalUpdatedAt,
  setLastSyncedAt,
  setSuppressChangeNotify,
} from "./storage";
import { getSupabase, isCloudConfigured } from "./supabase";

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

/** ローカルのデータをクラウドへ保存（上書き） */
export async function uploadToCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("クラウドが設定されていません");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインしてください");
  }

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

  setLastSyncedAt(updatedAt);
  // ローカル更新時刻も揃えておく（次回起動時の比較用）
  if (typeof window !== "undefined") {
    localStorage.setItem("meal-tracker-local-updated-at", updatedAt);
  }
}

/** クラウドのデータをローカルへ復元（上書き） */
export async function downloadFromCloud(): Promise<BackupData> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("クラウドが設定されていません");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインしてください");
  }

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

  // 復元中は自動アップロードを止める（ループ防止）
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

/**
 * 記録変更後に呼ぶ。少し待ってからクラウドへ自動アップロード。
 * （連続入力でもリクエストが飛びすぎないようにする）
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
      emitSyncStatus("synced", "自動同期しました");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emitSyncStatus("error", msg);
    }
  }, 1500);
}

/**
 * 起動時・ログイン直後の同期
 * - クラウドの方が新しければダウンロード
 * - ローカルの方が新しければアップロード
 * - クラウドにまだ無ければアップロード
 */
export async function syncOnStartup(): Promise<"downloaded" | "uploaded" | "none" | "skipped"> {
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

    const cloudUpdatedAt = await getCloudUpdatedAt();
    const localUpdatedAt = getLocalUpdatedAt();
    const lastSyncedAt = getLastSyncedAt();

    // クラウドにデータがない → ローカルを上げる
    if (!cloudUpdatedAt) {
      await uploadToCloud();
      emitSyncStatus("synced", "クラウドへ初回保存しました");
      return "uploaded";
    }

    const cloudTime = Date.parse(cloudUpdatedAt);
    const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
    const syncedTime = lastSyncedAt ? Date.parse(lastSyncedAt) : 0;

    // クラウドがローカル／最終同期より新しい → 下り
    if (cloudTime > localTime && cloudTime > syncedTime) {
      await downloadFromCloud();
      emitSyncStatus("synced", "クラウドから取り込みました");
      return "downloaded";
    }

    // ローカルがクラウドより新しい → 上り
    if (localTime > cloudTime) {
      await uploadToCloud();
      emitSyncStatus("synced", "クラウドを更新しました");
      return "uploaded";
    }

    emitSyncStatus("synced", "同期済み");
    return "none";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emitSyncStatus("error", msg);
    return "skipped";
  } finally {
    syncing = false;
  }
}
