import React, { useState, useCallback, useRef } from 'react';
import { Place } from '../../types';
import { SyncOperationType } from '../../types/SyncTypes';

interface Props {
  saved: boolean;
  savedPlace?: Place;
  isMobile: boolean;
  updatePlace: (id: string, update: Partial<Place>) => void;
  onMemoChange?: (id: string, memo: string, operationType: SyncOperationType) => void;
}

export default function MemoEditor({ saved, savedPlace, isMobile, updatePlace, onMemoChange }: Props) {
  const [editing, setEditing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<string>('');

  // デバウンス付きメモ更新関数
  const debouncedMemoUpdate = useCallback((id: string, memo: string) => {
    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      if (import.meta.env.DEV) {
        console.log(`📝 メモエディター: タイマークリア`, new Date().toLocaleTimeString());
      }
    }

    // 即座にローカル状態を更新（UI応答性維持）
    updatePlace(id, { memo });

    // 値が変更された場合のみデバウンス処理を実行
    if (memo !== lastValueRef.current) {
      lastValueRef.current = memo;
      
      if (import.meta.env.DEV) {
        console.log(`📝 メモエディター: デバウンス設定 (300ms)`, new Date().toLocaleTimeString());
      }
      
      // デバウンスタイマーを設定（300ms後に同期実行）
      debounceTimerRef.current = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log(`📝 メモエディター: 同期実行`, new Date().toLocaleTimeString());
        }
        if (onMemoChange) {
          onMemoChange(id, memo, 'memo_updated');
        }
      }, 300);
    }
  }, [updatePlace, onMemoChange]);

  // コンポーネントアンマウント時にタイマーをクリア
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
              debouncedMemoUpdate(savedPlace.id, e.target.value);
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
              debouncedMemoUpdate(savedPlace.id, e.target.value);
            }
          }}
          onBlur={() => setEditing(false)}
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
