"use client";

/**
 * 設定画面
 *
 * - 目標カロリー・タンパク質など
 * - ファイルバックアップ（エクスポート／インポート）
 * - クラウド同期（Supabase）
 */

import BackupPanel from "@/components/BackupPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import { loadSettings, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function handleChange(field: keyof Settings, value: number) {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  }

  function handleSave() {
    if (!settings) return;
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-emerald-600">
          Protly
        </p>
        <h1 className="text-xl font-bold">⚙️ 設定</h1>
      </header>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-500">
            1日の目標
          </h2>

          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium">
              🔥 目標カロリー
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.targetCalories}
                onChange={(e) =>
                  handleChange("targetCalories", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <span className="shrink-0 text-sm text-slate-500">kcal</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              💪 目標タンパク質（筋トレ用）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.targetProtein}
                onChange={(e) =>
                  handleChange("targetProtein", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <span className="shrink-0 text-sm text-slate-500">g</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              目安: 体重(kg) × 1.6〜2.0 g（例: 60kg → 96〜120g）
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-500">
            PFCバランス（参考）
          </h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              脂質の目標比率
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.targetFatPercent}
                onChange={(e) =>
                  handleChange("targetFatPercent", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <span className="shrink-0 text-sm text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              炭水化物の目標比率
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.targetCarbsPercent}
                onChange={(e) =>
                  handleChange("targetCarbsPercent", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <span className="shrink-0 text-sm text-slate-500">%</span>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          {saved ? "✓ 保存しました" : "目標を保存"}
        </button>

        <FavoritesPanel />

        <BackupPanel />
      </div>
    </main>
  );
}
