"use client";

/**
 * 設定画面: ジョイランチ月間カレンダーPDFの登録
 */

import {
  loadJoyLunchMonths,
  removeJoyLunchMonth,
  toDateString,
  upsertJoyLunchMonth,
  type JoyLunchDay,
  type JoyLunchMonth,
} from "@/lib/joyLunch";
import {
  parseJoyLunchPdfFile,
  type JoyLunchDayDraft,
} from "@/lib/joyLunchParse";
import { DATA_CHANGED_EVENT } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";

type DraftRow = JoyLunchDayDraft;

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function JoyLunchPanel() {
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [months, setMonths] = useState<JoyLunchMonth[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | undefined>();

  function refresh() {
    setMonths(loadJoyLunchMonths());
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  const savedThisMonth = useMemo(
    () => months.find((m) => m.year === year && m.month === month) ?? null,
    [months, year, month]
  );

  async function handleFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("PDFファイルを選んでください");
      return;
    }

    setBusy(true);
    setMessage(null);
    setWarnings([]);
    try {
      const result = await parseJoyLunchPdfFile(file, { year, month });
      setSourceFileName(file.name);
      setDrafts(result.days);
      setWarnings(result.warnings);
      if (result.detectedMonth && result.detectedMonth !== month) {
        // 検知月があれば合わせてあげる（ユーザーは変えられる）
        setMonth(result.detectedMonth);
      }
      if (result.days.length === 0) {
        setMessage("献立を読み取れませんでした。別のPDFか手入力で確認してください。");
      } else {
        setMessage(`${result.days.length} 日分を読み取りました。内容を確認して保存してください。`);
      }
    } catch (err) {
      console.error(err);
      setMessage("PDFの読み込みに失敗しました。文字付きPDFか確認してください。");
      setDrafts(null);
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DraftRow>) {
    setDrafts((prev) => {
      if (!prev) return prev;
      return prev.map((row, i) => (i === index ? { ...row, ...patch } : row));
    });
  }

  function handleSave() {
    if (!drafts || drafts.length === 0) {
      alert("保存する献立がありません");
      return;
    }

    const days: JoyLunchDay[] = drafts
      .filter((d) => d.day >= 1 && d.day <= 31 && d.name.trim())
      .map((d) => ({
        date: toDateString(year, month, d.day),
        name: d.name.trim(),
        calories: Number(d.calories) || 0,
        protein: Number(d.protein) || 0,
        fat: Number(d.fat) || 0,
      }));

    if (days.length === 0) {
      alert("有効な行がありません");
      return;
    }

    upsertJoyLunchMonth({
      year,
      month,
      importedAt: new Date().toISOString(),
      sourceFileName,
      days,
    });
    refresh();
    setDrafts(null);
    setWarnings([]);
    setMessage(`${year}年${month}月のジョイランチ（${days.length}日分）を保存しました`);
  }

  function handleDeleteMonth() {
    if (!savedThisMonth) return;
    if (!confirm(`${year}年${month}月のジョイランチデータを削除しますか？`)) return;
    removeJoyLunchMonth(year, month);
    refresh();
    setMessage(`${year}年${month}月のデータを削除しました`);
  }

  function loadSavedIntoDraft() {
    if (!savedThisMonth) return;
    setDrafts(
      savedThisMonth.days.map((d) => ({
        day: Number(d.date.slice(8, 10)),
        name: d.name,
        calories: d.calories,
        protein: d.protein,
        fat: d.fat,
      }))
    );
    setSourceFileName(savedThisMonth.sourceFileName);
    setMessage("保存済みデータを編集用に読み込みました");
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-500">
        ジョイランチ（月間カレンダー）
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        公式サイトの月間お弁当カレンダーPDFをダウンロードし、ここにアップロードしてください。
        読み取り結果を確認・修正して保存すると、該当日の昼食にワンタップ追加できます（無料・文字付きPDF向け）。
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">年</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">月</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">PDFファイル</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
          />
        </div>
      </div>

      {savedThisMonth && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {year}年{month}月は保存済み（{savedThisMonth.days.length}日分）
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadSavedIntoDraft}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              編集用に読み込む
            </button>
            <button
              type="button"
              onClick={handleDeleteMonth}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              この月を削除
            </button>
          </div>
        </div>
      )}

      {busy && <p className="mb-3 text-sm text-slate-400">PDFを解析中...</p>}
      {message && <p className="mb-3 text-sm text-slate-600">{message}</p>}

      {warnings.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-xs text-amber-700">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-3">
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-2">
            {drafts.map((row, index) => (
              <div
                key={`${row.day}-${index}`}
                className="grid grid-cols-12 gap-2 rounded-lg bg-slate-50 p-2 text-sm"
              >
                <div className="col-span-2">
                  <label className="mb-0.5 block text-[10px] text-slate-400">日</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={row.day}
                    onChange={(e) =>
                      updateDraft(index, { day: Number(e.target.value) || 1 })
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                </div>
                <div className="col-span-10 sm:col-span-5">
                  <label className="mb-0.5 block text-[10px] text-slate-400">
                    献立名
                  </label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateDraft(index, { name: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <label className="mb-0.5 block text-[10px] text-slate-400">
                    kcal
                  </label>
                  <input
                    type="number"
                    value={row.calories}
                    onChange={(e) =>
                      updateDraft(index, {
                        calories: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 py-1 text-sm"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="mb-0.5 block text-[10px] text-slate-400">P</label>
                  <input
                    type="number"
                    step="any"
                    value={row.protein}
                    onChange={(e) =>
                      updateDraft(index, {
                        protein: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 py-1 text-sm"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="mb-0.5 block text-[10px] text-slate-400">F</label>
                  <input
                    type="number"
                    step="any"
                    value={row.fat}
                    onChange={(e) =>
                      updateDraft(index, { fat: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-slate-200 px-1 py-1 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {year}年{month}月として保存
          </button>
        </div>
      )}

      {months.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">保存済みの月</p>
          <ul className="space-y-1 text-xs text-slate-600">
            {months.map((m) => (
              <li key={`${m.year}-${m.month}`}>
                {m.year}年{m.month}月（{m.days.length}日）
                {m.sourceFileName ? ` · ${m.sourceFileName}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
