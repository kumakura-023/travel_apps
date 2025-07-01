import React from 'react';
import { PlaceCategory } from '../types';
import { getCategoryDisplayName } from '../utils/categoryIcons';

interface Props {
  selected: PlaceCategory[];
  onChange: (categories: PlaceCategory[]) => void;
}

// 利用可能カテゴリ一覧
const ALL_CATEGORIES: PlaceCategory[] = [
  'hotel',
  'restaurant',
  'sightseeing',
  'shopping',
  'transport',
  'other',
];

/**
 * CategoryFilter – 複数選択可能なカテゴリフィルター
 * 単一責任: UI と選択状態の伝達のみ
 */
export default function CategoryFilter({ selected, onChange }: Props) {
  const toggle = (cat: PlaceCategory) => {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_CATEGORIES.map((cat) => {
        const active = selected.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-3 py-1 rounded-full border text-sm transition-all ${
              active
                ? 'bg-blue-500 text-white border-blue-500 shadow-elevation-1'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {getCategoryDisplayName(cat)}
          </button>
        );
      })}
    </div>
  );
} 