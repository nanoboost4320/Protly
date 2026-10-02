/**
 * 週・月の集計ロジック
 */

import { calculateDayTotals, calculateDiff, calculatePFCPercent } from "./calculations";
import type { DayRecord, NutritionDiff, NutritionTotals, Settings } from "./types";

export interface DayStat {
  date: string;
  hasRecord: boolean;
  totals: NutritionTotals;
  diff: NutritionDiff;
}

export interface PeriodStats {
  days: DayStat[];
  recordedDays: number;
  sumDiffCalories: number;
  sumDiffProtein: number;
  avgDiffCalories: number;
  avgDiffProtein: number;
  avgTotals: NutritionTotals;
  avgPFC: { protein: number; fat: number; carbs: number };
}

function emptyTotals(): NutritionTotals {
  return { calories: 0, protein: 0, fat: 0, carbs: 0 };
}

function hasAnyFood(record: DayRecord | undefined): boolean {
  if (!record) return false;
  return (
    record.meals.breakfast.length +
      record.meals.lunch.length +
      record.meals.dinner.length >
    0
  );
}

/** 指定期間の統計を計算する */
export function calculatePeriodStats(
  dates: string[],
  records: Record<string, DayRecord>,
  settings: Settings
): PeriodStats {
  const days: DayStat[] = dates.map((date) => {
    const record = records[date];
    const recorded = hasAnyFood(record);
    const totals = recorded ? calculateDayTotals(record.meals) : emptyTotals();
    const diff = recorded
      ? calculateDiff(totals, settings)
      : { calories: 0, protein: 0 };

    return { date, hasRecord: recorded, totals, diff };
  });

  const recorded = days.filter((d) => d.hasRecord);
  const recordedDays = recorded.length;

  const sumDiffCalories = recorded.reduce((s, d) => s + d.diff.calories, 0);
  const sumDiffProtein = recorded.reduce((s, d) => s + d.diff.protein, 0);

  const sumTotals = recorded.reduce(
    (acc, d) => ({
      calories: acc.calories + d.totals.calories,
      protein: acc.protein + d.totals.protein,
      fat: acc.fat + d.totals.fat,
      carbs: acc.carbs + d.totals.carbs,
    }),
    emptyTotals()
  );

  const avgTotals =
    recordedDays === 0
      ? emptyTotals()
      : {
          calories: Math.round(sumTotals.calories / recordedDays),
          protein: Math.round((sumTotals.protein / recordedDays) * 10) / 10,
          fat: Math.round((sumTotals.fat / recordedDays) * 10) / 10,
          carbs: Math.round((sumTotals.carbs / recordedDays) * 10) / 10,
        };

  return {
    days,
    recordedDays,
    sumDiffCalories: Math.round(sumDiffCalories),
    sumDiffProtein: Math.round(sumDiffProtein * 10) / 10,
    avgDiffCalories:
      recordedDays === 0 ? 0 : Math.round(sumDiffCalories / recordedDays),
    avgDiffProtein:
      recordedDays === 0
        ? 0
        : Math.round((sumDiffProtein / recordedDays) * 10) / 10,
    avgTotals,
    avgPFC: calculatePFCPercent(avgTotals),
  };
}
