"use client";

/**
 * 食品追加・編集モーダル
 * - よく使う／一度入力した食材からワンタップ入力
 * - 食品名を確定すると候補は閉じる
 * - 手動入力も可能
 * - 編集時は既存データを初期表示し、同じIDで更新
 */

import {
  fillMissingNutrition,
  formatGrams,
  generateId,
  round1,
} from "@/lib/calculations";
import {
  addFavorite,
  isFavoriteName,
  loadFavorites,
  rememberMyFood,
  searchMyFoods,
  sortByLastUsed,
  type SavedFood,
} from "@/lib/favorites";
import { MEAL_LABELS, type FoodItem, type MealType } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

interface AddFoodModalProps {
  mealType: MealType;
  /** 渡すと編集モード */
  initialFood?: FoodItem | null;
  onSave: (mealType: MealType, food: FoodItem) => void;
  onClose: () => void;
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
  const [savedBase, setSavedBase] = useState<SavedFood | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [favorites, setFavorites] = useState<SavedFood[]>([]);
  const nameRef = useRef(initialFood?.name ?? "");
  /** 確定済みの食品名。これと同じ間は候補を出さない */
  const confirmedNameRef = useRef<string | null>(initialFood?.name ?? null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const myMatches = useMemo(() => {
    if (isEdit || savedBase) return [];
    return searchMyFoods(name);
  }, [name, isEdit, savedBase]);

  // よく使う／一度入力から選んだ食材は、量を変えると比例計算
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

  function confirmName(value: string) {
    nameRef.current = value;
    confirmedNameRef.current = value;
    setName(value);
    setShowResults(false);
  }

  function selectSaved(food: SavedFood) {
    confirmName(food.name);
    setSavedBase(food);
    setAmount(String(food.amount));
    setUnit(food.unit);
    setCalories(String(Math.round(food.calories)));
    setProtein(formatGrams(food.protein));
    setFat(formatGrams(food.fat));
    setCarbs(formatGrams(food.carbs));
    setSaveAsFavorite(false);
  }

  function handleNameChange(value: string) {
    nameRef.current = value;
    setName(value);
    setSavedBase(null);
    if (value === confirmedNameRef.current) {
      setShowResults(false);
      return;
    }
    confirmedNameRef.current = null;
    setShowResults(true);
  }

  function clearAutoSource() {
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
    !isEdit &&
    showResults &&
    name.trim() !== "" &&
    !savedBase &&
    myMatches.length > 0;
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
              onCompositionEnd={(e) => confirmName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.key === "Process") return;
                if (e.key !== "Enter") return;
                e.preventDefault();
                confirmName(e.currentTarget.value);
                amountInputRef.current?.focus();
              }}
              onBlur={(e) => confirmName(e.currentTarget.value)}
              onFocus={() => {
                if (nameRef.current !== confirmedNameRef.current) {
                  setShowResults(true);
                }
              }}
              placeholder="例: ごはん、鶏むね、木綿豆腐"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              autoComplete="off"
              enterKeyHint="done"
            />

            {showSearchPanel && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-400">
                  自分の食材（よく使う・一度入力したもの）
                </p>

                <ul className="max-h-48 overflow-y-auto">
                    {myMatches.map((food) => (
                      <li key={food.id}>
                        <button
                          type="button"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => selectSaved(food)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50"
                        >
                          <span className="font-medium">{food.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {food.amount}
                            {food.unit}: {Math.round(food.calories)}kcal P
                            {formatGrams(food.protein)}g F
                            {formatGrams(food.fat)}g C
                            {formatGrams(food.carbs)}g
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {savedBase && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              「{savedBase.name}」を呼び出し中。量を変えると比例計算されます。
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">量</label>
              <input
                ref={amountInputRef}
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
                  P{protein ? formatGrams(Number(protein)) : 0} F
                  {fat ? formatGrams(Number(fat)) : 0} C
                  {carbs ? formatGrams(Number(carbs)) : 0}
                </span>
              </p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-1 text-sm font-medium text-slate-600">
              栄養素（自分の食材で自動入力 / 手入力でもOK）
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
