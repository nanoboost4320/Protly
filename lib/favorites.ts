/**
 * よく使う食材・一度入力した食材（自分の食品庫）
 *
 * - myFoods: 追加のたびに残る（上限なし）。候補検索用。一覧チップには出さない
 * - favorites: 「よく使う」明示登録。追加画面上部のチップに表示
 */

import { generateId } from "./calculations";
import { DATA_CHANGED_EVENT } from "./storage";
import type { FoodItem } from "./types";

const FAVORITES_KEY = "meal-tracker-favorites";
/** 互換のためキー名は recent のまま（中身は無期限の自分の食材） */
const MY_FOODS_KEY = "meal-tracker-recent-foods";
const MAX_MY_SEARCH = 12;

/** 登録済み食材 */
export interface SavedFood {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 最後に使った／入力した時刻（ISO）。並び替え用 */
  lastUsedAt?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyChanged(): void {
  if (!isBrowser()) return;
  localStorage.setItem(
    "meal-tracker-local-updated-at",
    new Date().toISOString()
  );
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function lastUsedTime(food: SavedFood): number {
  if (!food.lastUsedAt) return 0;
  const t = Date.parse(food.lastUsedAt);
  return Number.isNaN(t) ? 0 : t;
}

/** 直近利用が上 */
export function sortByLastUsed(a: SavedFood, b: SavedFood): number {
  return lastUsedTime(b) - lastUsedTime(a);
}

function loadList(key: string): SavedFood[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFood[]) : [];
  } catch {
    return [];
  }
}

function saveList(
  key: string,
  items: SavedFood[],
  options?: { silent?: boolean }
): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(items));
  if (!options?.silent) notifyChanged();
}

export function loadFavorites(): SavedFood[] {
  return loadList(FAVORITES_KEY);
}

export function saveFavorites(
  favorites: SavedFood[],
  options?: { silent?: boolean }
): void {
  saveList(FAVORITES_KEY, favorites, options);
}

/** 一度入力した食材（上限なし） */
export function loadMyFoods(): SavedFood[] {
  return loadList(MY_FOODS_KEY);
}

export function saveMyFoods(
  foods: SavedFood[],
  options?: { silent?: boolean }
): void {
  saveList(MY_FOODS_KEY, foods, options);
}

/** @deprecated 互換エイリアス → loadMyFoods */
export function loadRecentFoods(): SavedFood[] {
  return loadMyFoods();
}

/** @deprecated 互換エイリアス → saveMyFoods */
export function saveRecentFoods(
  recent: SavedFood[],
  options?: { silent?: boolean }
): void {
  saveMyFoods(recent, options);
}

function toSavedFood(
  food: FoodItem | SavedFood,
  lastUsedAt?: string
): SavedFood {
  const at =
    lastUsedAt ??
    ("lastUsedAt" in food && food.lastUsedAt
      ? food.lastUsedAt
      : new Date().toISOString());
  return {
    id: "id" in food && food.id ? food.id : generateId(),
    name: food.name.trim(),
    amount: food.amount,
    unit: food.unit,
    calories: food.calories,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    lastUsedAt: at,
  };
}

function upsertByName(
  list: SavedFood[],
  nextItem: SavedFood,
  options?: { keepId?: boolean }
): SavedFood[] {
  const key = normalizeName(nextItem.name);
  const existing = list.find((f) => normalizeName(f.name) === key);
  const id =
    options?.keepId && existing ? existing.id : generateId();
  const rest = list.filter((f) => normalizeName(f.name) !== key);
  return [{ ...nextItem, id }, ...rest];
}

/** お気に入りに追加（同名があれば更新）。自分の食材庫にも残す */
export function addFavorite(food: FoodItem | SavedFood): SavedFood[] {
  const now = new Date().toISOString();
  const nextItem = toSavedFood(food, now);
  const next = upsertByName(loadFavorites(), nextItem);
  saveFavorites(next);
  // よく使う登録時も自分の食材庫へ（上限なし）
  saveMyFoods(upsertByName(loadMyFoods(), nextItem), { silent: true });
  return next;
}

