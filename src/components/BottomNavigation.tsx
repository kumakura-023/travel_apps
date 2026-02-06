import {
  MdMap,
  MdAccessTime,
  MdList,
  MdEditNote,
  MdFilterList,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { useLabelModeStore } from "../store/labelModeStore";
import { useUIStore } from "../store/uiStore";

export type TabKey = "map" | "travelTime" | "list";

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  isVisible: boolean;
}

const tabs: { key: TabKey; icon: IconType; label: string }[] = [
  { key: "map", icon: MdMap, label: "地図" },
  { key: "travelTime", icon: MdAccessTime, label: "移動時間" },
  { key: "list", icon: MdList, label: "リスト" },
];

const BottomNavigation: React.FC<Props> = ({ active, onChange, isVisible }) => {
  const { labelMode, toggleLabelMode } = useLabelModeStore();
  const { selectedCategories, openCategoryFilterModal } = useUIStore();

  const hasActiveFilters = selectedCategories.length > 0;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 
                     bg-white/82 backdrop-blur-xl backdrop-saturate-150
                     border-t border-gray-200/40
                     shadow-[0_-2px_14px_rgba(0,0,0,0.06)]
                     pb-[max(env(safe-area-inset-bottom),2px)]
                     transition-all duration-300 cubic-bezier(0.32, 0.72, 0, 1)
                     ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
    >
      <div className="flex items-center justify-between gap-1 px-1.5 h-[48px]">
        {/* Main navigation tabs */}
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 h-full rounded-xl outline-none touch-manipulation transition-colors"
              onClick={() => onChange(tab.key)}
            >
              <div
                className={`relative flex items-center justify-center w-9 h-6 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-coral-500 text-white shadow-sm"
                    : "bg-transparent text-gray-400 group-hover:bg-gray-50 group-active:scale-95"
                }`}
              >
                <Icon size={18} />
              </div>
              <span
                className={`text-[9px] leading-none font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? "text-coral-600" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Label Mode Button */}
        <button
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 h-full rounded-xl outline-none touch-manipulation"
          onClick={toggleLabelMode}
          title={labelMode ? "メモ配置を終了" : "メモを追加"}
        >
          <div
            className={`relative flex items-center justify-center w-9 h-6 rounded-full transition-all duration-200 ${
              labelMode
                ? "bg-teal-500 text-white shadow-teal-500/25 shadow-sm"
                : "bg-transparent text-gray-400 group-hover:text-teal-600 group-hover:bg-teal-50"
            }`}
          >
            <MdEditNote size={18} />
          </div>
          <span
            className={`text-[9px] leading-none font-medium tracking-wide transition-colors duration-200 ${
              labelMode ? "text-teal-600" : "text-gray-400"
            }`}
          >
            {labelMode ? "配置中" : "メモ"}
          </span>
        </button>

        {/* Filter Button */}
        <button
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 h-full rounded-xl outline-none touch-manipulation"
          onClick={openCategoryFilterModal}
          title="カテゴリフィルター"
        >
          <div
            className={`relative flex items-center justify-center w-9 h-6 rounded-full transition-all duration-200 ${
              hasActiveFilters
                ? "bg-coral-500 text-white shadow-coral-500/25 shadow-sm"
                : "bg-transparent text-gray-400 group-hover:text-coral-600 group-hover:bg-coral-50"
            }`}
          >
            <MdFilterList size={18} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-2 ring-white">
                <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
              </span>
            )}
          </div>
          <span
            className={`text-[9px] leading-none font-medium tracking-wide transition-colors duration-200 ${
              hasActiveFilters ? "text-coral-600" : "text-gray-400"
            }`}
          >
            フィルター
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
