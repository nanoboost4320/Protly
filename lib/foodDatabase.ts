/**
 * よく使う食材の栄養素データベース（100g / 1単位あたり）
 * 文部科学省「日本食品標準成分表」を参考にした概算値です。
 */

export interface FoodTemplate {
  id: string;
  name: string;
  aliases: string[]; // 検索用の別名
  baseAmount: number; // 基準量
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const FOOD_DATABASE: FoodTemplate[] = [
  // 主食
  {
    id: "rice-cooked",
    name: "ごはん（白米）",
    aliases: ["ご飯", "白米", "めし", "ライス"],
    baseAmount: 100,
    unit: "g",
    calories: 168,
    protein: 2.5,
    fat: 0.3,
    carbs: 37.1,
  },
  {
    id: "rice-brown",
    name: "玄米ごはん",
    aliases: ["玄米"],
    baseAmount: 100,
    unit: "g",
    calories: 165,
    protein: 2.8,
    fat: 1.0,
    carbs: 35.6,
  },
  {
    id: "bread",
    name: "食パン",
    aliases: ["パン", "しょくぱん"],
    baseAmount: 100,
    unit: "g",
    calories: 264,
    protein: 9.3,
    fat: 4.4,
    carbs: 46.7,
  },
  {
    id: "udon",
    name: "うどん（ゆで）",
    aliases: ["うどん"],
    baseAmount: 100,
    unit: "g",
    calories: 105,
    protein: 2.6,
    fat: 0.4,
    carbs: 21.6,
  },
  {
    id: "soba",
    name: "そば（ゆで）",
    aliases: ["蕎麦"],
    baseAmount: 100,
    unit: "g",
    calories: 114,
    protein: 4.8,
    fat: 0.5,
    carbs: 22.1,
  },
  {
    id: "ramen",
    name: "ラーメン（麺のみ）",
    aliases: ["らーめん", "中華麺"],
    baseAmount: 100,
    unit: "g",
    calories: 149,
    protein: 4.9,
    fat: 0.6,
    carbs: 29.2,
  },
  {
    id: "pasta",
    name: "スパゲッティ（ゆで）",
    aliases: ["パスタ", "スパゲティ"],
    baseAmount: 100,
    unit: "g",
    calories: 149,
    protein: 5.2,
    fat: 0.9,
    carbs: 28.8,
  },
  {
    id: "onigiri",
    name: "おにぎり（塩むすび）",
    aliases: ["おむすび"],
    baseAmount: 1,
    unit: "個",
    calories: 180,
    protein: 3.0,
    fat: 0.4,
    carbs: 40.0,
  },

  // 肉類
  {
    id: "chicken-breast",
    name: "鶏むね肉（皮なし）",
    aliases: ["鶏胸肉", "むね肉", "チキン"],
    baseAmount: 100,
    unit: "g",
    calories: 108,
    protein: 22.3,
    fat: 1.5,
    carbs: 0,
  },
  {
    id: "chicken-thigh",
    name: "鶏もも肉（皮なし）",
    aliases: ["もも肉"],
    baseAmount: 100,
    unit: "g",
    calories: 116,
    protein: 19.0,
    fat: 3.9,
    carbs: 0,
  },
  {
    id: "chicken-thigh-skin",
    name: "鶏もも肉（皮つき）",
    aliases: [],
    baseAmount: 100,
    unit: "g",
    calories: 200,
    protein: 16.2,
    fat: 14.0,
    carbs: 0,
  },
  {
    id: "egg",
    name: "卵（全卵）",
    aliases: ["たまご", "玉子", "鶏卵"],
    baseAmount: 1,
    unit: "個",
    calories: 76,
    protein: 6.2,
    fat: 5.2,
    carbs: 0.2,
  },
  {
    id: "pork-loin",
    name: "豚ロース",
    aliases: ["豚肉", "ロース"],
    baseAmount: 100,
    unit: "g",
    calories: 263,
    protein: 17.1,
    fat: 19.2,
    carbs: 0.2,
  },
  {
    id: "pork-tenderloin",
    name: "豚ヒレ",
    aliases: ["ヒレ肉"],
    baseAmount: 100,
    unit: "g",
    calories: 115,
    protein: 22.2,
    fat: 1.9,
    carbs: 0.2,
  },
  {
    id: "beef-sirloin",
    name: "牛サーロイン",
    aliases: ["牛肉", "ステーキ"],
    baseAmount: 100,
    unit: "g",
    calories: 298,
    protein: 17.4,
    fat: 23.7,
    carbs: 0.3,
  },
  {
    id: "beef-thigh",
    name: "牛もも肉（赤身）",
    aliases: ["牛赤身"],
    baseAmount: 100,
    unit: "g",
    calories: 182,
    protein: 20.5,
    fat: 9.6,
    carbs: 0.4,
  },
  {
    id: "minced-chicken",
    name: "鶏ひき肉",
    aliases: ["ひき肉"],
    baseAmount: 100,
    unit: "g",
    calories: 172,
    protein: 17.5,
    fat: 11.3,
    carbs: 0,
  },
  {
    id: "sausage",
    name: "ウインナー",
    aliases: ["ソーセージ"],
    baseAmount: 100,
    unit: "g",
    calories: 321,
    protein: 13.2,
    fat: 28.5,
    carbs: 2.8,
  },

  // 魚介類
  {
    id: "salmon",
    name: "鮭（生）",
    aliases: ["サーモン", "さけ", "シャケ"],
    baseAmount: 100,
    unit: "g",
    calories: 133,
    protein: 22.3,
    fat: 4.1,
    carbs: 0.1,
  },
  {
    id: "tuna",
    name: "マグロ（赤身）",
    aliases: ["まぐろ", "鮪"],
    baseAmount: 100,
    unit: "g",
    calories: 125,
    protein: 26.4,
    fat: 1.4,
    carbs: 0.1,
  },
  {
    id: "mackerel",
    name: "鯖",
    aliases: ["サバ", "さば"],
    baseAmount: 100,
    unit: "g",
    calories: 202,
    protein: 20.6,
    fat: 12.1,
    carbs: 0.3,
  },
  {
    id: "sardine",
    name: "いわし",
    aliases: ["イワシ"],
    baseAmount: 100,
    unit: "g",
    calories: 169,
    protein: 19.2,
    fat: 9.2,
    carbs: 0.2,
  },
  {
    id: "shrimp",
    name: "エビ（ゆで）",
    aliases: ["海老", "えび"],
    baseAmount: 100,
    unit: "g",
    calories: 91,
    protein: 20.9,
    fat: 0.6,
    carbs: 0.1,
  },
  {
    id: "tofu",
    name: "木綿豆腐",
    aliases: ["豆腐", "とうふ"],
    baseAmount: 100,
    unit: "g",
    calories: 72,
    protein: 6.6,
    fat: 4.2,
    carbs: 1.6,
  },
  {
    id: "natto",
    name: "納豆",
    aliases: ["なっとう"],
    baseAmount: 1,
    unit: "パック",
    calories: 100,
    protein: 8.3,
    fat: 5.0,
    carbs: 6.1,
  },

  // 乳製品・プロテイン
  {
    id: "milk",
    name: "牛乳",
    aliases: ["ミルク"],
    baseAmount: 100,
    unit: "ml",
    calories: 67,
    protein: 3.3,
    fat: 3.8,
    carbs: 4.8,
  },
  {
    id: "yogurt",
    name: "ヨーグルト（無糖）",
    aliases: ["プレーンヨーグルト"],
    baseAmount: 100,
    unit: "g",
    calories: 62,
    protein: 3.6,
    fat: 3.0,
    carbs: 4.9,
  },
  {
    id: "cheese",
    name: "プロセスチーズ",
    aliases: ["チーズ"],
    baseAmount: 100,
    unit: "g",
    calories: 313,
    protein: 22.7,
    fat: 26.0,
    carbs: 1.3,
  },
  {
    id: "protein-whey",
    name: "ホエイプロテイン",
    aliases: ["プロテイン", "プロテインパウダー"],
    baseAmount: 1,
    unit: "杯",
    calories: 120,
    protein: 24.0,
    fat: 1.5,
    carbs: 2.0,
  },
  {
    id: "greek-yogurt",
    name: "ギリシャヨーグルト",
    aliases: [],
    baseAmount: 100,
    unit: "g",
    calories: 73,
    protein: 9.0,
    fat: 2.5,
    carbs: 3.5,
  },

  // 野菜・果物
  {
    id: "banana",
    name: "バナナ",
    aliases: [],
    baseAmount: 1,
    unit: "本",
    calories: 86,
    protein: 1.1,
    fat: 0.2,
    carbs: 22.5,
  },
  {
    id: "apple",
    name: "りんご",
    aliases: ["リンゴ"],
    baseAmount: 1,
    unit: "個",
    calories: 138,
    protein: 0.5,
    fat: 0.3,
    carbs: 36.0,
  },
  {
    id: "broccoli",
    name: "ブロッコリー（ゆで）",
    aliases: [],
    baseAmount: 100,
    unit: "g",
    calories: 33,
    protein: 3.5,
    fat: 0.4,
    carbs: 5.2,
  },
  {
    id: "cabbage",
    name: "キャベツ",
    aliases: [],
    baseAmount: 100,
    unit: "g",
    calories: 23,
    protein: 1.3,
    fat: 0.2,
    carbs: 5.2,
  },
  {
    id: "potato",
    name: "じゃがいも（ゆで）",
    aliases: ["ジャガイモ", "ポテト"],
    baseAmount: 100,
    unit: "g",
    calories: 78,
    protein: 1.5,
    fat: 0.1,
    carbs: 17.9,
  },
  {
    id: "sweet-potato",
    name: "さつまいも",
    aliases: ["サツマイモ"],
    baseAmount: 100,
    unit: "g",
    calories: 132,
    protein: 1.2,
    fat: 0.2,
    carbs: 31.5,
  },
  {
    id: "avocado",
    name: "アボカド",
    aliases: [],
    baseAmount: 100,
    unit: "g",
    calories: 187,
    protein: 2.5,
    fat: 18.7,
    carbs: 6.2,
  },

  // 定番メニュー・その他
  {
    id: "miso-soup",
    name: "味噌汁",
    aliases: ["みそ汁"],
    baseAmount: 1,
    unit: "杯",
    calories: 35,
    protein: 2.0,
    fat: 1.0,
    carbs: 4.0,
  },
  {
    id: "salad-oil",
    name: "サラダ油",
    aliases: ["油", "オリーブオイル"],
    baseAmount: 10,
    unit: "g",
    calories: 92,
    protein: 0,
    fat: 10.0,
    carbs: 0,
  },
  {
    id: "mayonnaise",
    name: "マヨネーズ",
    aliases: ["マヨ"],
    baseAmount: 10,
    unit: "g",
    calories: 73,
    protein: 0.1,
    fat: 7.9,
    carbs: 0.2,
  },
  {
    id: "beer",
    name: "ビール",
    aliases: [],
    baseAmount: 350,
    unit: "ml",
    calories: 140,
    protein: 1.1,
    fat: 0,
    carbs: 10.9,
  },
  {
    id: "curry-rice",
    name: "カレーライス",
    aliases: ["カレー"],
    baseAmount: 1,
    unit: "食",
    calories: 750,
    protein: 18.0,
    fat: 20.0,
    carbs: 110.0,
  },
  {
    id: "oyakodon",
    name: "親子丼",
    aliases: [],
    baseAmount: 1,
    unit: "食",
    calories: 650,
    protein: 28.0,
    fat: 18.0,
    carbs: 85.0,
  },
  {
    id: "gyudon",
    name: "牛丼",
    aliases: [],
    baseAmount: 1,
    unit: "食",
    calories: 700,
    protein: 22.0,
    fat: 22.0,
    carbs: 95.0,
  },
  {
    id: "salmon-bento",
    name: "鮭弁当",
    aliases: ["弁当"],
    baseAmount: 1,
    unit: "個",
    calories: 650,
    protein: 25.0,
    fat: 15.0,
    carbs: 90.0,
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

/** 食材名で検索する */
export function searchFoods(query: string, limit = 8): FoodTemplate[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const scored = FOOD_DATABASE.map((food) => {
    const name = normalize(food.name);
    const aliasHit = food.aliases.some((a) => normalize(a).includes(q));
    let score = 0;

    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (aliasHit) score = 50;
    else if (food.aliases.some((a) => normalize(a).startsWith(q))) score = 70;

    return { food, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.food);
}

/** 量に応じて栄養素をスケールする */
export function scaleNutrition(
  food: FoodTemplate,
  amount: number
): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
} {
  const ratio = amount / food.baseAmount;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(food.calories * ratio),
    protein: round1(food.protein * ratio),
    fat: round1(food.fat * ratio),
    carbs: round1(food.carbs * ratio),
  };
}
