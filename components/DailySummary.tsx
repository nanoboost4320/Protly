/**
 * 今日のカロリー・タンパク質サマリー表示
 */

import {
  calculatePFCPercent,
  calculateProgress,
  formatDiff,
  formatGrams,
} from "@/lib/calculations";
import type { NutritionDiff, NutritionTotals, Settings } from "@/lib/types";

interface DailySummaryProps {
  totals: NutritionTotals;
  diff: NutritionDiff;
  settings: Settings;
}

function ProgressBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const percent = Math.min(calculateProgress(current, target), 100);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function DailySummary({
  totals,
  diff,
  settings,
}: DailySummaryProps) {
  const pfc = calculatePFCPercent(totals);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">
この日のサマリー
      </h2>

      {/* カロリー */}
      <div className="mb-5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-medium">🔥 カロリー</span>
          <span className="text-lg font-bold">
            {totals.calories.toLocaleString()}
            <span className="text-sm font-normal text-slate-500">
              {" "}
              / {settings.targetCalories.toLocaleString()} kcal
            </span>
          </span>
        </div>
        <ProgressBar
          current={totals.calories}
          target={settings.targetCalories}
          color="bg-orange-400"
        />
        <p
          className={`mt-1 text-sm ${
            diff.calories > 0
              ? "text-red-500"
              : diff.calories < 0
                ? "text-blue-500"
                : "text-emerald-600"
          }`}
        >
          {formatDiff(diff.calories, " kcal")}
        </p>
      </div>

      {/* タンパク質 */}
      <div className="mb-5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-medium">💪 タンパク質</span>
          <span className="text-lg font-bold">
            {formatGrams(totals.protein)}
            <span className="text-sm font-normal text-slate-500">
              {" "}
              / {settings.targetProtein} g
            </span>
          </span>
        </div>
        <ProgressBar
          current={totals.protein}
          target={settings.targetProtein}
          color="bg-emerald-500"
        />
        <p
          className={`mt-1 text-sm ${
            diff.protein > 0
              ? "text-red-500"
              : diff.protein < 0
                ? "text-blue-500"
                : "text-emerald-600"
          }`}
        >
          {formatDiff(diff.protein, " g")}
        </p>
      </div>

      {/* PFCバランス */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">
          PFCバランス（参考）
        </p>
        <div className="flex gap-3 text-sm">
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">
            P {pfc.protein.toFixed(1)}%
          </span>
          <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-yellow-700">
            F {pfc.fat.toFixed(1)}%
          </span>
          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-green-700">
            C {pfc.carbs.toFixed(1)}%
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          P {formatGrams(totals.protein)}g / F {formatGrams(totals.fat)}g / C{" "}
          {formatGrams(totals.carbs)}g
        </p>
      </div>
    </div>
  );
}
