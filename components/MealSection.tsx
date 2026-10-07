"use client";

/**
 * 1食分（朝食・昼食・夕食）の表示エリア
 * - ドラッグ＆ドロップ / 「移動」で他の食事へ移せる
 */

import { foodDraggableId, mealDroppableId } from "@/lib/mealDndIds";
import { calculateTotals, formatGrams } from "@/lib/calculations";
import { addFavorite, isFavoriteName } from "@/lib/favorites";
import {
  MEAL_ICONS,
  MEAL_LABELS,
  type FoodItem,
  type MealType,
} from "@/lib/types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

const ALL_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

interface MealSectionProps {
  mealType: MealType;
  items: FoodItem[];
  onAdd: (mealType: MealType) => void;
  onEdit: (mealType: MealType, food: FoodItem) => void;
  onDelete: (mealType: MealType, foodId: string) => void;
  onMove: (from: MealType, to: MealType, foodId: string) => void;
}

function FoodRow({
  mealType,
  item,
  onEdit,
  onDelete,
  onMove,
  onRegister,
  justRegistered,
  favorited,
}: {
  mealType: MealType;
  item: FoodItem;
  onEdit: (mealType: MealType, food: FoodItem) => void;
  onDelete: (mealType: MealType, foodId: string) => void;
  onMove: (from: MealType, to: MealType, foodId: string) => void;
  onRegister: (food: FoodItem) => void;
  justRegistered: boolean;
  favorited: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: foodDraggableId(mealType, item.id),
      data: { mealType, foodId: item.id },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
  };

  const otherMeals = ALL_MEALS.filter((m) => m !== mealType);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start justify-between gap-2 rounded-xl border border-transparent bg-white text-sm touch-manipulation"
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab rounded px-1.5 py-1 text-slate-300 hover:bg-slate-50 hover:text-slate-500 active:cursor-grabbing"
        aria-label={`${item.name}をドラッグして移動`}
        title="ドラッグして移動"
        {...listeners}
        {...attributes}
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <span className="font-medium">{item.name}</span>
        <span className="text-slate-400">
          {" "}
          {item.amount}
          {item.unit}
        </span>
        <div className="text-xs text-slate-400">
          {Math.round(item.calories)} kcal · P{formatGrams(item.protein)} F
          {formatGrams(item.fat)} C{formatGrams(item.carbs)}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        <label className="sr-only" htmlFor={`move-${mealType}-${item.id}`}>
          {item.name}の移動先
        </label>
        <select
          id={`move-${mealType}-${item.id}`}
          defaultValue=""
          onChange={(e) => {
            const to = e.target.value as MealType;
            if (!to) return;
            onMove(mealType, to, item.id);
            e.currentTarget.value = "";
          }}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 hover:border-emerald-300"
          aria-label={`${item.name}を他の食事へ移動`}
        >
          <option value="" disabled>
            移動
          </option>
          {otherMeals.map((m) => (
            <option key={m} value={m}>
              {MEAL_ICONS[m]}
              {MEAL_LABELS[m]}へ
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onRegister(item)}
          className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
          aria-label={`${item.name}をよく使うに登録`}
          title="よく使う食材に登録"
        >
          {justRegistered ? "✓" : favorited ? "更新" : "登録"}
        </button>
        <button
          type="button"
          onClick={() => onEdit(mealType, item)}
          className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
          aria-label={`${item.name}を編集`}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(mealType, item.id)}
          className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`${item.name}を削除`}
        >
          削除
        </button>
      </div>
    </li>
  );
}

export default function MealSection({
  mealType,
  items,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: MealSectionProps) {
  const totals = calculateTotals(items);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: mealDroppableId(mealType),
    data: { mealType },
  });

  function handleRegister(item: FoodItem) {
    addFavorite(item);
    setRegisteredId(item.id);
    window.setTimeout(() => setRegisteredId(null), 1500);
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        isOver
          ? "border-emerald-400 bg-emerald-50/40"
          : "border-slate-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}
        </h3>
        <span className="text-sm font-medium text-slate-500">
          {totals.calories} kcal
        </span>
      </div>

      {items.length === 0 ? (
        <p
          className={`mb-3 text-sm ${
            isOver ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {isOver ? "ここにドロップ" : "まだ記録がありません"}
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <FoodRow
              key={item.id}
              mealType={mealType}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              onRegister={handleRegister}
              justRegistered={registeredId === item.id}
              favorited={isFavoriteName(item.name)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onAdd(mealType)}
        className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
      >
        + 食品を追加
      </button>
    </div>
  );
}
