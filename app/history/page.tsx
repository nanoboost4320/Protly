"use client";

/**
 * 履歴画面
 * - カレンダーで日付選択
 * - その日の記録を見返し・追加・編集・削除できる
 */

import AddFoodModal from "@/components/AddFoodModal";
import BrandWordmark from "@/components/BrandWordmark";
import { CLOUD_DATA_PULLED_EVENT } from "@/components/CloudSyncProvider";
import DailySummary from "@/components/DailySummary";
import JoyLunchAddButton from "@/components/JoyLunchAddButton";
import MealsBoard from "@/components/MealsBoard";
import {
  calculateDayTotals,
  calculateDiff,
  formatDateJapanese,
  getTodayString,
} from "@/lib/calculations";
import {
  getDaysInMonth,
  getFirstWeekday,
  shiftMonth,
} from "@/lib/dateUtils";
import { moveFoodBetweenMeals } from "@/lib/mealMove";
import {
  loadAllRecords,
  loadSettings,
  saveDayRecord,
} from "@/lib/storage";
import {
  createEmptyDayRecord,
  type DayRecord,
  type FoodItem,
  type MealType,
  type Settings,
} from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type FoodModalState =
  | { mode: "add"; mealType: MealType }
  | { mode: "edit"; mealType: MealType; food: FoodItem }
  | null;

function hasFood(record: DayRecord | undefined): boolean {
  if (!record) return false;
  return (
    record.meals.breakfast.length +
      record.meals.lunch.length +
      record.meals.dinner.length >
    0
  );
}

/** 目標カロリーの前後この幅は「目標付近」 */
const CALORIE_NEAR_KCAL = 200;

function dayCalorieStatus(
  record: DayRecord | undefined,
  settings: Settings
): "none" | "ok" | "under" | "over" {
  if (!hasFood(record)) return "none";
  const totals = calculateDayTotals(record!.meals);
  const diff = calculateDiff(totals, settings);

  if (Math.abs(diff.calories) <= CALORIE_NEAR_KCAL) return "ok";
  if (diff.calories < 0) return "under";
  return "over";
}

/** 目標タンパク質の90%未満なら不足（数グラムの誤差では出さない） */
function isProteinShort(
  record: DayRecord | undefined,
  settings: Settings
): boolean {
  if (!hasFood(record) || settings.targetProtein <= 0) return false;
  const totals = calculateDayTotals(record!.meals);
  return totals.protein < settings.targetProtein * 0.9;
}

const STATUS_DOT: Record<string, string> = {
  none: "",
  ok: "bg-emerald-500",
  under: "bg-blue-500",
  over: "bg-red-400",
};

export default function HistoryPage() {
  const today = getTodayString();
  const todayDate = new Date();

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [foodModal, setFoodModal] = useState<FoodModalState>(null);

  useEffect(() => {
    function reload() {
      setRecords(loadAllRecords());
      setSettings(loadSettings());
    }
    reload();
    window.addEventListener(CLOUD_DATA_PULLED_EVENT, reload);
    return () => window.removeEventListener(CLOUD_DATA_PULLED_EVENT, reload);
  }, []);

  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstWeekday = getFirstWeekday(year, month);
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  const selectedRecord =
    records[selectedDate] ?? createEmptyDayRecord(selectedDate);

  function persist(record: DayRecord) {
    saveDayRecord(record);
    setRecords((prev) => ({ ...prev, [record.date]: record }));
  }

  function handleSaveFood(mealType: MealType, food: FoodItem) {
    const list = selectedRecord.meals[mealType];
    const exists = list.some((f) => f.id === food.id);
    const updated: DayRecord = {
      ...selectedRecord,
      date: selectedDate,
      meals: {
        ...selectedRecord.meals,
        [mealType]: exists
          ? list.map((f) => (f.id === food.id ? food : f))
          : [...list, food],
      },
    };
    persist(updated);
  }

  function handleDeleteFood(mealType: MealType, foodId: string) {
    const updated: DayRecord = {
      ...selectedRecord,
      date: selectedDate,
      meals: {
        ...selectedRecord.meals,
        [mealType]: selectedRecord.meals[mealType].filter(
          (f) => f.id !== foodId
        ),
      },
    };
    persist(updated);
  }

  function handleMoveFood(from: MealType, to: MealType, foodId: string) {
    const updated = moveFoodBetweenMeals(selectedRecord, from, to, foodId);
    if (updated === selectedRecord) return;
    persist(updated);
  }

  function handleAddJoyLunch(foods: FoodItem[]) {
    if (foods.length === 0) return;
    const updated: DayRecord = {
      ...selectedRecord,
      date: selectedDate,
      meals: {
        ...selectedRecord.meals,
        lunch: [...selectedRecord.meals.lunch, ...foods],
      },
    };
    persist(updated);
  }

  function changeMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  function selectDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  const totals = calculateDayTotals(selectedRecord.meals);
  const diff = calculateDiff(totals, settings);

  return (
    <main className="px-4 py-6">
      <header className="mb-6">
        <p className="mb-1">
          <BrandWordmark />
        </p>
        <h1 className="text-xl font-bold">📅 履歴</h1>
        <p className="text-sm text-slate-500">
          過去の食事を見返し、その場で編集もできます
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
          >
            ◀
          </button>
          <h2 className="font-semibold">
            {year}年{month}月
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
          >
            ▶
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-xs text-slate-400">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const record = records[dateStr];
            const status = dayCalorieStatus(record, settings);
            const proteinShort = isProteinShort(record, settings);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;

            return (
              <button
                key={dateStr}
                onClick={() => selectDay(day)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                  isSelected
                    ? "bg-emerald-500 font-bold text-white"
                    : isToday
                      ? "bg-emerald-50 font-semibold text-emerald-700"
                      : "hover:bg-slate-50"
                }`}
              >
                {day}
                {(status !== "none" || proteinShort) && (
                  <span className="absolute bottom-0.5 flex items-center gap-0.5">
                    {status !== "none" && !isSelected && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
                      />
                    )}
                    {proteinShort && (
                      <span
                        className={`text-[9px] font-bold leading-none ${
                          isSelected ? "text-amber-100" : "text-amber-600"
                        }`}
                        title="タンパク質不足"
                      >
                        P
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 目標付近
            （±200kcal）
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> 不足寄り
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" /> 超過寄り
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-amber-600">P</span>
            タンパク質不足
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500">
          {formatDateJapanese(selectedDate)} の記録
          {selectedDate === today && "（今日）"}
        </h2>

        <DailySummary totals={totals} diff={diff} settings={settings} />

        <JoyLunchAddButton
          date={selectedDate}
          lunchItems={selectedRecord.meals.lunch}
          onAdd={handleAddJoyLunch}
        />

        <MealsBoard
          meals={selectedRecord.meals}
          onAdd={(type) => setFoodModal({ mode: "add", mealType: type })}
          onEdit={(type, food) =>
            setFoodModal({ mode: "edit", mealType: type, food })
          }
          onDelete={handleDeleteFood}
          onMove={handleMoveFood}
        />
      </section>

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
