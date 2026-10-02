/**
 * アプリ全体で使う「型（データの形）」を定義するファイル
 *
 * TypeScript の型 = 「このデータにはこういう項目があるよ」と決めておくもの。
 * 決めておくと、入力ミスをコンパイル時に検出できたり、
 * エディタが自動補完してくれたりします。
 */

/** 食事の区分: 朝食・昼食・夕食 */
export type MealType = "breakfast" | "lunch" | "dinner";

/** 1つの食品の記録 */
export interface FoodItem {
  id: string; // 一意のID（削除などに使う）
  name: string; // 食品名（例: 鶏むね肉）
  amount: number; // 量（例: 120）
  unit: string; // 単位（例: g）
  calories: number; // カロリー（kcal）
  protein: number; // タンパク質（g）
  fat: number; // 脂質（g）
  carbs: number; // 炭水化物（g）
}

/** 1日分の食事記録 */
export interface DayRecord {
  date: string; // 日付（YYYY-MM-DD 形式）
  meals: {
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
  };
}

/** ユーザーの目標設定 */
export interface Settings {
  targetCalories: number; // 1日の目標カロリー
  targetProtein: number; // 1日の目標タンパク質（g）
  targetFatPercent: number; // 脂質の目標比率（%）※参考用
  targetCarbsPercent: number; // 炭水化物の目標比率（%）※参考用
}

/** 栄養素の合計値 */
export interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** 目標との差分 */
export interface NutritionDiff {
  calories: number; // 正=超過、負=不足
  protein: number;
}

/** 食事区分の日本語ラベル */
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
};

/** 食事区分の絵文字（UI用） */
export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

/** 設定の初期値（初めて使うときのデフォルト） */
export const DEFAULT_SETTINGS: Settings = {
  targetCalories: 2000,
  targetProtein: 120,
  targetFatPercent: 25,
  targetCarbsPercent: 55,
};

/** 空の1日分レコードを作る */
export function createEmptyDayRecord(date: string): DayRecord {
  return {
    date,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
    },
  };
}
