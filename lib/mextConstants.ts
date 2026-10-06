/**
 * 成分表まわりの定数・型・スケール（クライアントでも安全に import 可）
 * 大量の JSON は lib/mextSearch.ts（サーバー検索専用）側のみが読む
 */

export interface MextFood {
  id: string;
  name: string;
  baseAmount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const MEXT_SOURCE = "日本食品標準成分表（八訂）増補2023年";
export const MEXT_SOURCE_URL =
  "https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html";
/** 二次利用時に画面・ドキュメントへ表示する出典文 */
export const MEXT_ATTRIBUTION =
  "日本食品標準成分表（八訂）増補2023年から引用";

/** 量に応じて栄養素をスケールする（基準は可食部100g） */
export function scaleNutrition(
  food: Pick<MextFood, "baseAmount" | "calories" | "protein" | "fat" | "carbs">,
  amount: number
): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
} {
  const ratio = amount / food.baseAmount;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(food.calories * ratio),
    protein: round1(food.protein * ratio),
    fat: round1(food.fat * ratio),
    carbs: round1(food.carbs * ratio),
  };
}
