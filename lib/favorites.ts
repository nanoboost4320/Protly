/**
 * よく使う食材・最近使った食材
 */

import { generateId } from "./calculations";
import { DATA_CHANGED_EVENT } from "./storage";
import type { FoodItem } from "./types";

const FAVORITES_KEY = "meal-tracker-favorites";
const RECENT_KEY = "meal-tracker-recent-foods";
/** 「一度入力したもの」がすぐ消えないよう多めに保持 */
const MAX_RECENT = 50;
const MAX_MY_SEARCH = 12;

/** 登録済み食材（お気に入り） */
export interface SavedFood {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyChanged(): void {
  if (!isBrowser()) return;
  // クラウド自動同期の対象にする
  localStorage.setItem(
    "meal-tracker-local-updated-at",
    new Date().toISOString()
  );
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

export function loadFavorites(): SavedFood[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(
  favorites: SavedFood[],
  options?: { silent?: boolean }
): void {
  if (!isBrowser()) return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  if (!options?.silent) notifyChanged();
}

export function loadRecentFoods(): SavedFood[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentFoods(
  recent: SavedFood[],
  options?: { silent?: boolean }
): void {
  if (!isBrowser()) return;
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  if (!options?.silent) notifyChanged();
}

function toSavedFood(food: FoodItem | SavedFood): SavedFood {
  return {
    id: "id" in food && food.id ? food.id : generateId(),
    name: food.name.trim(),
    amount: food.amount,
    unit: food.unit,
    calories: food.calories,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
  };
}

/** お気に入りに追加（同名があれば更新） */
export function addFavorite(food: FoodItem | SavedFood): SavedFood[] {
  const nextItem = toSavedFood(food);
  const current = loadFavorites().filter(
    (f) => normalizeName(f.name) !== normalizeName(nextItem.name)
  );
  const next = [{ ...nextItem, id: generateId() }, ...current];
  saveFavorites(next);
  return next;
}

export function removeFavorite(id: string): SavedFood[] {
  const next = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

export function isFavoriteName(name: string): boolean {
  const key = normalizeName(name);
  return loadFavorites().some((f) => normalizeName(f.name) === key);
}

/**
 * よく使う＋最近使った食材を名前で絞り込み（同名はよく使う優先）
 * 入力候補用。query が空なら空配列。
 */
export function searchMyFoods(query: string): SavedFood[] {
  const q = normalizeName(query);
  if (!q) return [];

  const byName = new Map<string, SavedFood>();

  // recent を先に入れて、あとから favorites で上書き（favorites 優先）
  for (const food of loadRecentFoods()) {
    if (!normalizeName(food.name).includes(q)) continue;
    byName.set(normalizeName(food.name), food);
  }
  for (const food of loadFavorites()) {
    if (!normalizeName(food.name).includes(q)) continue;
    byName.set(normalizeName(food.name), food);
  }

  const favoriteKeys = new Set(
    loadFavorites().map((f) => normalizeName(f.name))
  );

  return [...byName.values()]
    .sort((a, b) => {
      const aFav = favoriteKeys.has(normalizeName(a.name)) ? 0 : 1;
      const bFav = favoriteKeys.has(normalizeName(b.name)) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name, "ja");
    })
    .slice(0, MAX_MY_SEARCH);
}

/** 追加・保存した食品を「最近」に残す */
export function rememberRecent(
  food: FoodItem | SavedFood,
  options?: { silent?: boolean }
): SavedFood[] {
  const nextItem = toSavedFood(food);
  const current = loadRecentFoods().filter(
    (f) => normalizeName(f.name) !== normalizeName(nextItem.name)
  );
  const next = [{ ...nextItem, id: generateId() }, ...current].slice(
    0,
    MAX_RECENT
  );
  saveRecentFoods(next, options);
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
