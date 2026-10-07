"use client";

/**
 * 食品追加・編集モーダル
 * - よく使う／最近使った食材からワンタップ入力
 * - 名前入力の候補は「自分の食材」優先
 * - 日本食品標準成分表は明示操作時のみ検索
 * - 手動入力も可能
 * - 編集時は既存データを初期表示し、同じIDで更新
 */

import { fillMissingNutrition, generateId } from "@/lib/calculations";
import {
  addFavorite,
  isFavoriteName,
  loadFavorites,
  rememberMyFood,
  searchMyFoods,
  sortByLastUsed,
  type SavedFood,
} from "@/lib/favorites";
import {
  MEXT_ATTRIBUTION,
  scaleNutrition,
  type MextFood,
} from "@/lib/mextConstants";
import { MEAL_LABELS, type FoodItem, type MealType } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

interface AddFoodModalProps {
  mealType: MealType;
  /** 渡すと編集モード */
  initialFood?: FoodItem | null;
  onSave: (mealType: MealType, food: FoodItem) => void;
  onClose: () => void;
}

interface SearchResponse {
  attribution?: string;
  items: MextFood[];
  message?: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function AddFoodModal({
  mealType,
  initialFood = null,
  onSave,
  onClose,
}: AddFoodModalProps) {
  const isEdit = Boolean(initialFood);

  const [name, setName] = useState(initialFood?.name ?? "");
  const [amount, setAmount] = useState(
    initialFood ? String(initialFood.amount) : "100"
  );
  const [unit, setUnit] = useState(initialFood?.unit ?? "g");
  const [calories, setCalories] = useState(
    initialFood ? String(initialFood.calories) : ""
  );
  const [protein, setProtein] = useState(
    initialFood ? String(initialFood.protein) : ""
  );
  const [fat, setFat] = useState(initialFood ? String(initialFood.fat) : "");
  const [carbs, setCarbs] = useState(
    initialFood ? String(initialFood.carbs) : ""
  );
  const [selected, setSelected] = useState<MextFood | null>(null);
  const [savedBase, setSavedBase] = useState<SavedFood | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [favorites, setFavorites] = useState<SavedFood[]>([]);
  /** 成分表検索を開いているか（明示操作時のみ） */
  const [mextOpen, setMextOpen] = useState(false);
  const [mextResults, setMextResults] = useState<MextFood[]>([]);
  const [mextSearching, setMextSearching] = useState(false);
  const [mextError, setMextError] = useState<string | null>(null);
  const [attribution, setAttribution] = useState(MEXT_ATTRIBUTION);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // 自分の食材候補（入力のたびに即時）
  const myMatches = useMemo(() => {
    if (isEdit || selected || savedBase) return [];
    return searchMyFoods(name);
  }, [name, isEdit, selected, savedBase]);

  // 成分表検索は「成分表から探す」を開いているときだけ
  useEffect(() => {
    if (isEdit || !mextOpen) {
      setMextResults([]);
      setMextSearching(false);
      setMextError(null);
      return;
    }

    const q = name.trim();
    if (!q || selected) {
      setMextResults([]);
      setMextSearching(false);
      setMextError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setMextSearching(true);
      setMextError(null);
      try {
        const res = await fetch(
          `/api/nutrition-search?q=${encodeURIComponent(q)}`
        );
        const data = (await res.json()) as SearchResponse;
        if (!res.ok) {
          setMextResults([]);
          setMextError(data.message ?? "検索に失敗しました");
          return;
        }
        if (data.attribution) setAttribution(data.attribution);
        setMextResults(data.items ?? []);
      } catch {
        setMextResults([]);
        setMextError("検索に失敗しました。通信を確認してください。");
      } finally {
        setMextSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [name, selected, isEdit, mextOpen]);

  // 成分表で選んだ食材 + 量 が変わったら自動計算
  useEffect(() => {
    if (!selected) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    const scaled = scaleNutrition(selected, amt);
    setCalories(String(scaled.calories));
    setProtein(String(scaled.protein));
    setFat(String(scaled.fat));
    setCarbs(String(scaled.carbs));
  }, [selected, amount]);

  // よく使う／最近から選んだ食材は、量を変えると比例計算
  useEffect(() => {
    if (!savedBase || savedBase.amount <= 0) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    const ratio = amt / savedBase.amount;
    setCalories(String(Math.round(savedBase.calories * ratio)));
    setProtein(String(round1(savedBase.protein * ratio)));
    setFat(String(round1(savedBase.fat * ratio)));
    setCarbs(String(round1(savedBase.carbs * ratio)));
  }, [savedBase, amount]);

  function selectFood(food: MextFood) {
    setSelected(food);
    setSavedBase(null);
    setName(food.name);
    setAmount(String(food.baseAmount));
    setUnit(food.unit);
    setShowResults(false);
    setMextOpen(false);
    setMextResults([]);
    setSaveAsFavorite(false);
  }

  function selectSaved(food: SavedFood) {
    setSelected(null);
    setSavedBase(food);
    setName(food.name);
    setAmount(String(food.amount));
    setUnit(food.unit);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setFat(String(food.fat));
    setCarbs(String(food.carbs));
    setShowResults(false);
    setMextOpen(false);
    setMextResults([]);
    setSaveAsFavorite(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    setSelected(null);
    setSavedBase(null);
    setShowResults(true);
    // 名前を打ち直したら成分表パネルは閉じる（自分の候補を優先）
    setMextOpen(false);
  }

  function clearAutoSource() {
    setSelected(null);
    setSavedBase(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("食品名を入力してください");
      return;
    }

    const filled = fillMissingNutrition({
      calories,
      protein,
      fat,
      carbs,
    });

    const food: FoodItem = {
      id: initialFood?.id ?? generateId(),
      name: name.trim(),
      amount: Number(amount) || 0,
      unit,
      calories: filled.calories,
      protein: filled.protein,
      fat: filled.fat,
      carbs: filled.carbs,
    };

    if (!isEdit) {
      if (saveAsFavorite) {
        addFavorite(food);
      } else {
        rememberMyFood(food);
      }
    } else if (saveAsFavorite) {
      addFavorite(food);
    } else {
      // 編集保存でも自分の食材庫を更新（同名があれば上書き）
      rememberMyFood(food, { silent: true });
    }

    onSave(mealType, food);
    onClose();
  }

  const alreadyFavorite = name.trim() ? isFavoriteName(name) : false;
  const showSearchPanel =
    !isEdit && showResults && name.trim() && !selected && !savedBase;
  const sortedFavorites = useMemo(
    () => [...favorites].sort(sortByLastUsed),
    [favorites]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit
              ? `${MEAL_LABELS[mealType]}の食品を編集`
              : `${MEAL_LABELS[mealType]}に食品を追加`}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {!isEdit && sortedFavorites.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-slate-500">
              よく使う
            </p>
            <div className="flex flex-wrap gap-2">
              {sortedFavorites.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => selectSaved(food)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                >
                  <span className="font-medium">{food.name}</span>
                  <span className="ml-1 text-emerald-600/80">
                    {food.amount}
                    {food.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="mb-1 block text-sm font-medium">食品名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowResults(true)}
              placeholder="例: ごはん、鶏むね、木綿豆腐"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              autoComplete="off"
            />

            {showSearchPanel && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-400">
                  自分の食材（よく使う・一度入力したもの）
                </p>

                {myMatches.length > 0 ? (
                  <ul className="max-h-48 overflow-y-auto">
                    {myMatches.map((food) => (
                      <li key={food.id}>
                        <button
                          type="button"
                          onClick={() => selectSaved(food)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50"
                        >
                          <span className="font-medium">{food.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {food.amount}
                            {food.unit}: {food.calories}kcal P{food.protein}g F
                            {food.fat}g C{food.carbs}g
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-400">
                    自分の登録にありません。下で手入力するか、成分表から探せます。
                  </p>
                )}

                {!mextOpen ? (
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => setMextOpen(true)}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      成分表から探す…
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-50 px-3 py-1.5">
                      <p className="text-[11px] leading-snug text-slate-400">
                        {attribution}（可食部100gあたり）
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMextOpen(false);
                          setMextResults([]);
                          setMextError(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        閉じる
                      </button>
                    </div>
                    {mextSearching && (
                      <p className="px-4 py-3 text-sm text-slate-400">
                        検索中...
                      </p>
                    )}
                    {!mextSearching && mextError && (
                      <p className="px-4 py-3 text-sm text-red-500">
                        {mextError}
                      </p>
                    )}
                    {!mextSearching &&
                      !mextError &&
                      mextResults.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400">
                          成分表に候補がありません。下で栄養素を手動入力できます。
                        </p>
                      )}
                    {!mextSearching && mextResults.length > 0 && (
                      <ul className="max-h-40 overflow-y-auto">
                        {mextResults.map((food) => (
                          <li key={food.id}>
                            <button
                              type="button"
                              onClick={() => selectFood(food)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="font-medium">{food.name}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {food.baseAmount}
                                {food.unit}あたり: {food.calories}kcal P
                                {food.protein}g F{food.fat}g C{food.carbs}g
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              「{selected.name}」を選択中。量を変えると自動計算されます。
              <p className="mt-1 text-xs text-emerald-700/80">{attribution}</p>
            </div>
          )}

          {savedBase && !selected && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              「{savedBase.name}」を呼び出し中。量を変えると比例計算されます。
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">量</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120"
                min="0"
                step="any"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">単位</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="個">個</option>
                <option value="本">本</option>
                <option value="杯">杯</option>
                <option value="食">食</option>
                <option value="パック">パック</option>
              </select>
            </div>
          </div>

          {(calories || protein) && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 font-medium text-slate-600">計算結果</p>
              <p>
                <span className="text-lg font-bold">{calories || 0}</span> kcal
                <span className="ml-3 text-slate-500">
                  P{protein || 0} F{fat || 0} C{carbs || 0}
                </span>
              </p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-1 text-sm font-medium text-slate-600">
              栄養素（自分の食材／成分表で自動入力 / 手動でもOK）
            </p>
            <p className="mb-3 text-xs text-slate-400">
              カロリー・P・F・Cのうち1つだけ空欄なら、保存時に自動計算します
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  カロリー (kcal)
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => {
                    setCalories(e.target.value);
                    clearAutoSource();
                  }}
                  step="any"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  タンパク質 (g)
                </label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => {
                    setProtein(e.target.value);
                    clearAutoSource();
                  }}
                  step="any"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  脂質 (g)
                </label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => {
                    setFat(e.target.value);
                    clearAutoSource();
                  }}
                  step="any"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  炭水化物 (g)
                </label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => {
                    setCarbs(e.target.value);
                    clearAutoSource();
                  }}
                  step="any"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={saveAsFavorite}
              onChange={(e) => setSaveAsFavorite(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">よく使う食材に登録</span>
              {alreadyFavorite && !saveAsFavorite && (
                <span className="mt-0.5 block text-xs text-slate-400">
                  すでに登録済み（チェックすると内容を更新）
                </span>
              )}
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {isEdit ? "保存する" : "追加する"}
          </button>
        </form>
      </div>
    </div>
  );
}
