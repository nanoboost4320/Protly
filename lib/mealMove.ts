/**
 * 1日の食事レコード内で食品を別の食事へ移す
 */

import type { DayRecord, MealType } from "./types";

export function moveFoodBetweenMeals(
  record: DayRecord,
  from: MealType,
  to: MealType,
  foodId: string
): DayRecord {
  if (from === to) return record;

  const food = record.meals[from].find((item) => item.id === foodId);
  if (!food) return record;

  return {
    ...record,
    meals: {
      ...record.meals,
      [from]: record.meals[from].filter((item) => item.id !== foodId),
      [to]: [...record.meals[to], food],
    },
  };
}
