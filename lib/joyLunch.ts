/**
 * ジョイランチ月間メニューの保存・読み込み
 */

import { fillMissingNutrition, generateId } from "./calculations";
import { DATA_CHANGED_EVENT } from "./storage";
import type { FoodItem } from "./types";

const STORAGE_KEY = "meal-tracker-joy-lunch";

export interface JoyLunchDay {
  date: string; // YYYY-MM-DD
  name: string;
  calories: number;
  protein: number;
  fat: number;
  /** 通常は未設定。追加時に自動計算 */
  carbs?: number;
}

export interface JoyLunchMonth {
  year: number;
  month: number; // 1-12
  importedAt: string;
  sourceFileName?: string;
  days: JoyLunchDay[];
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

export function loadJoyLunchMonths(): JoyLunchMonth[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JoyLunchMonth[]) : [];
  } catch {
    return [];
  }
}

export function saveJoyLunchMonths(
  months: JoyLunchMonth[],
  options?: { silent?: boolean }
): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(months));
  if (!options?.silent) notifyChanged();
}

export function upsertJoyLunchMonth(monthData: JoyLunchMonth): JoyLunchMonth[] {
  const current = loadJoyLunchMonths().filter(
    (m) => !(m.year === monthData.year && m.month === monthData.month)
  );
  const next = [monthData, ...current].sort(
    (a, b) => b.year - a.year || b.month - a.month
  );
  saveJoyLunchMonths(next);
  return next;
}

export function removeJoyLunchMonth(year: number, month: number): JoyLunchMonth[] {
  const next = loadJoyLunchMonths().filter(
    (m) => !(m.year === year && m.month === month)
  );
  saveJoyLunchMonths(next);
  return next;
}

export function getJoyLunchForDate(date: string): JoyLunchDay | null {
  const [y, m] = date.split("-").map(Number);
  const monthData = loadJoyLunchMonths().find(
    (item) => item.year === y && item.month === m
  );
  if (!monthData) return null;
  return monthData.days.find((d) => d.date === date) ?? null;
}

export function joyLunchDayToFoodItem(day: JoyLunchDay): FoodItem {
  const filled = fillMissingNutrition({
    calories: String(day.calories),
    protein: String(day.protein),
    fat: String(day.fat),
    carbs: day.carbs != null ? String(day.carbs) : "",
  });

  return {
    id: generateId(),
    name: day.name,
    amount: 1,
    unit: "食",
    calories: filled.calories,
    protein: filled.protein,
    fat: filled.fat,
    carbs: filled.carbs,
  };
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
