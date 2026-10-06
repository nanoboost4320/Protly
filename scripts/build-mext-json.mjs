/**
 * 文部科学省「日本食品標準成分表（八訂）増補2023年」Excel から
 * Protly 用のコンパクト JSON を生成するスクリプト。
 *
 * 使い方:
 *   1. 文科省ページから「第2章（データ）」Excel を data/mext-raw.xlsx に保存
 *      https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html
 *   2. npm install xlsx --no-save
 *   3. node scripts/build-mext-json.mjs
 *
 * 生成物: data/mext-foods.json（リポジトリに同梱）
 * 注意: 二次利用時は出典「日本食品標準成分表（八訂）増補2023年から引用」を明示すること
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const ROOT = path.join(__dirname, "..");
const INPUT = path.join(ROOT, "data", "mext-raw.xlsx");
const OUTPUT = path.join(ROOT, "data", "mext-foods.json");

function parseNum(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  let s = String(v).trim();
  if (!s || s === "-" || s === "―" || s === "－" || /^Tr$/i.test(s)) return null;
  s = s.replace(/[()（）]/g, "").replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanName(name) {
  return String(name)
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

if (!fs.existsSync(INPUT)) {
  console.error("見つかりません:", INPUT);
  console.error(
    "文科省の第2章 Excel を data/mext-raw.xlsx として保存してください。"
  );
  process.exit(1);
}

const wb = XLSX.readFile(INPUT);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["表全体"], {
  header: 1,
  defval: null,
});

const foods = [];
for (let i = 12; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const id = r[1] != null ? String(r[1]).trim() : "";
  const nameRaw = r[3];
  if (!id || nameRaw == null || String(nameRaw).trim() === "") continue;

  const calories = parseNum(r[6]);
  const protein = parseNum(r[9]);
  const fat = parseNum(r[12]);
  const carbs = parseNum(r[20]);
  if (calories == null && protein == null && fat == null && carbs == null) {
    continue;
  }

  foods.push({
    id,
    name: cleanName(nameRaw),
    baseAmount: 100,
    unit: "g",
    calories: calories ?? 0,
    protein: protein ?? 0,
    fat: fat ?? 0,
    carbs: carbs ?? 0,
  });
}

const out = {
  source: "日本食品標準成分表（八訂）増補2023年",
  sourceUrl: "https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html",
  attribution: "日本食品標準成分表（八訂）増補2023年から引用",
  note: "可食部100gあたり。推定値（括弧付き）は括弧を外して採用。Trace(-)は0扱い。",
  count: foods.length,
  foods,
};

fs.writeFileSync(OUTPUT, JSON.stringify(out));
console.log(`Wrote ${foods.length} foods -> ${OUTPUT}`);
