"use client";

/**
 * 統計画面
 * - 週 / 月のカロリー・タンパク質の差分集計
 */

import { CLOUD_DATA_PULLED_EVENT } from "@/components/CloudSyncProvider";
import { formatDiff, getTodayString } from "@/lib/calculations";
import {
  getMonthDates,
  getWeekRange,
  parseDate,
  shiftMonth,
  toDateString,
} from "@/lib/dateUtils";
import { loadAllRecords, loadSettings } from "@/lib/storage";
import { calculatePeriodStats, type PeriodStats } from "@/lib/stats";
import type { DayRecord, Settings } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type Tab = "week" | "month";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function SimpleBars({
  days,
  getValue,
  labels,
}: {
  days: PeriodStats["days"];
  getValue: (d: PeriodStats["days"][0]) => number;
  labels: string[];
}) {
  const values = days.map(getValue);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);

  return (
    <div className="flex items-end gap-1">
      {days.map((day, i) => {
        const value = values[i];
        const ratio = Math.abs(value) / maxAbs;
        const barHeight = day.hasRecord ? Math.max(ratio * 80, value === 0 ? 2 : 8) : 2;

        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full flex-col items-center justify-center">
              {day.hasRecord ? (
                <div
                  className={`w-full max-w-[28px] rounded-t-md ${
                    value > 0
                      ? "bg-red-400"
                      : value < 0
                        ? "bg-blue-400"
                        : "bg-emerald-400"
                  }`}
                  style={{ height: `${barHeight}px` }}
                  title={`${value}`}
                />
              ) : (
                <div className="h-1 w-full max-w-[28px] rounded bg-slate-200" />
              )}
            </div>
            <span className="text-[10px] text-slate-400">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("week");
  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const [weekBase, setWeekBase] = useState("");
  const [monthYear, setMonthYear] = useState(0);
  const [monthMonth, setMonthMonth] = useState(0);

  useEffect(() => {
    const today = getTodayString();
    const todayDate = parseDate(today);
    setWeekBase(today);
    setMonthYear(todayDate.getFullYear());
    setMonthMonth(todayDate.getMonth() + 1);

    function reload() {
      setRecords(loadAllRecords());
      setSettings(loadSettings());
    }
    reload();
    setReady(true);

    window.addEventListener(CLOUD_DATA_PULLED_EVENT, reload);
    return () => window.removeEventListener(CLOUD_DATA_PULLED_EVENT, reload);
  }, []);

  const weekRange = useMemo(() => {
    if (!weekBase) return null;
    return getWeekRange(parseDate(weekBase));
  }, [weekBase]);

  const monthDates = useMemo(() => {
    if (!monthYear || !monthMonth) return [];
    return getMonthDates(monthYear, monthMonth);
  }, [monthYear, monthMonth]);

  const stats = useMemo(() => {
    if (!settings || !weekRange) return null;
    const dates = tab === "week" ? weekRange.dates : monthDates;
    return calculatePeriodStats(dates, records, settings);
  }, [settings, tab, weekRange, monthDates, records]);

  function shiftWeek(delta: number) {
    const d = parseDate(weekBase);
    d.setDate(d.getDate() + delta * 7);
    setWeekBase(toDateString(d));
  }

  function changeMonth(delta: number) {
    const next = shiftMonth(monthYear, monthMonth, delta);
    setMonthYear(next.year);
    setMonthMonth(next.month);
  }

  if (!ready || !settings || !stats || !weekRange) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  const weekLabels = WEEKDAY_LABELS;
  const monthLabels = monthDates.map((d) => String(parseDate(d).getDate()));

  // 月表示は多すぎるので、記録がある日＋均等サンプリングではなく全日を細く表示
  const barLabels = tab === "week" ? weekLabels : monthLabels;

  return (
    <main className="px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-emerald-600">
          Protly
        </p>
        <h1 className="text-xl font-bold">📊 統計</h1>
        <p className="text-sm text-slate-500">
          目標との差（マイナス＝不足＝減量寄り）
        </p>
      </header>

      <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
        {(["week", "month"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500"
            }`}
          >
            {t === "week" ? "週" : "月"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        {tab === "week" ? (
          <>
            <button
              onClick={() => shiftWeek(-1)}
              className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            >
              ◀
            </button>
            <p className="text-sm font-medium">
              {weekRange.start.replace(/-/g, "/")} 〜{" "}
              {weekRange.end.replace(/-/g, "/")}
            </p>
            <button
              onClick={() => shiftWeek(1)}
              className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            >
              ▶
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            >
              ◀
            </button>
            <p className="text-sm font-medium">
              {monthYear}年{monthMonth}月
            </p>
            <button
              onClick={() => changeMonth(1)}
              className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            >
              ▶
            </button>
          </>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-400">
        記録日数: {stats.recordedDays}日
        {stats.recordedDays === 0 && "（まだ記録がありません）"}
      </p>

      {/* カロリー */}
      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">🔥 カロリー（目標との差）</h2>
        <p
          className={`text-lg font-bold ${
            stats.sumDiffCalories > 0
              ? "text-red-500"
              : stats.sumDiffCalories < 0
                ? "text-blue-500"
                : "text-emerald-600"
          }`}
        >
          {tab === "week" ? "週間" : "月間"}合計:{" "}
          {formatDiff(stats.sumDiffCalories, " kcal")}
        </p>
        <p className="mb-4 text-sm text-slate-500">
          1日平均: {formatDiff(stats.avgDiffCalories, " kcal")}
        </p>
        <SimpleBars
          days={stats.days}
          getValue={(d) => (d.hasRecord ? d.diff.calories : 0)}
          labels={barLabels}
        />
        <p className="mt-2 text-center text-[10px] text-slate-400">
          青＝目標より少ない / 赤＝目標より多い
        </p>
      </section>

      {/* タンパク質 */}
      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">
          💪 タンパク質（目標との差）
        </h2>
        <p
          className={`text-lg font-bold ${
            stats.sumDiffProtein > 0
              ? "text-red-500"
              : stats.sumDiffProtein < 0
                ? "text-blue-500"
                : "text-emerald-600"
          }`}
        >
          {tab === "week" ? "週間" : "月間"}合計:{" "}
          {formatDiff(stats.sumDiffProtein, " g")}
        </p>
        <p className="mb-4 text-sm text-slate-500">
          1日平均: {formatDiff(stats.avgDiffProtein, " g")}
        </p>
        <SimpleBars
          days={stats.days}
          getValue={(d) => (d.hasRecord ? d.diff.protein : 0)}
          labels={barLabels}
        />
        <p className="mt-2 text-center text-[10px] text-slate-400">
          青＝不足 / 赤＝超過（筋トレでは不足に注意）
        </p>
      </section>

      {/* PFC */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          PFCバランス（期間平均）
        </h2>
        <div className="flex gap-3 text-sm">
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">
            P {stats.avgPFC.protein}%
          </span>
          <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-yellow-700">
            F {stats.avgPFC.fat}%
          </span>
          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-green-700">
            C {stats.avgPFC.carbs}%
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          平均摂取: {stats.avgTotals.calories} kcal / P{stats.avgTotals.protein}g
          / F{stats.avgTotals.fat}g / C{stats.avgTotals.carbs}g
        </p>
      </section>
    </main>
  );
}
