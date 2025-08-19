import React from "react";
import { FiX } from "react-icons/fi";

interface PlaceDetailHeaderProps {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  bottomSheet?: any;
  handleClosePanel: () => void;
}

export default function PlaceDetailHeader({
  isMobile,
  bottomSheet,
  handleClosePanel,
}: PlaceDetailHeaderProps) {
  if (!isMobile) {
    return null; // デスクトップ/タブレットではヘッダーなし
  }

  return (
    <div
      ref={bottomSheet?.bindHandleRef}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      onClick={bottomSheet?.handleToggle}
      onKeyDown={(e) => {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          bottomSheet?.handleToggle();
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          bottomSheet?.expand();
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          bottomSheet?.collapse();
        }
      }}
      className="flex justify-between items-center pt-2 pb-1 px-4 flex-shrink-0 
                 touch-none cursor-grab active:cursor-grabbing focus:outline-none"
    >
      <div className="w-8"></div> {/* スペーサー */}
      <div className="w-10 h-1 bg-system-secondary-label/40 rounded-full" />
      <button
        onClick={handleClosePanel}
        className="w-8 h-8 flex items-center justify-center 
                   text-system-secondary-label hover:text-coral-500
                   transition-colors duration-150"
        title="閉じる"
      >
        <FiX size={20} />
      </button>
    </div>
  );
}
