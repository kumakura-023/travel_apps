import { useRegionSearchStore } from "../../store/regionSearchStore";

/**
 * カテゴリ定義
 * key は Google Places API の type と一致
 */
const CATEGORIES = [
  { key: null, label: "すべて", icon: "🌟" },
  { key: "tourist_attraction", label: "観光", icon: "🏛️" },
  { key: "restaurant", label: "飲食", icon: "🍽️" },
  { key: "cafe", label: "カフェ", icon: "☕" },
  { key: "shopping_mall", label: "買物", icon: "🛍️" },
  { key: "lodging", label: "宿泊", icon: "🏨" },
  { key: "museum", label: "博物館", icon: "🖼️" },
  { key: "park", label: "公園", icon: "🌳" },
] as const;

/**
 * カテゴリフィルターチップ
 * 横スクロール可能なチップ群でスポット検索のカテゴリ絞り込みを提供
 */
export default function CategoryFilterChips() {
  const { selectedCategory, setCategory } = useRegionSearchStore();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {CATEGORIES.map(({ key, label, icon }) => {
        const isSelected = selectedCategory === key;

        return (
          <button
            key={key ?? "all"}
            onClick={() => setCategory(key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              whitespace-nowrap text-sm font-medium
              transition-all duration-150 flex-shrink-0
              ${
                isSelected
                  ? "bg-coral-500 text-white shadow-sm"
                  : "bg-black/5 dark:bg-white/10 text-system-secondary-label hover:bg-black/10 dark:hover:bg-white/20"
              }
            `}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
