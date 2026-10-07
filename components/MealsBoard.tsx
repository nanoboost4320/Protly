"use client";

/**
 * 朝・昼・晩の食事一覧（ドラッグ＆ドロップで移動可）
 */

import MealSection from "@/components/MealSection";
import {
  parseFoodDraggableId,
  parseMealDroppableId,
} from "@/lib/mealDndIds";
import type { FoodItem, MealType } from "@/lib/types";
import { MEAL_ICONS, MEAL_LABELS } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

interface MealsBoardProps {
  meals: Record<MealType, FoodItem[]>;
  onAdd: (mealType: MealType) => void;
  onEdit: (mealType: MealType, food: FoodItem) => void;
  onDelete: (mealType: MealType, foodId: string) => void;
  onMove: (from: MealType, to: MealType, foodId: string) => void;
}

export default function MealsBoard({
  meals,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: MealsBoardProps) {
  const [activeFood, setActiveFood] = useState<{
    mealType: MealType;
    food: FoodItem;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // スクロールと区別するため、少し動かしてからドラッグ開始
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const parsed = parseFoodDraggableId(String(event.active.id));
    if (!parsed) return;
    const food = meals[parsed.mealType].find((f) => f.id === parsed.foodId);
    if (!food) return;
    setActiveFood({ mealType: parsed.mealType, food });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveFood(null);
    const { active, over } = event;
    if (!over) return;

    const from = parseFoodDraggableId(String(active.id));
    if (!from) return;

    let toMeal = parseMealDroppableId(String(over.id));
    if (!toMeal) {
      const overFood = parseFoodDraggableId(String(over.id));
      toMeal = overFood?.mealType ?? null;
    }
    if (!toMeal || toMeal === from.mealType) return;

    onMove(from.mealType, toMeal, from.foodId);
  }

  function handleDragCancel() {
    setActiveFood(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        食品を別の食事へドラッグするか、「移動」から変更できます
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {MEAL_TYPES.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            items={meals[mealType]}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}

        <DragOverlay dropAnimation={null}>
          {activeFood ? (
            <div className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm shadow-lg">
              <span className="font-medium">{activeFood.food.name}</span>
              <span className="ml-2 text-xs text-slate-400">
                {MEAL_ICONS[activeFood.mealType]}
                {MEAL_LABELS[activeFood.mealType]} → …
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
