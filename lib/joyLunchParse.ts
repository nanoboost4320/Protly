/**
 * ジョイランチ月間カレンダーPDFの解析
 * pdfjs で文字+座標を取り、日付セルごとに献立とPFCを組む
 */

export interface JoyLunchDayDraft {
  day: number;
  name: string;
  calories: number;
  protein: number;
  fat: number;
}

export interface JoyLunchParseResult {
  days: JoyLunchDayDraft[];
  detectedMonth: number | null;
  warnings: string[];
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

const NOISE_RE =
  /月決め|注文|容器|協力|原油|おすすめ|土曜日|ライス|山形県|お願い|変更|回収|電子レンジ|タバコ|食材の入手|プラスチック|入荷|傷み|ジョイランチから|お召し上がり|衛生/;

const NUT_RE =
  /●\s*(\d+(?:\.\d+)?)\s*kcal\s*●\s*タンパク(?:質)?\s*(\d+(?:\.\d+)?)\s*g\s*●\s*脂(?:質)?\s*(\d+(?:\.\d+)?)\s*g/i;

function parseNutrition(str: string): {
  calories: number;
  protein: number;
  fat: number;
} | null {
  const normalized = str.replace(/\s+/g, "");
  const m = normalized.match(NUT_RE);
  if (!m) return null;
  return {
    calories: Number(m[1]),
    protein: Number(m[2]),
    fat: Number(m[3]),
  };
}

function isDayLabel(str: string): boolean {
  if (!/^\d{1,2}$/.test(str)) return false;
  const n = Number(str);
  return n >= 1 && n <= 31;
}

function dedupeDays(items: TextItem[]): TextItem[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out: TextItem[] = [];
  for (const d of sorted) {
    if (out.some((x) => Math.abs(x.x - d.x) < 20 && Math.abs(x.y - d.y) < 15)) {
      continue;
    }
    out.push(d);
  }
  return out;
}

function pickDishNames(cellItems: TextItem[]): string {
  // 同じ高さの重複（アウトライン文字など）をまとめ、長い方を採用
  const byY = new Map<number, string>();
  for (const item of cellItems) {
    if (parseNutrition(item.str)) continue;
    if (isDayLabel(item.str)) continue;
    if (item.str.length < 2) continue;
    if (NOISE_RE.test(item.str)) continue;
    if (/^\d+(\.\d+)?g?$/.test(item.str)) continue;

    const key = Math.round(item.y / 6) * 6;
    const prev = byY.get(key);
    if (!prev || item.str.length > prev.length) {
      byY.set(key, item.str);
    }
  }

  const names = [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, name]) => name)
    // 部分重複を除去（短い方が長い方に含まれる）
    .filter((name, idx, arr) => {
      return !arr.some(
        (other, j) => j !== idx && other.includes(name) && other.length > name.length
      );
    })
    .slice(0, 3);

  return names.join(" / ");
}

function detectMonth(items: TextItem[]): number | null {
  // 左上付近の大きな月数字（例: 10）
  const candidates = items.filter((i) => {
    if (!/^(1[0-2]|[1-9])$/.test(i.str)) return false;
    return i.x < 80 && i.y > 480;
  });
  if (candidates.length === 0) return null;
  const n = Number(candidates[0].str);
  return n >= 1 && n <= 12 ? n : null;
}

/** pdfjs の TextContent items から献立を組み立てる */
export function parseJoyLunchTextItems(
  rawItems: Array<{ str?: string; transform?: number[]; width?: number }>,
  options?: { year?: number; month?: number }
): JoyLunchParseResult {
  const warnings: string[] = [];
  const items: TextItem[] = rawItems
    .filter((it) => typeof it.str === "string" && it.str.trim() && it.transform)
    .map((it) => ({
      str: String(it.str).trim(),
      x: it.transform![4],
      y: it.transform![5],
    }));

  const dayItems = dedupeDays(
    items.filter((i) => isDayLabel(i.str) && i.x > 180 && i.y > 100)
  );

  if (dayItems.length === 0) {
    return {
      days: [],
      detectedMonth: detectMonth(items),
      warnings: [
        "日付セルが見つかりませんでした。文字付きの月間カレンダーPDFか確認してください。",
      ],
    };
  }

  const nutItems = items
    .map((i) => ({ item: i, nut: parseNutrition(i.str) }))
    .filter((x): x is { item: TextItem; nut: NonNullable<ReturnType<typeof parseNutrition>> } =>
      Boolean(x.nut)
    );

  const days: JoyLunchDayDraft[] = [];

  for (const dayItem of dayItems) {
    const day = Number(dayItem.str);
    const cellTexts = items.filter(
      (i) =>
        Math.abs(i.x - dayItem.x) < 55 &&
        i.y < dayItem.y - 8 &&
        i.y > dayItem.y - 85
    );

    const name = pickDishNames(cellTexts);
    const nearbyNut = nutItems
      .filter(
        (n) =>
          Math.abs(n.item.x - dayItem.x) < 45 &&
          n.item.y < dayItem.y - 10 &&
          n.item.y > dayItem.y - 100
      )
      .sort(
        (a, b) =>
          Math.abs(a.item.x - dayItem.x) - Math.abs(b.item.x - dayItem.x)
      )[0];

    if (!nearbyNut) {
      warnings.push(`${day}日: 栄養情報が読めませんでした`);
      if (name) {
        days.push({ day, name, calories: 0, protein: 0, fat: 0 });
      }
      continue;
    }

    if (!name) {
      warnings.push(`${day}日: 献立名が読めませんでした（栄養のみ取得）`);
    }

    days.push({
      day,
      name: name || `ジョイランチ ${day}日`,
      calories: nearbyNut.nut.calories,
      protein: nearbyNut.nut.protein,
      fat: nearbyNut.nut.fat,
    });
  }

  days.sort((a, b) => a.day - b.day);

  const detectedMonth = detectMonth(items);
  if (
    options?.month &&
    detectedMonth &&
    detectedMonth !== options.month
  ) {
    warnings.push(
      `PDF上の月は ${detectedMonth} 月の可能性があります（選択は ${options.month} 月）`
    );
  }

  if (days.length === 0) {
    warnings.push("献立を1件も読み取れませんでした");
  }

  return { days, detectedMonth, warnings };
}

/** PDFファイルを解析する（ブラウザ専用） */
export async function parseJoyLunchPdfFile(
  file: File,
  options: { year: number; month: number }
): Promise<JoyLunchParseResult> {
  const pdfjs = await import("pdfjs-dist");
  // worker は CDN から（無料・追加サーバー不要）
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return parseJoyLunchTextItems(
    content.items as Array<{ str?: string; transform?: number[]; width?: number }>,
    options
  );
}
