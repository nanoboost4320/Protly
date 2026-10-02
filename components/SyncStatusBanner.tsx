"use client";

/**
 * 画面上部に出す同期ステータス（ログイン中のみ）
 */

import { SYNC_STATUS_EVENT, type SyncStatus } from "@/lib/cloudSync";
import { useEffect, useState } from "react";

export default function SyncStatusBanner() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [detail, setDetail] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ status: SyncStatus; detail?: string }>;
      setStatus(ce.detail.status);
      setDetail(ce.detail.detail ?? "");

      if (
        ce.detail.status === "syncing" ||
        ce.detail.status === "synced" ||
        ce.detail.status === "error"
      ) {
        setVisible(true);
      }

      if (hideTimer) clearTimeout(hideTimer);
      if (ce.detail.status === "synced") {
        hideTimer = setTimeout(() => setVisible(false), 2500);
      }
    };

    window.addEventListener(SYNC_STATUS_EVENT, handler);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, handler);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const style =
    status === "error"
      ? "bg-red-50 text-red-600 border-red-100"
      : status === "syncing"
        ? "bg-sky-50 text-sky-700 border-sky-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";

  const label =
    status === "error"
      ? `同期エラー: ${detail}`
      : status === "syncing"
        ? detail || "同期中…"
        : detail || "同期しました";

  return (
    <div
      className={`fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium shadow-sm ${style}`}
    >
      {label}
    </div>
  );
}
