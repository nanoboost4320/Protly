/**
 * ジョイランチ月間カレンダーPDFの解析
 *
 * 方針:
 * - PDF内の日付数字はフォント都合で位置がずれることがある
 * - 代わりに「年月ラベル + 曜日ヘッダ列 + 週の行」から日付を決める
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
  detectedYear: number | null;
  detectedMonth: number | null;
  warnings: string[];
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

const NOISE_RE =
  /月決め|注文|容器|協力|原油|おすすめ|土曜日|ライス|山形県|お願い|変更|回収|電子レンジ|タバコ|食材の入手|プラスチック|入荷|傷み|ジョイランチから|お召し上がり|衛生|事業所|カレンダー|収穫|さつまいも|ビタミン|食物繊維|便秘|善玉|でんぷん|^今月の$/;

const NUT_RE =
  /●\s*(\d+(?:\.\d+)?)\s*kcal\s*●\s*タンパク(?:質)?\s*(\d+(?:\.\d+)?)\s*g\s*●\s*脂(?:質)?\s*(\d+(?:\.\d+)?)\s*g/i;

const WEEKDAY_MARKERS: Array<{ key: string; index: number }> = [
  { key: "MON", index: 0 },
  { key: "TUE", index: 1 },
  { key: "WED", index: 2 },
  { key: "THU", index: 3 },
  { key: "FRI", index: 4 },
  { key: "月", index: 0 },
  { key: "火", index: 1 },
  { key: "水", index: 2 },
  { key: "木", index: 3 },
  { key: "金", index: 4 },
];

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

function detectYearMonth(items: TextItem[]): {
  year: number | null;
  month: number | null;
} {
  let year: number | null = null;
  let month: number | null = null;

  for (const item of items) {
    const ym = item.str.match(/(20\d{2})\s*年/);
    if (ym) year = Number(ym[1]);
  }

  // 「10」「月」が近くにある（ロゴ横の月表示）
  const monthGlyphs = items.filter((i) => i.str === "月" && i.x < 120 && i.y > 480);
  const tens = items.filter(
    (i) => /^(1[0-2]|[1-9])$/.test(i.str) && i.x < 80 && i.y > 480
  );
  if (monthGlyphs.length > 0 && tens.length > 0) {
    month = Number(tens[0].str);
  }

  return { year, month };
}

function detectColumnCenters(items: TextItem[]): number[] | null {
  const centers: Array<number | null> = [null, null, null, null, null];

  for (const marker of WEEKDAY_MARKERS) {
    if (centers[marker.index] != null) continue;
    // ヘッダ帯（上部）だけ見る。本文中の「月」などを除外
    const hits = items.filter(
      (i) => i.str === marker.key && i.y > 540 && i.x > 200
    );
    if (hits.length === 0) continue;
    const avg = hits.reduce((s, h) => s + h.x, 0) / hits.length;
    centers[marker.index] = avg;
  }

  if (centers.some((c) => c == null)) return null;
  return centers as number[];
}

function nearestColumn(x: number, centers: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(centers[i] - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function clusterRowYs(ys: number[], gap = 40): number[] {
  const sorted = [...ys].sort((a, b) => b - a);
  const rows: number[] = [];
  for (const y of sorted) {
    if (rows.some((r) => Math.abs(r - y) < gap)) continue;
    rows.push(y);
  }
  return rows.sort((a, b) => b - a);
}

function nearestRow(y: number, rows: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const d = Math.abs(rows[i] - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function pickDishNames(cellItems: TextItem[]): string {
  const byY = new Map<number, string>();
  for (const item of cellItems) {
    if (parseNutrition(item.str)) continue;
    if (/^\d{1,2}$/.test(item.str)) continue;
    if (item.str.length < 2) continue;
    if (NOISE_RE.test(item.str)) continue;
    if (/^\d+(\.\d+)?g?$/.test(item.str)) continue;
    if (/^(MON|TUE|WED|THU|FRI|月|火|水|木|金)$/.test(item.str)) continue;

    const key = Math.round(item.y / 6) * 6;
    const prev = byY.get(key);
    if (!prev || item.str.length > prev.length) {
      byY.set(key, item.str);
    }
  }

  const names = [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, name]) => name)
    .filter((name, idx, arr) => {
      return !arr.some(
        (other, j) =>
          j !== idx && other.includes(name) && other.length > name.length
      );
    })
    .slice(0, 3);

  return names.join(" / ");
}

/** 指定年月の月曜始まりカレンダー（月〜金）の日付グリッド */
function buildWeekdayGrid(
  year: number,
  month: number
): Array<Array<number | null>> {
  const first = new Date(year, month - 1, 1);
  const firstWd = first.getDay(); // 0=日
  // その月を含む週の月曜日
  const start = new Date(year, month - 1, 1);
  const toMonday = firstWd === 0 ? -6 : 1 - firstWd;
  start.setDate(1 + toMonday);

  const grid: Array<Array<number | null>> = [];
  const cursor = new Date(start);
  for (let week = 0; week < 6; week++) {
    const row: Array<number | null> = [];
    for (let col = 0; col < 5; col++) {
      const inMonth =
        cursor.getFullYear() === year && cursor.getMonth() === month - 1;
      row.push(inMonth ? cursor.getDate() : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    // 土日をスキップして次の月曜へ
    cursor.setDate(cursor.getDate() + 2);
    if (row.some((d) => d != null)) grid.push(row);
    // 翌月に入って月曜始まりの空週なら終了
    if (cursor.getMonth() !== month - 1 && cursor.getDay() === 1) {
      const stillIn = grid.some((r) => r.some((d) => d != null));
      if (stillIn && cursor.getMonth() !== month - 1) {
        // 追加の週がすべて null なら不要
        const probe: Array<number | null> = [];
        const p = new Date(cursor);
        for (let col = 0; col < 5; col++) {
          const inMonth =
            p.getFullYear() === year && p.getMonth() === month - 1;
          probe.push(inMonth ? p.getDate() : null);
          p.setDate(p.getDate() + 1);
        }
        if (probe.every((d) => d == null)) break;
      }
    }
  }
  return grid;
}

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

  const detected = detectYearMonth(items);
  // PDF上の年月表記を優先（選択ミスによる日付ずれを防ぐ）
  const year = detected.year ?? options?.year;
  const month = detected.month ?? options?.month;

  if (!year || !month) {
    return {
      days: [],
      detectedYear: detected.year,
      detectedMonth: detected.month,
      warnings: [
        "年月を特定できませんでした。設定で年・月を選んでから再取り込みしてください。",
      ],
    };
  }

  const centers = detectColumnCenters(items);
  if (!centers) {
    return {
      days: [],
      detectedYear: detected.year,
      detectedMonth: detected.month,
      warnings: ["曜日（月〜金）の列を特定できませんでした"],
    };
  }

  // 栄養行は日付数字より信頼できるので、これで週行を決める
  const nutEntries = items
    .map((i) => ({ item: i, nut: parseNutrition(i.str) }))
    .filter(
      (x): x is { item: TextItem; nut: NonNullable<ReturnType<typeof parseNutrition>> } =>
        Boolean(x.nut)
    );

  if (nutEntries.length === 0) {
    return {
      days: [],
      detectedYear: detected.year,
      detectedMonth: detected.month,
      warnings: ["カロリー行（●○○kcal …）が見つかりませんでした"],
    };
  }

  const rowYs = clusterRowYs(
    nutEntries.map((n) => n.item.y),
    50
  );
  const grid = buildWeekdayGrid(year, month);

  // 行数が週数より多い/少ない場合に備える
  const weekCount = Math.min(rowYs.length, grid.length);
  if (rowYs.length !== grid.length) {
    warnings.push(
      `週の行数（PDF:${rowYs.length} / カレンダー:${grid.length}）が一致しません。内容を確認してください。`
    );
  }

  const colWidth =
    (centers[centers.length - 1] - centers[0]) / (centers.length - 1);
  const halfW = colWidth * 0.55;

  const days: JoyLunchDayDraft[] = [];
  const used = new Set<number>();

  for (let week = 0; week < weekCount; week++) {
    for (let col = 0; col < 5; col++) {
      const dayNum = grid[week][col];
      if (dayNum == null) continue;

      const cx = centers[col];
      const cy = rowYs[week];

      const nearbyNut = nutEntries
        .filter(
          (n) =>
            nearestColumn(n.item.x, centers) === col &&
            nearestRow(n.item.y, rowYs) === week
        )
        .sort(
          (a, b) =>
            Math.abs(a.item.x - cx) +
            Math.abs(a.item.y - cy) -
            (Math.abs(b.item.x - cx) + Math.abs(b.item.y - cy))
        )[0];

      if (!nearbyNut) {
        warnings.push(`${dayNum}日: 栄養情報が見つかりませんでした`);
        continue;
      }

      const cellTexts = items.filter((i) => {
        if (Math.abs(i.x - cx) > halfW) return false;
        // 栄養行より上、週ヘッダより下くらい
        return i.y < cy + 85 && i.y > cy - 15;
      });

      const name = pickDishNames(cellTexts);
      if (!name) {
        warnings.push(`${dayNum}日: 献立名が読めませんでした（栄養のみ）`);
      }

      if (used.has(dayNum)) continue;
      used.add(dayNum);

      days.push({
        day: dayNum,
        name: name || `ジョイランチ ${dayNum}日`,
        calories: nearbyNut.nut.calories,
        protein: nearbyNut.nut.protein,
        fat: nearbyNut.nut.fat,
      });
    }
  }

  days.sort((a, b) => a.day - b.day);

  if (
    options?.month &&
    detected.month &&
    detected.month !== options.month
  ) {
    warnings.push(
      `PDF表記は ${detected.month} 月の可能性があります（選択は ${options.month} 月）`
    );
  }

  if (days.length === 0) {
    warnings.push("献立を1件も読み取れませんでした");
  }

  return {
    days,
    detectedYear: detected.year,
    detectedMonth: detected.month,
    warnings,
  };
}

/** PDFファイルを解析する（ブラウザ専用） */
export async function parseJoyLunchPdfFile(
  file: File,
  options: { year: number; month: number }
): Promise<JoyLunchParseResult> {
  const pdfjs = await import("pdfjs-dist");
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
