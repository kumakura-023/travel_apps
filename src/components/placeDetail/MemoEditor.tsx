import React, { useState, useCallback, useRef } from 'react';
import { Place } from '../../types';
import { SyncOperationType } from '../../types/SyncTypes';

interface Props {
  saved: boolean;
  savedPlace?: Place;
  isMobile: boolean;
  updatePlace: (id: string, update: Partial<Place>) => void;
  onMemoChange?: (id: string, memo: string, operationType: SyncOperationType, isEditing?: boolean) => void;
}

export default function MemoEditor({ saved, savedPlace, isMobile, updatePlace, onMemoChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const lastSavedValueRef = useRef<string>(savedPlace?.memo || '');

  // メモの値が変更された時の処理（同期なし、ローカル更新のみ）
  const handleMemoChange = useCallback((id: string, memo: string) => {
    // 即座にローカル状態を更新（UI応答性維持）
    updatePlace(id, { memo });
  }, [updatePlace]);

  // メモ編集が完了した時の処理（フォーカスアウト時）
  const handleMemoBlur = useCallback((id: string, memo: string) => {
    setIsEditing(false);
    
    // 値が実際に変更された場合のみ同期を実行
    if (memo !== lastSavedValueRef.current && onMemoChange) {
      if (import.meta.env.DEV) {
        console.log(`📝 メモエディター: 編集完了、同期実行`, {
          oldValue: lastSavedValueRef.current,
          newValue: memo,
          timestamp: new Date().toLocaleTimeString()
        });
      }
      lastSavedValueRef.current = memo;
      onMemoChange(id, memo, 'memo_updated', false);
    } else if (onMemoChange) {
      // 値が変更されていなくても編集終了を通知
      onMemoChange(id, memo, 'memo_updated', false);
    }
  }, [onMemoChange]);

  // 編集開始時の処理
  const handleEditStart = useCallback(() => {
    setIsEditing(true);
    if (import.meta.env.DEV) {
      console.log(`📝 メモエディター: 編集開始`, new Date().toLocaleTimeString());
    }
  }, []);

  // savedPlaceが変更された時に最後の保存値を更新
  React.useEffect(() => {
    lastSavedValueRef.current = savedPlace?.memo || '';
  }, [savedPlace?.memo]);

  if (!saved) return null;

  return (
    <div className="glass-effect rounded-xl p-4">
      <h3 className="headline font-semibold text-system-label mb-2">メモ</h3>
      {isMobile ? (
        <textarea
          className="w-full h-24 p-2 border rounded bg-white/50 dark:bg-black/20 border-system-separator/50 focus:ring-2 focus:ring-coral-500 transition-all duration-150"
          value={savedPlace?.memo || ''}
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
          className="w-full h-24 p-2 border rounded bg-white/50 dark:bg-black/20 border-system-separator/50 focus:ring-2 focus:ring-coral-500 transition-all duration-150"
          value={savedPlace?.memo || ''}
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
          className="w-full min-h-[6rem] h-auto p-2 rounded cursor-pointer group"
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }}
          title="ダブルクリックして編集"
        >
          <p className="body text-system-secondary-label leading-relaxed whitespace-pre-wrap group-hover:text-system-label transition-colors duration-150">
            {savedPlace?.memo ? (
              savedPlace.memo
            ) : (
              <span className="text-system-tertiary-label group-hover:text-system-secondary-label">ダブルクリックしてメモを編集</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
