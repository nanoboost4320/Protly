/**
 * 日付まわりのユーティリティ
 */

/** YYYY-MM-DD 形式に変換 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD から Date を作る */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/** 月の日数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** その月の1日の曜日（0=日） */
export function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/** 週の開始（月曜）〜終了（日曜）を返す */
export function getWeekRange(baseDate: Date): { start: string; end: string; dates: string[] } {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=日
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(toDateString(current));
  }

  return {
    start: dates[0],
    end: dates[6],
    dates,
  };
}

/** 月の全日付を返す */
export function getMonthDates(year: number, month: number): string[] {
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= days; day++) {
    dates.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  return dates;
}

/** 日付に日数を足す */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** 月をずらす */
export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
