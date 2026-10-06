import { NextResponse } from "next/server";
import {
  MEXT_ATTRIBUTION,
  MEXT_FOOD_COUNT,
  MEXT_SOURCE,
  MEXT_SOURCE_URL,
  searchMextFoods,
} from "@/lib/mextSearch";

/**
 * GET /api/nutrition-search?q=にら
 * 同梱の日本食品標準成分表 JSON をサーバー側で検索する
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      {
        source: MEXT_SOURCE,
        sourceUrl: MEXT_SOURCE_URL,
        attribution: MEXT_ATTRIBUTION,
        totalFoods: MEXT_FOOD_COUNT,
        items: [],
        message: "検索語を入力してください",
      },
      { status: 400 }
    );
  }

  const items = searchMextFoods(q, 12);

  return NextResponse.json({
    source: MEXT_SOURCE,
    sourceUrl: MEXT_SOURCE_URL,
    attribution: MEXT_ATTRIBUTION,
    totalFoods: MEXT_FOOD_COUNT,
    query: q,
    items,
  });
}
