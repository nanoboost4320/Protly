"use client";

/**
 * ホーム画面（食事記録）
 * - 記録日を自分で選べる
 */

import AddFoodModal from "@/components/AddFoodModal";
import BrandWordmark from "@/components/BrandWordmark";
import DailySummary from "@/components/DailySummary";
import JoyLunchAddButton from "@/components/JoyLunchAddButton";
import MealsBoard from "@/components/MealsBoard";
import {
  calculateDayTotals,
  calculateDiff,
  formatDateJapanese,
  getTodayString,
} from "@/lib/calculations";
import { CLOUD_DATA_PULLED_EVENT } from "@/components/CloudSyncProvider";
import { addDays } from "@/lib/dateUtils";
import { moveFoodBetweenMeals } from "@/lib/mealMove";
import { loadDayRecord, loadSettings, saveDayRecord } from "@/lib/storage";
import type { DayRecord, FoodItem, MealType } from "@/lib/types";
import { useEffect, useState } from "react";

type FoodModalState =
  | { mode: "add"; mealType: MealType }
  | { mode: "edit"; mealType: MealType; food: FoodItem }
  | null;

export default function HomePage() {
  const today = getTodayString();

  const [selectedDate, setSelectedDate] = useState(today);
  const [dayRecord, setDayRecord] = useState<DayRecord | null>(null);
  const [settings, setSettings] = useState(loadSettings());
  const [foodModal, setFoodModal] = useState<FoodModalState>(null);

  const isToday = selectedDate === today;

  useEffect(() => {
    function reload() {
      setDayRecord(loadDayRecord(selectedDate));
      setSettings(loadSettings());
    }
    reload();
    window.addEventListener(CLOUD_DATA_PULLED_EVENT, reload);
    return () => window.removeEventListener(CLOUD_DATA_PULLED_EVENT, reload);
  }, [selectedDate]);

  function handleSaveFood(mealType: MealType, food: FoodItem) {
    if (!dayRecord) return;

    const list = dayRecord.meals[mealType];
    const exists = list.some((f) => f.id === food.id);

    const updated: DayRecord = {
      ...dayRecord,
      date: selectedDate,
      meals: {
        ...dayRecord.meals,
        [mealType]: exists
          ? list.map((f) => (f.id === food.id ? food : f))
          : [...list, food],
      },
    };

    setDayRecord(updated);
    saveDayRecord(updated);
  }

  function handleDeleteFood(mealType: MealType, foodId: string) {
    if (!dayRecord) return;

    const updated: DayRecord = {
      ...dayRecord,
      date: selectedDate,
      meals: {
        ...dayRecord.meals,
        [mealType]: dayRecord.meals[mealType].filter((f) => f.id !== foodId),
      },
    };

    setDayRecord(updated);
    saveDayRecord(updated);
  }

  function handleMoveFood(from: MealType, to: MealType, foodId: string) {
    if (!dayRecord) return;
    const updated = moveFoodBetweenMeals(dayRecord, from, to, foodId);
    if (updated === dayRecord) return;
    setDayRecord(updated);
    saveDayRecord(updated);
  }

  function handleAddJoyLunch(foods: FoodItem[]) {
    if (!dayRecord || foods.length === 0) return;
    const updated: DayRecord = {
      ...dayRecord,
      date: selectedDate,
      meals: {
        ...dayRecord.meals,
        lunch: [...dayRecord.meals.lunch, ...foods],
      },
    };
    setDayRecord(updated);
    saveDayRecord(updated);
  }

  if (!dayRecord) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  const totals = calculateDayTotals(dayRecord.meals);
  const diff = calculateDiff(totals, settings);

  return (
    <main className="px-4 py-6">
      <header className="mb-5">
        <h1 className="leading-none">
          <BrandWordmark size="hero" />
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {isToday ? "今日の食事記録" : "選択した日の食事記録"}
        </p>
      </header>

      {/* 記録日の選択 */}
      <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-600">
          記録日
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50"
            aria-label="前日"
          >
            ◀
          </button>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={selectedDate >= today}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="翌日"
          >
            ▶
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            {formatDateJapanese(selectedDate)}
            {isToday && (
              <span className="ml-2 text-xs font-normal text-emerald-600">
                （今日）
              </span>
            )}
          </p>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="text-xs font-medium text-emerald-600 hover:underline"
            >
              今日に戻る
            </button>
          )}
        </div>
      </section>

      <div className="mb-6">
        <DailySummary totals={totals} diff={diff} settings={settings} />
      </div>

      <div className="mb-4">
        <JoyLunchAddButton
          date={selectedDate}
          lunchItems={dayRecord.meals.lunch}
          onAdd={handleAddJoyLunch}
        />
      </div>

      <MealsBoard
        meals={dayRecord.meals}
        onAdd={(type) => setFoodModal({ mode: "add", mealType: type })}
        onEdit={(type, food) =>
          setFoodModal({ mode: "edit", mealType: type, food })
        }
        onDelete={handleDeleteFood}
        onMove={handleMoveFood}
      />

      {foodModal && (
        <AddFoodModal
          mealType={foodModal.mealType}
          initialFood={foodModal.mode === "edit" ? foodModal.food : null}
          onSave={handleSaveFood}
          onClose={() => setFoodModal(null)}
        />
      )}
    </main>
  );
}
