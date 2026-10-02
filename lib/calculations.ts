/**
 * 栄養素の計算ロジック
 *
 * 「ビジネスロジック」と呼ばれる部分。
 * 画面（UI）とは分けておくと、テストしやすく、読みやすくなります。
 */

import type { FoodItem, NutritionDiff, NutritionTotals, Settings } from "./types";

/** 食品リストから合計カロリー・PFCを計算する */
export function calculateTotals(items: FoodItem[]): NutritionTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
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
    calories: totals.calories - settings.targetCalories,
    protein: totals.protein - settings.targetProtein,
  };
}

/**
 * PFCバランス（%）を計算する
 * タンパク質・脂質・炭水化物のカロリー換算:
 *   P: 4 kcal/g, F: 9 kcal/g, C: 4 kcal/g
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
    protein: Math.round((proteinCal / total) * 100),
    fat: Math.round((fatCal / total) * 100),
    carbs: Math.round((carbsCal / total) * 100),
  };
}

/** 達成率（0〜100%）を計算。100を超えることもある */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((current / target) * 100);
}

/** 差分を表示用テキストに変換 */
export function formatDiff(value: number, unit: string): string {
  if (value > 0) {
    return `▲ +${value}${unit}（超過）`;
  }
  if (value < 0) {
    return `▼ ${value}${unit}（不足）`;
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
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
    return { calories, protein, fat, carbs, filledField: null };
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

  return { calories, protein, fat, carbs, filledField };
}
