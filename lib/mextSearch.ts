/**
 * 日本食品標準成分表データのサーバー側検索
 * data/mext-foods.json を読むため、API Route などサーバーからのみ使うこと
 */

import foodsData from "@/data/mext-foods.json";
import {
  MEXT_ATTRIBUTION,
  MEXT_SOURCE,
  MEXT_SOURCE_URL,
  type MextFood,
} from "@/lib/mextConstants";

export type { MextFood };
export { MEXT_ATTRIBUTION, MEXT_SOURCE, MEXT_SOURCE_URL };

export const MEXT_FOOD_COUNT = foodsData.count;

const FOODS = foodsData.foods as MextFood[];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u3000/g, "")
    .replace(/\s+/g, "")
    .replace(/[［\[]/g, "")
    .replace(/[］\]]/g, "")
    .replace(/[（(]/g, "")
    .replace(/[）)]/g, "");
}

/** 食品名で成分表を検索する */
export function searchMextFoods(query: string, limit = 12): MextFood[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const scored = FOODS.map((food) => {
    const name = normalize(food.name);
    let score = 0;

    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 90;
    else if (name.endsWith(q)) score = 85;
    else if (name.includes(q)) score = 70;
    else {
      const parts = query
        .trim()
        .split(/[\s\u3000]+/)
        .map(normalize)
        .filter(Boolean);
      if (parts.length > 1 && parts.every((p) => name.includes(p))) {
        score = 60;
      }
    }

    return { food, score };
  })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.food.name.localeCompare(b.food.name, "ja")
    );

  return scored.slice(0, limit).map((x) => x.food);
}