export function removeFavorite(id: string): SavedFood[] {
  const next = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

/** よく使う食材の内容を更新（名前変更時は同名衝突に注意） */
export function updateFavorite(
  id: string,
  patch: Partial<Omit<SavedFood, "id">>
): SavedFood[] {
  const current = loadFavorites();
  const target = current.find((f) => f.id === id);
  if (!target) return current;

  const updated: SavedFood = {
    ...target,
    ...patch,
    name: (patch.name ?? target.name).trim(),
  };

  if (normalizeName(updated.name) !== normalizeName(target.name)) {
    const clash = current.some(
      (f) =>
        f.id !== id && normalizeName(f.name) === normalizeName(updated.name)
    );
    if (clash) {
      throw new Error("同じ名前のよく使う食材がすでにあります");
    }
  }

  const next = current.map((f) => (f.id === id ? updated : f));
  saveFavorites(next);

  // 自分の食材庫側も同名・旧名を同期更新
  const my = loadMyFoods();
  const myKeyOld = normalizeName(target.name);
  const myKeyNew = normalizeName(updated.name);
  const nextMy = my.map((f) => {
    if (normalizeName(f.name) === myKeyOld || normalizeName(f.name) === myKeyNew) {
      return {
        ...f,
        name: updated.name,
        amount: updated.amount,
        unit: updated.unit,
        calories: updated.calories,
        protein: updated.protein,
        fat: updated.fat,
        carbs: updated.carbs,
      };
    }
    return f;
  });
  saveMyFoods(nextMy, { silent: true });

  return next;
}

export function isFavoriteName(name: string): boolean {
  const key = normalizeName(name);
  return loadFavorites().some((f) => normalizeName(f.name) === key);
}

/**
 * よく使う＋一度入力した食材を名前で絞り込み
 * 同名はよく使うの内容を優先。並びは直近利用順。
 */
export function searchMyFoods(query: string): SavedFood[] {
  const q = normalizeName(query);
  if (!q) return [];

  const byName = new Map<string, SavedFood>();

  for (const food of loadMyFoods()) {
    if (!normalizeName(food.name).includes(q)) continue;
    byName.set(normalizeName(food.name), food);
  }
  for (const food of loadFavorites()) {
    if (!normalizeName(food.name).includes(q)) continue;
    const key = normalizeName(food.name);
    const prev = byName.get(key);
    // favorites の栄養を優先しつつ、より新しい lastUsedAt を残す
    byName.set(key, {
      ...food,
      lastUsedAt:
        lastUsedTime(food) >= lastUsedTime(prev ?? food)
          ? food.lastUsedAt
          : prev?.lastUsedAt ?? food.lastUsedAt,
    });
  }

  const favoriteKeys = new Set(
    loadFavorites().map((f) => normalizeName(f.name))
  );

  return [...byName.values()]
    .sort((a, b) => {
      const byTime = sortByLastUsed(a, b);
      if (byTime !== 0) return byTime;
      const aFav = favoriteKeys.has(normalizeName(a.name)) ? 0 : 1;
      const bFav = favoriteKeys.has(normalizeName(b.name)) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name, "ja");
    })
    .slice(0, MAX_MY_SEARCH);
}

/**
 * 食品を追加したときに自分の食材庫へ保存（上限なし・直近を先頭）
 */
export function rememberMyFood(
  food: FoodItem | SavedFood,
  options?: { silent?: boolean }
): SavedFood[] {
  const nextItem = toSavedFood(food, new Date().toISOString());
  const next = upsertByName(loadMyFoods(), nextItem);
  saveMyFoods(next, options);

  // 同名がよく使うにあれば lastUsedAt と内容も更新
  const favs = loadFavorites();
  const key = normalizeName(nextItem.name);
  if (favs.some((f) => normalizeName(f.name) === key)) {
    saveFavorites(upsertByName(favs, nextItem, { keepId: true }), {
      silent: true,
    });
  }

  return next;
}

/** @deprecated 互換 → rememberMyFood */
export function rememberRecent(
  food: FoodItem | SavedFood,
  options?: { silent?: boolean }
): SavedFood[] {
  return rememberMyFood(food, options);
}

export function updateMyFood(
  id: string,
  patch: Partial<Omit<SavedFood, "id">>
): SavedFood[] {
  const current = loadMyFoods();
  const target = current.find((f) => f.id === id);
  if (!target) return current;

  const updated: SavedFood = {
    ...target,
    ...patch,
    name: (patch.name ?? target.name).trim(),
  };

  if (normalizeName(updated.name) !== normalizeName(target.name)) {
    const clash = current.some(
      (f) =>
        f.id !== id && normalizeName(f.name) === normalizeName(updated.name)
    );
    if (clash) {
      throw new Error("同じ名前の食材がすでにあります");
    }
  }

  const next = current.map((f) => (f.id === id ? updated : f));
  saveMyFoods(next);

  // よく使う側も同名なら同期
  const favs = loadFavorites();
  const oldKey = normalizeName(target.name);
  const nextFavs = favs.map((f) => {
    if (normalizeName(f.name) !== oldKey) return f;
    return {
      ...f,
      name: updated.name,
      amount: updated.amount,
      unit: updated.unit,
      calories: updated.calories,
      protein: updated.protein,
      fat: updated.fat,
      carbs: updated.carbs,
    };
  });
  if (JSON.stringify(favs) !== JSON.stringify(nextFavs)) {
    saveFavorites(nextFavs, { silent: true });
  }

  return next;
}

export function removeMyFood(id: string): SavedFood[] {
  const current = loadMyFoods();
  const target = current.find((f) => f.id === id);
  const next = current.filter((f) => f.id !== id);
  saveMyFoods(next);

  if (target) {
    const key = normalizeName(target.name);
    const favs = loadFavorites().filter(
      (f) => normalizeName(f.name) !== key
    );
    if (favs.length !== loadFavorites().length) {
      saveFavorites(favs, { silent: true });
    }
  }

  return next;
}

export function savedFoodToFoodItem(saved: SavedFood): FoodItem {
  return {
    id: generateId(),
    name: saved.name,
    amount: saved.amount,
    unit: saved.unit,
    calories: saved.calories,
    protein: saved.protein,
    fat: saved.fat,
    carbs: saved.carbs,
  };
}
