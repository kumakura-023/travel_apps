import React, { useState, useMemo } from "react";
import { Place, MapLabel } from "../types";
import {
  getCategoryDisplayName,
  getCategoryColor,
} from "../utils/categoryIcons";
import { formatCurrency } from "../utils/formatCurrency";
import { useSavedPlacesStore } from "../store/savedPlacesStore";
import { useLabelsStore } from "../store/labelsStore";
import DaySelector from "./DaySelector";

interface Props {
  place: Place;
  showLinkedMemos?: boolean;
}

/** 単一Placeのカード表示 + 費用・日程編集 */
export default function PlaceListItem({
  place,
  showLinkedMemos = true,
}: Props) {
  const updatePlace = useSavedPlacesStore((s) => s.updatePlace);
  const { labels, addLabel, updateLabel, deleteLabel } = useLabelsStore();
  const [editing, setEditing] = useState(false);
  const [editingDay, setEditingDay] = useState(false);
  const [tempCost, setTempCost] = useState(place.estimatedCost);
  const [tempDay, setTempDay] = useState(place.scheduledDay);
  const [showMemoPanel, setShowMemoPanel] = useState(false);
  const [newMemoText, setNewMemoText] = useState("");

  // この候補地にリンクされたメモを取得
  const linkedMemos = useMemo(
    () => labels.filter((label) => label.linkedPlaceId === place.id),
    [labels, place.id],
  );

  const saveCost = () => {
    updatePlace(place.id, { estimatedCost: tempCost });
    setEditing(false);
  };

  const saveDay = () => {
    updatePlace(place.id, { scheduledDay: tempDay });
    setEditingDay(false);
  };

  const createLinkedMemo = () => {
    if (newMemoText.trim()) {
      addLabel({
        text: newMemoText.trim(),
        position: place.coordinates,
        linkedPlaceId: place.id,
      });
      setNewMemoText("");
      setShowMemoPanel(false);
    }
  };

  const unlinkMemo = (memoId: string) => {
    updateLabel(memoId, { linkedPlaceId: undefined });
  };

  const deleteMemo = (memoId: string) => {
    if (confirm("このメモを削除しますか？")) {
      deleteLabel(memoId);
    }
  };

  const categoryColor = getCategoryColor(place.category);

  return (
    <div className="card-interactive p-4 space-y-3">
      {/* ヘッダー部分 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <h3
              className="headline text-system-label truncate"
              title={place.name}
            >
              {place.name}
            </h3>
          </div>
          <p className="subheadline text-system-secondary-label mb-1">
            {getCategoryDisplayName(place.category)}
          </p>
          {place.address && (
            <p className="footnote text-system-tertiary-label truncate">
              {place.address}
            </p>
          )}
        </div>

        {/* 日程・費用表示・編集部分 */}
        <div className="flex-shrink-0 space-y-2">
          {/* 日程表示・編集 */}
          <div>
            {editingDay ? (
              <div className="flex items-center space-x-2">
                <DaySelector
                  selectedDay={tempDay}
                  onDayChange={setTempDay}
                  className="min-w-0"
                />
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={saveDay}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs 
                               font-medium transition-all duration-150 ease-ios-default
                               hover:bg-blue-600 active:scale-95"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setEditingDay(false);
                      setTempDay(place.scheduledDay);
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs
                               font-medium transition-all duration-150 ease-ios-default
                               hover:bg-gray-300 active:scale-95"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200
                           rounded-lg text-sm font-medium transition-all duration-150 ease-ios-default
                           hover:bg-blue-100 active:scale-95"
                onClick={() => setEditingDay(true)}
                title="日程を編集"
              >
                {place.scheduledDay
                  ? `${place.scheduledDay}日目`
                  : "日程未設定"}
              </button>
            )}
          </div>

          {/* 費用表示・編集 */}
          <div>
            {editing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  className="input w-24 text-right text-sm"
                  value={tempCost}
                  onChange={(e) => setTempCost(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <button
                  onClick={saveCost}
                  className="px-3 py-1 bg-coral-500 text-white rounded-lg 
                             callout font-medium transition-all duration-150 ease-ios-default
                             hover:bg-coral-600 active:scale-95"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setTempCost(place.estimatedCost);
                  }}
                  className="px-3 py-1 bg-system-secondary-background text-system-secondary-label 
                             rounded-lg callout font-medium transition-all duration-150 ease-ios-default
                             hover:bg-system-tertiary-label/10 active:scale-95"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                className="px-4 py-2 bg-system-secondary-background text-system-label
                           rounded-lg callout font-medium transition-all duration-150 ease-ios-default
                           hover:bg-coral-500/10 hover:text-coral-600 active:scale-95
                           border border-system-separator hover:border-coral-500/30"
                onClick={() => setEditing(true)}
                title="費用を編集"
              >
                {formatCurrency(place.estimatedCost)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* メモ部分 */}
      <div className="space-y-2">
        {/* 候補地自身のメモ */}
        {place.memo && (
          <div className="bg-system-secondary-background rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="caption-1 text-system-tertiary-label font-medium">
                候補地メモ
              </span>
            </div>
            <p className="footnote text-system-secondary-label whitespace-pre-wrap line-clamp-3">
              {place.memo}
            </p>
          </div>
        )}

        {/* リンクされたメモ */}
        {showLinkedMemos && linkedMemos.length > 0 && (
          <div className="space-y-2">
            {linkedMemos.map((memo) => (
              <div
                key={memo.id}
                className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-1 text-teal-600 font-medium flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                    リンクメモ
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => unlinkMemo(memo.id)}
                      className="caption-2 text-orange-500 hover:text-orange-600 px-1"
                      title="リンクを解除"
                    >
                      解除
                    </button>
                    <button
                      onClick={() => deleteMemo(memo.id)}
                      className="caption-2 text-red-500 hover:text-red-600 px-1"
                      title="メモを削除"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <p className="footnote text-system-secondary-label whitespace-pre-wrap line-clamp-2">
                  {memo.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* メモ追加パネル */}
        {showMemoPanel ? (
          <div className="bg-coral-500/5 border border-coral-500/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="caption-1 text-coral-600 font-medium">
                新しいメモを追加
              </span>
              <button
                onClick={() => setShowMemoPanel(false)}
                className="caption-2 text-gray-500 hover:text-gray-600"
              >
                キャンセル
              </button>
            </div>
            <textarea
              value={newMemoText}
              onChange={(e) => setNewMemoText(e.target.value)}
              placeholder="この候補地に関するメモを入力..."
              className="w-full p-2 text-sm border border-system-separator rounded-lg 
                         bg-system-background text-system-label resize-none
                         focus:outline-none focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500"
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={createLinkedMemo}
                disabled={!newMemoText.trim()}
                className="px-3 py-1.5 bg-coral-500 text-white rounded-lg text-sm font-medium
                           transition-all duration-150 ease-ios-default
                           hover:bg-coral-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        ) : (
          /* メモ追加ボタン */
          <button
            onClick={() => setShowMemoPanel(true)}
            className="w-full p-2 border-2 border-dashed border-system-separator rounded-lg
                       text-system-secondary-label hover:text-coral-500 hover:border-coral-500/50
                       transition-all duration-150 ease-ios-default flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="caption-1 font-medium">メモを追加</span>
          </button>
        )}
      </div>

      {/* 追加情報 */}
      <div className="flex items-center justify-between pt-2 border-t border-system-separator">
        <span className="caption-1 text-system-tertiary-label">
          追加日: {place.createdAt.toLocaleDateString("ja-JP")}
        </span>
        <div className="flex items-center space-x-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <span className="caption-1 text-system-secondary-label">
            {getCategoryDisplayName(place.category)}
          </span>
        </div>
      </div>
    </div>
  );
}
