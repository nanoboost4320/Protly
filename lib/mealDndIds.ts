import type { MealType } from "@/lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export function mealDroppableId(mealType: MealType): string {
  return `meal:${mealType}`;
}

export function foodDraggableId(mealType: MealType, foodId: string): string {
  return `food:${mealType}:${foodId}`;
}

export function parseMealDroppableId(id: string): MealType | null {
  if (!id.startsWith("meal:")) return null;
  const meal = id.slice("meal:".length) as MealType;
  return MEAL_TYPES.includes(meal) ? meal : null;
}

export function parseFoodDraggableId(
  id: string
): { mealType: MealType; foodId: string } | null {
  if (!id.startsWith("food:")) return null;
  const rest = id.slice("food:".length);
  const colon = rest.indexOf(":");
  if (colon < 0) return null;
  const mealType = rest.slice(0, colon) as MealType;
  const foodId = rest.slice(colon + 1);
  if (!MEAL_TYPES.includes(mealType) || !foodId) return null;
  return { mealType, foodId };
}
