"use client";

/**
 * 設定画面: よく使う食材の一覧・削除
 */

import {
  loadFavorites,
  removeFavorite,
  type SavedFood,
} from "@/lib/favorites";
import { DATA_CHANGED_EVENT } from "@/lib/storage";
import { useEffect, useState } from "react";

export default function FavoritesPanel() {
  const [favorites, setFavorites] = useState<SavedFood[]>([]);

  function refresh() {
    setFavorites(loadFavorites());
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  function handleRemove(id: string, name: string) {
    if (!confirm(`「${name}」をよく使う食材から削除しますか？`)) return;
    removeFavorite(id);
    refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-500">
        よく使う食材
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        食品追加画面の上部に表示されます。記録一覧の「登録」からも追加できます。
      </p>

      {favorites.length === 0 ? (
        <p className="text-sm text-slate-400">
          まだありません。食品を追加するときに「よく使う食材に登録」にチェックするか、一覧の「登録」を押してください。
        </p>
      ) : (
        <ul className="space-y-2">
          {favorites.map((food) => (
            <li
              key={food.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{food.name}</p>
                <p className="text-xs text-slate-400">
                  {food.amount}
                  {food.unit} · {food.calories} kcal · P{food.protein} F
                  {food.fat} C{food.carbs}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(food.id, food.name)}
                className="shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
