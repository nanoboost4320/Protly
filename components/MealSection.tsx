"use client";

/**
 * 1食分（朝食・昼食・夕食）の表示エリア
 */

import { calculateTotals } from "@/lib/calculations";
import { addFavorite, isFavoriteName } from "@/lib/favorites";
import { MEAL_ICONS, MEAL_LABELS, type FoodItem, type MealType } from "@/lib/types";
import { useState } from "react";

interface MealSectionProps {
  mealType: MealType;
  items: FoodItem[];
  onAdd: (mealType: MealType) => void;
  onEdit: (mealType: MealType, food: FoodItem) => void;
  onDelete: (mealType: MealType, foodId: string) => void;
}

export default function MealSection({
  mealType,
  items,
  onAdd,
  onEdit,
  onDelete,
}: MealSectionProps) {
  const totals = calculateTotals(items);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  function handleRegister(item: FoodItem) {
    addFavorite(item);
    setRegisteredId(item.id);
    window.setTimeout(() => setRegisteredId(null), 1500);
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}
        </h3>
        <span className="text-sm font-medium text-slate-500">
          {totals.calories} kcal
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">まだ記録がありません</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((item) => {
            const favorited = isFavoriteName(item.name);
            const justRegistered = registeredId === item.id;

            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate-400">
                    {" "}
                    {item.amount}
                    {item.unit}
                  </span>
                  <div className="text-xs text-slate-400">
                    {item.calories} kcal · P{item.protein} F{item.fat} C
                    {item.carbs}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleRegister(item)}
                    className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
                    aria-label={`${item.name}をよく使うに登録`}
                    title="よく使う食材に登録"
                  >
                    {justRegistered ? "✓" : favorited ? "更新" : "登録"}
                  </button>
                  <button
                    onClick={() => onEdit(mealType, item)}
                    className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                    aria-label={`${item.name}を編集`}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDelete(mealType, item.id)}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`${item.name}を削除`}
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => onAdd(mealType)}
        className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
      >
        + 食品を追加
      </button>
    </div>
  );
}
