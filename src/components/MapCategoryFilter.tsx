import React from 'react';
import { PlaceCategory } from '../types';
import { getCategoryDisplayName, getCategoryColor } from '../utils/categoryIcons';
import { useUIStore } from '../store/uiStore';

const ALL_CATEGORIES: PlaceCategory[] = [
  'hotel',
  'restaurant',
  'sightseeing',
  'shopping',
  'transport',
  'other',
];

export default function MapCategoryFilter() {
  const { selectedCategories, setSelectedCategories } = useUIStore();

  const toggle = (cat: PlaceCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const isAllSelected = selectedCategories.length === 0;
  const clearAll = () => setSelectedCategories([]);
  const selectAll = () => setSelectedCategories([...ALL_CATEGORIES]);

  return (
    <div className="glass-effect rounded-xl p-3 shadow-elevation-1 backdrop-blur-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-system-label">カテゴリフィルター</span>
        <button
          onClick={isAllSelected ? selectAll : clearAll}
          className="text-xs px-2 py-1 rounded-md bg-system-quaternary-background text-system-secondary-label
                     hover:bg-system-tertiary-background transition-colors"
        >
          {isAllSelected ? '全選択' : 'クリア'}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map((cat) => {
          const active = selectedCategories.includes(cat);
          const categoryColor = getCategoryColor(cat);
          
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium
                         transition-all duration-150 ease-ios-default
                         hover:scale-105 active:scale-95
                         flex items-center space-x-1.5 min-w-0 flex-shrink-0
                         ${
                           active
                             ? 'text-white border-transparent shadow-sm'
                             : 'bg-system-secondary-background text-system-secondary-label border-system-separator hover:border-opacity-50 hover:text-system-label'
                         }`}
              style={active ? { backgroundColor: categoryColor } : {}}
            >
              <div 
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white/40' : ''}`}
                style={!active ? { backgroundColor: categoryColor } : {}}
              />
              <span className="truncate">{getCategoryDisplayName(cat)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}