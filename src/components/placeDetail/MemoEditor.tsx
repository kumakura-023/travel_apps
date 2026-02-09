import React, { useState, useCallback, useRef } from "react";
import { Place } from "../../types";
import { SyncOperationType } from "../../types/SyncTypes";
import { FiTrash2, FiMaximize2, FiMinimize2 } from "react-icons/fi";

interface Props {
  saved: boolean;
  savedPlace?: Place;
  isMobile: boolean;
  updatePlace: (id: string, update: Partial<Place>) => void;
  onMemoChange?: (
    id: string,
    memo: string,
    operationType: SyncOperationType,
    isEditing?: boolean,
  ) => void;
}

export default function MemoEditor({
  saved,
  savedPlace,
  isMobile,
  updatePlace,
  onMemoChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [memoValue, setMemoValue] = useState(savedPlace?.memo || "");
  const lastSavedValueRef = useRef<string>(savedPlace?.memo || "");

  // メモの値が変更された時の処理（同期なし、ローカル更新のみ）
  const handleMemoChange = useCallback(
    (id: string, memo: string) => {
      // 即座にローカル状態を更新（UI応答性維持）
      setMemoValue(memo);
      updatePlace(id, { memo });
    },
    [updatePlace],
  );

  // メモ編集が完了した時の処理（フォーカスアウト時）
  const handleMemoBlur = useCallback(
    (id: string, memo: string) => {
      // 値が実際に変更された場合のみ同期を実行
      if (memo !== lastSavedValueRef.current && onMemoChange) {
        if (import.meta.env.DEV) {
          console.log(`📝 メモエディター: 編集完了、同期実行`, {
            oldValue: lastSavedValueRef.current,
            newValue: memo,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        lastSavedValueRef.current = memo;
        onMemoChange(id, memo, "memo_updated", false);
      } else if (onMemoChange) {
        // 値が変更されていなくても編集終了を通知
        onMemoChange(id, memo, "memo_updated", false);
      }
    },
    [onMemoChange],
  );

  // 編集開始時の処理
  const handleEditStart = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log(
        `📝 メモエディター: 編集開始`,
        new Date().toLocaleTimeString(),
      );
    }
  }, []);

  // savedPlaceが変更された時に最後の保存値を更新
  React.useEffect(() => {
    const memo = savedPlace?.memo || "";
    lastSavedValueRef.current = memo;
    setMemoValue(memo);
  }, [savedPlace?.memo]);

  if (!saved) return null;

  return (
    <div className="glass-effect rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="headline font-semibold text-system-label">メモ</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-system-gray-6 rounded-lg transition-colors duration-150"
            style={{ minWidth: "32px", minHeight: "32px" }}
            aria-label={isExpanded ? "縮小" : "拡大"}
          >
            {isExpanded ? (
              <FiMinimize2 className="w-3 h-3" />
            ) : (
              <FiMaximize2 className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => {
              if (savedPlace) {
                setMemoValue("");
                updatePlace(savedPlace.id, { memo: "" });
                if (onMemoChange) {
                  onMemoChange(savedPlace.id, "", "memo_updated", false);
                }
              }
            }}
            className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-150"
            style={{ minWidth: "32px", minHeight: "32px" }}
            aria-label="メモを削除"
          >
            <FiTrash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {isMobile ? (
        <textarea
          className={`w-full ${isExpanded ? "h-48" : "h-24"} p-2 border rounded bg-white/50 dark:bg-black/20 border-system-separator/50 focus:ring-2 focus:ring-coral-500 transition-all duration-150`}
          value={memoValue}
          onChange={(e) => {
            if (savedPlace) {
              handleMemoChange(savedPlace.id, e.target.value);
            }
          }}
          onFocus={handleEditStart}
          onBlur={(e) => {
            if (savedPlace) {
              handleMemoBlur(savedPlace.id, e.target.value);
            }
          }}
          placeholder="メモを追加"
        />
      ) : editing ? (
        <textarea
          className={`w-full ${isExpanded ? "h-48" : "h-24"} p-2 border rounded bg-white/50 dark:bg-black/20 border-system-separator/50 focus:ring-2 focus:ring-coral-500 transition-all duration-150`}
          value={memoValue}
          onChange={(e) => {
            if (savedPlace) {
              handleMemoChange(savedPlace.id, e.target.value);
            }
          }}
          onFocus={handleEditStart}
          onBlur={(e) => {
            setEditing(false);
            if (savedPlace) {
              handleMemoBlur(savedPlace.id, e.target.value);
            }
          }}
          placeholder="メモを追加"
          autoFocus
        />
      ) : (
        <div
          className={`w-full ${isExpanded ? "min-h-[12rem]" : "min-h-[6rem]"} h-auto p-2 rounded cursor-pointer group`}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }}
          title="ダブルクリックして編集"
        >
          <p className="body text-system-secondary-label leading-relaxed whitespace-pre-wrap group-hover:text-system-label transition-colors duration-150">
            {memoValue ? (
              memoValue
            ) : (
              <span className="text-system-tertiary-label group-hover:text-system-secondary-label">
                ダブルクリックしてメモを編集
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
