"use client";

/**
 * バックアップ（エクスポート／インポート）＋クラウド同期 UI
 */

import {
  downloadBackup,
  importBackupFile,
} from "@/lib/exportImport";
import {
  downloadFromCloud,
  getCloudUpdatedAt,
  getCurrentUser,
  isCloudConfigured,
  signIn,
  signOut,
  signUp,
  syncOnStartup,
  uploadToCloud,
} from "@/lib/cloudSync";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cloudReady = isCloudConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudReady) return;
    getCurrentUser().then((u) => {
      setUser(u);
      if (u) {
        getCloudUpdatedAt().then(setCloudUpdatedAt);
      }
    });
  }, [cloudReady]);

  function showOk(text: string) {
    setError(null);
    setMessage(text);
  }

  function showErr(err: unknown) {
    setMessage(null);
    setError(err instanceof Error ? err.message : String(err));
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    if (
      !confirm(
        "インポートすると、今のブラウザ内データがバックアップの内容で上書きされます。よろしいですか？"
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const backup = await importBackupFile(file);
      const count = Object.keys(backup.records).length;
      showOk(`復元しました（記録 ${count} 日分）。ページを再読み込みします。`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      showErr(e);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAuth() {
    setBusy(true);
    try {
      if (authMode === "signup") {
        await signUp(email, password);
        showOk(
          "登録しました。確認メールが届く場合があります。届いたらリンクを開いてからログインしてください。"
        );
      } else {
        await signIn(email, password);
        const u = await getCurrentUser();
        setUser(u);
        const result = await syncOnStartup();
        setCloudUpdatedAt(await getCloudUpdatedAt());
        if (result === "downloaded") {
          showOk("ログインしました。クラウドからデータを取り込みます…");
          setTimeout(() => window.location.reload(), 600);
        } else {
          showOk("ログインしました。これ以降は記録のたびに自動同期されます。");
        }
      }
    } catch (e) {
      showErr(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    setBusy(true);
    try {
      await uploadToCloud();
      setCloudUpdatedAt(await getCloudUpdatedAt());
      showOk("クラウドへ同期しました");
    } catch (e) {
      showErr(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (
      !confirm(
        "クラウドのデータで、今のブラウザ内データを上書きします。よろしいですか？"
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const backup = await downloadFromCloud();
      const count = Object.keys(backup.records).length;
      showOk(`クラウドから復元しました（${count} 日分）。再読み込みします。`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      showErr(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setCloudUpdatedAt(null);
    showOk("ログアウトしました");
  }

  return (
    <div className="space-y-4">
      {/* ファイルバックアップ */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-500">
          💾 ファイルバックアップ
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          JSONファイルとして保存・復元できます。キャッシュ削除前や機種変更前におすすめです。
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              downloadBackup();
              showOk("バックアップファイルをダウンロードしました");
            }}
            className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            エクスポート（保存）
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            インポート（復元）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </div>
      </section>

      {/* クラウド */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-500">
          ☁️ クラウド自動同期
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          ログイン中は、食事の記録や設定変更が約1.5秒後に自動でクラウドへ保存されます。
        </p>

        {!cloudReady ? (
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <p>
              クラウド機能を使うには、Supabase の無料アカウント設定が必要です。
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-500">
              <li>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 underline"
                >
                  supabase.com
                </a>{" "}
                でプロジェクトを作成
              </li>
              <li>
                SQL Editor で{" "}
                <code className="rounded bg-slate-100 px-1">
                  supabase/schema.sql
                </code>{" "}
                を実行
              </li>
              <li>
                プロジェクトの URL と anon key を{" "}
                <code className="rounded bg-slate-100 px-1">.env.local</code>{" "}
                に記入
              </li>
              <li>
                <code className="rounded bg-slate-100 px-1">npm run dev</code>{" "}
                を再起動
              </li>
            </ol>
            <p className="text-xs text-slate-400">
              詳しくはプロジェクト内の{" "}
              <code className="rounded bg-slate-100 px-1">docs/CLOUD_SETUP.md</code>{" "}
              を参照してください。設定前でもエクスポートは使えます。
            </p>
          </div>
        ) : !user ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-400">
              メールアドレスでアカウントを作成／ログインして同期します。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-lg py-1.5 text-sm ${
                  authMode === "login"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`flex-1 rounded-lg py-1.5 text-sm ${
                  authMode === "signup"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                新規登録
              </button>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード（6文字以上）"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || !email || password.length < 6}
              onClick={handleAuth}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {authMode === "login" ? "ログイン" : "登録する"}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              自動同期 ON
              <span className="mt-0.5 block text-xs text-emerald-700/80">
                {user.email}
              </span>
            </div>
            {cloudUpdatedAt && (
              <p className="text-xs text-slate-400">
                クラウド最終更新:{" "}
                {new Date(cloudUpdatedAt).toLocaleString("ja-JP")}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={handleUpload}
                className="flex-1 rounded-xl border border-emerald-200 bg-white py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                今すぐ同期
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDownload}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                クラウドから強制復元
              </button>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-sm text-slate-400 hover:text-slate-600"
            >
              ログアウト（自動同期オフ）
            </button>
          </div>
        )}
      </section>

      {(message || error) && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            error
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? message}
        </p>
      )}
    </div>
  );
}
