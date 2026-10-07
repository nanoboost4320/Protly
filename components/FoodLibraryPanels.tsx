"use client";

/**
 * よく使う／一度入力した食材の管理パネル（設定のサブ画面用）
 */

import {
  addFavorite,
  isFavoriteName,
  loadFavorites,
  loadMyFoods,
  normalizeName,
  removeFavorite,
  removeMyFood,
  sortByLastUsed,
  updateFavorite,
  updateMyFood,
  type SavedFood,
} from "@/lib/favorites";
import { DATA_CHANGED_EVENT } from "@/lib/storage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EditDraft = {
  name: string;
  amount: string;
  unit: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
};

function toDraft(food: SavedFood): EditDraft {
  return {
    name: food.name,
    amount: String(food.amount),
    unit: food.unit,
    calories: String(food.calories),
    protein: String(food.protein),
    fat: String(food.fat),
    carbs: String(food.carbs),
  };
}

function FoodEditRow({
  food,
  kind,
  onSaved,
  onDeleted,
}: {
  food: SavedFood;
  kind: "favorite" | "my";
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>(() => toDraft(food));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(toDraft(food));
  }, [food, editing]);

  function handleSave() {
    setError(null);
    const name = draft.name.trim();
    if (!name) {
      setError("名前を入力してください");
      return;
    }
    const patch = {
      name,
      amount: Number(draft.amount) || 0,
      unit: draft.unit,
      calories: Number(draft.calories) || 0,
      protein: Number(draft.protein) || 0,
      fat: Number(draft.fat) || 0,
      carbs: Number(draft.carbs) || 0,
    };
    try {
      if (kind === "favorite") {
        updateFavorite(food.id, patch);
      } else {
        updateMyFood(food.id, patch);
      }
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  function handleDelete() {
    const label =
      kind === "favorite"
        ? `「${food.name}」をよく使う食材から外しますか？\n（一度入力した食材リストには残ります）`
        : `「${food.name}」を食材リストから削除しますか？\n（よく使うからも消えます）`;
    if (!confirm(label)) return;
    if (kind === "favorite") {
      removeFavorite(food.id);
    } else {
      removeMyFood(food.id);
    }
    onDeleted();
  }

  function handleAddFavorite() {
    addFavorite(food);
    onSaved();
  }

  return (
    <li className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm shadow-sm">
      {!editing ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{food.name}</p>
            <p className="text-xs text-slate-400">
              {food.amount}
              {food.unit} · {food.calories} kcal · P{food.protein} F{food.fat} C
              {food.carbs}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {kind === "my" && !isFavoriteName(food.name) && (
              <button
                type="button"
                onClick={handleAddFavorite}
                className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
              >
                よく使うへ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDraft(toDraft(food));
                setError(null);
                setEditing(true);
              }}
              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              編集
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="食品名"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={draft.amount}
              onChange={(e) =>
                setDraft((d) => ({ ...d, amount: e.target.value }))
              }
              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="量"
            />
            <select
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="個">個</option>
              <option value="本">本</option>
              <option value="杯">杯</option>
              <option value="食">食</option>
              <option value="パック">パック</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["calories", "kcal"],
                ["protein", "P"],
                ["fat", "F"],
                ["carbs", "C"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-slate-500">
                {label}
                <input
                  type="number"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.value }))
                  }
                  step="any"
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                />
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** よく使う食材の管理一覧 */
export function FavoritesManagePanel() {
  const [favorites, setFavorites] = useState<SavedFood[]>([]);

  function refresh() {
    setFavorites(loadFavorites());
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  const sorted = useMemo(
    () => [...favorites].sort(sortByLastUsed),
    [favorites]
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        まだありません。食品追加時に「よく使う食材に登録」をチェックしてください。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((food) => (
        <FoodEditRow
          key={food.id}
          food={food}
          kind="favorite"
          onSaved={refresh}
          onDeleted={refresh}
        />
      ))}
    </ul>
  );
}

/** 一度入力した食材の管理一覧（よく使うと重複する名前は除く） */
export function MyFoodsManagePanel() {
  const [favorites, setFavorites] = useState<SavedFood[]>([]);
  const [myFoods, setMyFoods] = useState<SavedFood[]>([]);

  function refresh() {
    setFavorites(loadFavorites());
    setMyFoods(loadMyFoods());
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  const sorted = useMemo(() => {
    const favNames = new Set(favorites.map((f) => normalizeName(f.name)));
    return [...myFoods]
      .filter((f) => !favNames.has(normalizeName(f.name)))
      .sort(sortByLastUsed);
  }, [myFoods, favorites]);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        まだありません。食品を追加すると自動でここに残ります。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((food) => (
        <FoodEditRow
          key={food.id}
          food={food}
          kind="my"
          onSaved={refresh}
          onDeleted={refresh}
        />
      ))}
    </ul>
  );
}

/** 設定トップ用: 件数つき導線ボタン */
export function FoodLibraryLinks() {
  const [favCount, setFavCount] = useState(0);
  const [myCount, setMyCount] = useState(0);

  function refresh() {
    const favs = loadFavorites();
    const mine = loadMyFoods();
    const favNames = new Set(favs.map((f) => normalizeName(f.name)));
    setFavCount(favs.length);
    setMyCount(mine.filter((f) => !favNames.has(normalizeName(f.name))).length);
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-500">登録した食材</h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        一覧は別画面で編集できます。追加画面では「よく使う」がチップに、「一度入力」は名前候補に出ます。
      </p>
      <div className="space-y-2">
        <Link
          href="/settings/favorites"
          className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm transition-colors hover:border-emerald-200 hover:bg-emerald-100"
        >
          <span className="font-medium text-emerald-900">よく使う食材</span>
          <span className="text-xs text-emerald-700">{favCount}件 →</span>
        </Link>
        <Link
          href="/settings/my-foods"
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors hover:border-slate-300 hover:bg-slate-100"
        >
          <span className="font-medium text-slate-800">一度入力した食材</span>
          <span className="text-xs text-slate-500">{myCount}件 →</span>
        </Link>
      </div>
    </section>
  );
}
