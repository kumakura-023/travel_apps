import {
  MdCameraAlt,
  MdLocalCafe,
  MdMuseum,
  MdPark,
  MdRestaurant,
  MdShoppingBag,
  MdStar,
  MdHotel,
} from "react-icons/md";
import { useRegionSearchStore } from "../../store/regionSearchStore";

/**
 * カテゴリ定義
 * key は Google Places API の type と一致
 */
const CATEGORIES = [
  { key: null, label: "すべて", icon: MdStar },
  { key: "tourist_attraction", label: "観光", icon: MdCameraAlt },
  { key: "restaurant", label: "飲食", icon: MdRestaurant },
  { key: "cafe", label: "カフェ", icon: MdLocalCafe },
  { key: "shopping_mall", label: "買物", icon: MdShoppingBag },
  { key: "lodging", label: "宿泊", icon: MdHotel },
  { key: "museum", label: "博物館", icon: MdMuseum },
  { key: "park", label: "公園", icon: MdPark },
] as const;

/**
 * カテゴリフィルターチップ
 * 横スクロール可能なチップ群でスポット検索のカテゴリ絞り込みを提供
 */
interface CategoryFilterChipsProps {
  className?: string;
}

export default function CategoryFilterChips({
  className = "",
}: CategoryFilterChipsProps) {
  const { selectedCategory, setCategory } = useRegionSearchStore();

  return (
    <div className={`flex gap-3 overflow-x-auto scrollbar-hide ${className}`}>
      {CATEGORIES.map(({ key, label, icon: Icon }) => {
        const isSelected = selectedCategory === key;

        return (
          <button
            key={key ?? "all"}
            onClick={() => setCategory(key)}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-full
              whitespace-nowrap text-sm font-semibold
              transition-all duration-150 flex-shrink-0 border shadow-sm
              ${
                isSelected
                  ? "bg-coral-500 text-white border-transparent shadow-md"
                  : "bg-white text-system-secondary-label border-white/80 hover:text-system-label"
              }
            `}
          >
            <Icon className="text-base" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
