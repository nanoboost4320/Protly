"use client";

/**
 * 一度入力した食材の編集画面
 */

import BrandWordmark from "@/components/BrandWordmark";
import { MyFoodsManagePanel } from "@/components/FoodLibraryPanels";
import Link from "next/link";

export default function MyFoodsSettingsPage() {
  return (
    <main className="px-4 py-6">
      <header className="mb-6">
        <p className="mb-1">
          <BrandWordmark size="sm" />
        </p>
        <Link
          href="/settings"
          className="mb-2 inline-block text-xs font-medium text-emerald-600 hover:underline"
        >
          ← 設定に戻る
        </Link>
        <h1 className="text-xl font-bold">一度入力した食材</h1>
        <p className="mt-1 text-xs text-slate-400">
          追加画面の名前候補に出ます（チップには出ません）。直近に使ったものが上です。
        </p>
      </header>

      <MyFoodsManagePanel />
    </main>
  );
}
