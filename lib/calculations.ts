/**
 * 栄養素の計算ロジック
 *
 * 「ビジネスロジック」と呼ばれる部分。
 * 画面（UI）とは分けておくと、テストしやすく、読みやすくなります。
 */

import type { FoodItem, NutritionDiff, NutritionTotals, Settings } from "./types";

/** 小数第1位に丸める（PFC表示の共通ルール） */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** グラム系の表示用（小数第1位） */
export function formatGrams(n: number): string {
  return String(round1(n));
}

/** 食品リストから合計カロリー・PFCを計算する */
export function calculateTotals(items: FoodItem[]): NutritionTotals {
  const raw = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  return {
    calories: Math.round(raw.calories),
    protein: round1(raw.protein),
    fat: round1(raw.fat),
    carbs: round1(raw.carbs),
  };
}

/** 1日分の全食事から合計を計算する */
export function calculateDayTotals(
  meals: Record<"breakfast" | "lunch" | "dinner", FoodItem[]>
): NutritionTotals {
  const allItems = [
    ...meals.breakfast,
    ...meals.lunch,
    ...meals.dinner,
  ];
  return calculateTotals(allItems);
}

/** 目標との差分を計算する（正=超過、負=不足） */
export function calculateDiff(
  totals: NutritionTotals,
  settings: Settings
): NutritionDiff {
  return {
    calories: Math.round(totals.calories - settings.targetCalories),
    protein: round1(totals.protein - settings.targetProtein),
  };
}

/**
 * PFCバランス（%）を計算する
 * タンパク質・脂質・炭水化物のカロリー換算:
 *   P: 4 kcal/g, F: 9 kcal/g, C: 4 kcal/g
 * 表示は小数第1位まで
 */
export function calculatePFCPercent(totals: NutritionTotals): {
  protein: number;
  fat: number;
  carbs: number;
} {
  const proteinCal = totals.protein * 4;
  const fatCal = totals.fat * 9;
  const carbsCal = totals.carbs * 4;
  const total = proteinCal + fatCal + carbsCal;

  if (total === 0) {
    return { protein: 0, fat: 0, carbs: 0 };
  }

  return {
    protein: round1((proteinCal / total) * 100),
    fat: round1((fatCal / total) * 100),
    carbs: round1((carbsCal / total) * 100),
  };
}

/** 達成率（0〜100%）を計算。100を超えることもある */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((current / target) * 100);
}

/** 差分を表示用テキストに変換（kcalは整数、gは小数第1位） */
export function formatDiff(value: number, unit: string): string {
  const display = unit.includes("kcal") ? Math.round(value) : round1(value);
  if (display > 0) {
    return `▲ +${display}${unit}（超過）`;
  }
  if (display < 0) {
    return `▼ ${display}${unit}（不足）`;
  }
  return `ちょうど目標通り`;
}

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 日付を日本語表示用にフォーマット（例: 6月29日(日)） */
export function formatDateJapanese(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日(${weekday})`;
}

/** ユニークIDを生成（食品追加時に使う） */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 入力欄が空かどうか（0は「入力済み」として扱う） */
function isNutritionFilled(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

export type NutritionField = "calories" | "protein" | "fat" | "carbs";

/**
 * カロリー / P / F / C のうち「1つだけ空」のとき、残り3つから補完する。
 * 式: カロリー ≒ P×4 + F×9 + C×4
 * すでに入力されている値は上書きしない。
 */
export function fillMissingNutrition(input: {
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
}): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  filledField: NutritionField | null;
} {
  const hasCal = isNutritionFilled(input.calories);
  const hasP = isNutritionFilled(input.protein);
  const hasF = isNutritionFilled(input.fat);
  const hasC = isNutritionFilled(input.carbs);

  let calories = hasCal ? Number(input.calories) : 0;
  let protein = hasP ? Number(input.protein) : 0;
  let fat = hasF ? Number(input.fat) : 0;
  let carbs = hasC ? Number(input.carbs) : 0;

  // 数値として不正なら補完しない
  const filledValues = [
    hasCal ? calories : null,
    hasP ? protein : null,
    hasF ? fat : null,
    hasC ? carbs : null,
  ].filter((v) => v !== null);
  if (filledValues.some((v) => Number.isNaN(v as number))) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0, filledField: null };
  }

  const missingCount = [hasCal, hasP, hasF, hasC].filter((x) => !x).length;
  if (missingCount !== 1) {
    return {
      calories: Math.round(calories),
      protein: round1(protein),
      fat: round1(fat),
      carbs: round1(carbs),
      filledField: null,
    };
  }

  let filledField: NutritionField | null = null;

  if (!hasCal) {
    calories = Math.max(0, Math.round(protein * 4 + fat * 9 + carbs * 4));
    filledField = "calories";
  } else if (!hasP) {
    protein = Math.max(0, round1((calories - fat * 9 - carbs * 4) / 4));
    filledField = "protein";
  } else if (!hasF) {
    fat = Math.max(0, round1((calories - protein * 4 - carbs * 4) / 9));
    filledField = "fat";
  } else if (!hasC) {
    carbs = Math.max(0, round1((calories - protein * 4 - fat * 9) / 4));
    filledField = "carbs";
  }

  return {
    calories: Math.round(calories),
    protein: round1(protein),
    fat: round1(fat),
    carbs: round1(carbs),
    filledField,
  };
}
