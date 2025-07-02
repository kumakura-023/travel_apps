import React from 'react';
import { PlaceCategory } from '../types';
import { getCategoryDisplayName, getCategoryColor } from '../utils/categoryIcons';

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
        const categoryColor = getCategoryColor(cat);
        
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-4 py-2 rounded-lg border callout font-medium
                       transition-all duration-150 ease-ios-default
                       hover:scale-105 active:scale-95
                       flex items-center space-x-2
                       ${
                         active
                           ? 'text-white border-transparent shadow-elevation-1'
                           : 'bg-system-secondary-background text-system-secondary-label border-system-separator hover:border-opacity-50 hover:text-system-label'
                       }`}
            style={active ? { backgroundColor: categoryColor } : {}}
          >
            <div 
              className={`w-2 h-2 rounded-full ${active ? 'bg-white/30' : ''}`}
              style={!active ? { backgroundColor: categoryColor } : {}}
            />
            <span>{getCategoryDisplayName(cat)}</span>
          </button>
        );
      })}
    </div>
  );
} 