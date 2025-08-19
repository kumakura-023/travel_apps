import React from "react";
import { PlaceCategory } from "../types";
import {
  getCategoryDisplayName,
  getCategoryColor,
} from "../utils/categoryIcons";
import { useUIStore } from "../store/uiStore";

const ALL_CATEGORIES: PlaceCategory[] = [
  "hotel",
  "restaurant",
  "sightseeing",
  "shopping",
  "transport",
  "other",
];

interface CategoryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryFilterModal: React.FC<CategoryFilterModalProps> = ({
  isOpen,
  onClose,
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed top-1/2 right-40 transform -translate-y-1/2 z-[1000] animate-modal-slide-up">
      <div
        className="bg-system-background rounded-xl shadow-elevation-3 border border-system-separator
                   w-72 max-h-[40vh] overflow-hidden"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-end p-2">
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-system-quaternary-background
                       hover:bg-system-tertiary-background
                       flex items-center justify-center transition-colors"
          >
            <span className="text-system-secondary-label font-medium text-sm">
              ×
            </span>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-3 pb-3 space-y-2">
          {/* 操作ボタン */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-system-secondary-label">
              表示するカテゴリを選択
            </p>
            <button
              onClick={isAllSelected ? selectAll : clearAll}
              className="px-2 py-1 rounded-md bg-coral-500/10 
                         text-coral-500 hover:bg-coral-500/20 
                         transition-colors text-xs font-medium"
            >
              {isAllSelected ? "全選択" : "クリア"}
            </button>
          </div>

          {/* カテゴリ選択 */}
          <div className="grid grid-cols-3 gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              const categoryColor = getCategoryColor(cat);

              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`p-2 rounded-lg border text-xs font-medium
                             transition-all duration-150 ease-ios-default
                             hover:scale-105 active:scale-95
                             flex flex-col items-center space-y-1 min-w-0 min-h-[60px]
                             shadow-sm hover:shadow-md
                             ${
                               active
                                 ? "text-white border-transparent shadow-md"
                                 : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50"
                             }`}
                  style={active ? { backgroundColor: categoryColor } : {}}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${active ? "bg-white/20" : ""}`}
                    style={
                      !active
                        ? {
                            backgroundColor: categoryColor + "20",
                            border: `1px solid ${categoryColor}`,
                          }
                        : {}
                    }
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${active ? "bg-white" : ""}`}
                      style={!active ? { backgroundColor: categoryColor } : {}}
                    />
                  </div>
                  <span className="text-center leading-tight text-xs font-medium">
                    {getCategoryDisplayName(cat)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* フィルター状態表示 */}
          <div className="pt-1">
            <p className="text-xs text-center text-system-tertiary-label">
              {selectedCategories.length === 0
                ? "全カテゴリを表示中"
                : `${selectedCategories.length}個でフィルタリング中`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilterModal;
