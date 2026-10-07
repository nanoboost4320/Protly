"use client";

/**
 * 選択日にジョイランチ献立があるときのワンタップ追加
 * （献立＋ごはん220gをまとめて昼食へ追加）
 */

import {
  getJoyLunchForDate,
  JOY_LUNCH_RICE_AMOUNT_G,
  JOY_LUNCH_RICE_NAME,
  joyLunchDayToFoodItems,
  type JoyLunchDay,
} from "@/lib/joyLunch";
import { DATA_CHANGED_EVENT } from "@/lib/storage";
import type { FoodItem } from "@/lib/types";
import { useEffect, useState } from "react";

interface JoyLunchAddButtonProps {
  date: string;
  lunchItems: FoodItem[];
  onAdd: (foods: FoodItem[]) => void;
}

export default function JoyLunchAddButton({
  date,
  lunchItems,
  onAdd,
}: JoyLunchAddButtonProps) {
  const [menu, setMenu] = useState<JoyLunchDay | null>(null);

  useEffect(() => {
    function refresh() {
      setMenu(getJoyLunchForDate(date));
    }
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [date]);

  if (!menu) return null;

  const alreadyAdded = lunchItems.some(
    (item) => item.name.trim() === menu.name.trim()
  );

  function handleAdd() {
    if (alreadyAdded) {
      const ok = confirm(
        `「${menu!.name}」はすでに昼食にあります。もう一度追加しますか？\n（ごはん${JOY_LUNCH_RICE_AMOUNT_G}gも一緒に追加されます）`
      );
      if (!ok) return;
    }
    onAdd(joyLunchDayToFoodItems(menu!));
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-1 text-xs font-semibold text-amber-800">
        この日のジョイランチ
      </p>
      <p className="mb-1 text-sm font-medium text-slate-800">{menu.name}</p>
      <p className="mb-1 text-xs text-slate-500">
        {menu.calories} kcal · P{menu.protein}g · F{menu.fat}g
        （Cは追加時に自動計算）
      </p>
      <p className="mb-3 text-xs text-slate-500">
        追加時に「{JOY_LUNCH_RICE_NAME}」も一緒に登録します
      </p>
      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
      >
        {alreadyAdded
          ? "もう一度昼食に追加（＋ごはん）"
          : "ジョイランチ＋ごはんを昼食に追加"}
      </button>
    </div>
  );
}
