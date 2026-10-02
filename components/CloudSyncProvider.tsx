"use client";

/**
 * ログイン中の自動クラウド同期を裏で動かすコンポーネント
 *
 * - 起動時に新しいデータを合わせる
 * - 食事記録・設定変更のあと、自動でアップロード
 * - クラウドから取り込んだときはページ全体をリロードせず、イベントで通知する
 */

import {
  scheduleAutoUpload,
  syncOnStartup,
  isCloudConfigured,
} from "@/lib/cloudSync";
import { DATA_CHANGED_EVENT } from "@/lib/storage";
import { useEffect, useRef } from "react";

/** クラウドからデータを取り込んだときに発火（画面の再読み込み用） */
export const CLOUD_DATA_PULLED_EVENT = "meal-tracker-cloud-pulled";

export default function CloudSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isCloudConfigured()) return;

    async function runSync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const result = await syncOnStartup();
        if (result === "downloaded") {
          window.dispatchEvent(new Event(CLOUD_DATA_PULLED_EVENT));
        }
      } finally {
        syncingRef.current = false;
      }
    }

    void runSync();

    const onChange = () => scheduleAutoUpload();
    window.addEventListener(DATA_CHANGED_EVENT, onChange);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <>{children}</>;
}
