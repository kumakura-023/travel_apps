import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useUIStore } from "../store/uiStore";
import useMediaQuery from "../hooks/useMediaQuery";

export default function TabNavigationToggle() {
  const { isTabNavigationVisible, toggleTabNavigation } = useUIStore();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // デスクトップでは表示しない（TabNavigationは常に表示）
  if (isDesktop) return null;

  return (
    <button
      onClick={toggleTabNavigation}
      className="w-12 h-12 glass-effect-border rounded-full 
                 flex items-center justify-center
                 transition-all duration-300 ease-ios-default
                 hover:scale-105 active:scale-95
                 text-system-secondary-label hover:text-coral-500
                 shadow-elevation-1"
      title={
        isTabNavigationVisible
          ? "ナビゲーションを非表示"
          : "ナビゲーションを表示"
      }
    >
      {/* 表示状態によってアイコンを切り替え */}
      {isTabNavigationVisible ? (
        <MdChevronRight
          size={24}
          className="transition-transform duration-300"
        />
      ) : (
        <MdChevronLeft
          size={24}
          className="transition-transform duration-300"
        />
      )}
    </button>
  );
}
