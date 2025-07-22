import React, { useState } from 'react';
import { Place } from '../../types';

interface Props {
  saved: boolean;
  savedPlace?: Place;
  isMobile: boolean;
  updatePlace: (id: string, update: Partial<Place>) => void;
}

export default function MemoEditor({ saved, savedPlace, isMobile, updatePlace }: Props) {
  const [editing, setEditing] = useState(false);

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
              updatePlace(savedPlace.id, { memo: e.target.value });
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
              updatePlace(savedPlace.id, { memo: e.target.value });
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
