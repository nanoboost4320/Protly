"use client";

/**
 * 食品追加・編集モーダル
 * - よく使う／最近使った食材からワンタップ入力
 * - 食材名検索 → 栄養素を自動入力
 * - 手動入力も可能
 * - 編集時は既存データを初期表示し、同じIDで更新
 */

import { fillMissingNutrition, generateId } from "@/lib/calculations";
import {
  addFavorite,
  isFavoriteName,
  loadFavorites,
  loadRecentFoods,
  rememberRecent,
  type SavedFood,
} from "@/lib/favorites";
import {
  scaleNutrition,
  searchFoods,
  type FoodTemplate,
} from "@/lib/foodDatabase";
import { MEAL_LABELS, type FoodItem, type MealType } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

interface AddFoodModalProps {
  mealType: MealType;
  /** 渡すと編集モード */
  initialFood?: FoodItem | null;
  onSave: (mealType: MealType, food: FoodItem) => void;
  onClose: () => void;
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
  const [selected, setSelected] = useState<FoodTemplate | null>(null);
  const [savedBase, setSavedBase] = useState<SavedFood | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [favorites, setFavorites] = useState<SavedFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<SavedFood[]>([]);

  const results = useMemo(() => searchFoods(name), [name]);

  useEffect(() => {
    setFavorites(loadFavorites());
    setRecentFoods(loadRecentFoods());
  }, []);

  // 検索で選んだ食材 + 量 が変わったら自動計算
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

  function selectFood(food: FoodTemplate) {
    setSelected(food);
    setSavedBase(null);
    setName(food.name);
    setAmount(String(food.baseAmount));
    setUnit(food.unit);
    setShowResults(false);
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
    setSaveAsFavorite(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    setSelected(null);
    setSavedBase(null);
    setShowResults(true);
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

    // 4項目のうち1つだけ空欄なら、残り3つから自動補完（入力済みは上書きしない）
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
        rememberRecent(food, { silent: true });
      } else {
        rememberRecent(food);
      }
    } else if (saveAsFavorite) {
      addFavorite(food);
    }

    onSave(mealType, food);
    onClose();
  }

  const alreadyFavorite = name.trim() ? isFavoriteName(name) : false;

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

        {!isEdit && (favorites.length > 0 || recentFoods.length > 0) && (
          <div className="mb-4 space-y-3">
            {favorites.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">
                  よく使う
                </p>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((food) => (
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
            {recentFoods.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">
                  最近使った
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => selectSaved(food)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
                    >
                      <span className="font-medium">{food.name}</span>
                      <span className="ml-1 text-slate-400">
                        {food.amount}
                        {food.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              placeholder="例: 鶏むね肉（入力すると候補が出ます）"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              autoComplete="off"
            />

            {showResults && name.trim() && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => selectFood(food)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50"
                    >
                      <span className="font-medium">{food.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {food.baseAmount}
                        {food.unit}あたり: {food.calories}kcal P{food.protein}g
                        F{food.fat}g C{food.carbs}g
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showResults && name.trim() && results.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                候補なし。下で栄養素を手動入力できます。
              </p>
            )}
          </div>

          {selected && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              「{selected.name}」を選択中。量を変えると自動計算されます。
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
              栄養素（検索で自動入力 / 手動でもOK）
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
