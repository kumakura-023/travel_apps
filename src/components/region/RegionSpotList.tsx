import { useEffect } from "react";
import { MdArrowBack, MdMap, MdClose } from "react-icons/md";
import { useRegionSearchStore } from "../../store/regionSearchStore";
import { useNearbySearch } from "../../hooks/useNearbySearch";
import { useDeviceDetect } from "../../hooks/useDeviceDetect";
import RegionSummaryCard from "./RegionSummaryCard";
import SpotGrid from "./SpotGrid";
import CategoryFilterChips from "./CategoryFilterChips";
import MobileBottomSheet from "../MobileBottomSheet";

export default function RegionSpotList() {
  const {
    isSpotListOpen,
    selectedPrefecture,
    selectedCity,
    isLoading,
    closeSpotList,
  } = useRegionSearchStore();

  const { loadMore, hasMore } = useNearbySearch();
  const { isMobile } = useDeviceDetect();

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSpotList();
      }
    };

    if (isSpotListOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSpotListOpen, closeSpotList]);

  if (!isSpotListOpen) return null;

  const handleLoadMore = () => {
    if (hasMore() && !isLoading) {
      loadMore();
    }
  };

  const title = selectedCity?.name || selectedPrefecture?.name || "";

  // Common content for both views
  const Content = (
    <>
      {selectedCity && (
        <RegionSummaryCard
          city={selectedCity}
          prefecture={selectedPrefecture}
        />
      )}
      <SpotGrid />
      {hasMore() && (
        <div className="flex justify-center py-6 pb-24">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-coral-500 text-white rounded-full
                       hover:bg-coral-600 disabled:opacity-50
                       transition-colors font-medium text-sm
                       shadow-elevation-1 hover:shadow-elevation-2"
          >
            {isLoading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </>
  );

  // Mobile Bottom Sheet View
  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isSpotListOpen}
        onClose={closeSpotList}
        header={
          <div className="px-4 pb-2 w-full">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-system-label truncate flex-1 tracking-tight">
                {title}
              </h1>
              <button
                onClick={closeSpotList}
                className="p-2 -mr-2 text-system-tertiary-label hover:text-system-label 
                           hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                title="閉じる"
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
              <CategoryFilterChips />
            </div>
          </div>
        }
      >
        <div className="p-4 pt-2 min-h-full bg-transparent">{Content}</div>

        {/* FAB: Map View - Float above sheet content */}
        <div className="fixed bottom-6 right-6 z-[110]">
          <button
            onClick={closeSpotList}
            className="w-14 h-14 rounded-full bg-coral-500 text-white
                       shadow-elevation-3 hover:bg-coral-600
                       flex items-center justify-center
                       transition-all hover:scale-105 active:scale-95"
            title="地図で見る"
          >
            <MdMap size={24} />
          </button>
        </div>
      </MobileBottomSheet>
    );
  }

  // Desktop/Tablet View (Original)
  return (
    <div className="fixed inset-0 z-50 bg-system-grouped-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 glass-effect-border border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back Button */}
          <button
            onClick={closeSpotList}
            className="flex items-center gap-2 text-coral-500 
                       hover:text-coral-600 transition-colors"
          >
            <MdArrowBack size={24} />
            <span className="text-sm font-medium">戻る</span>
          </button>

          {/* Title */}
          <h1 className="text-lg font-semibold text-system-label">{title}</h1>

          {/* Map Button */}
          <button
            onClick={closeSpotList}
            className="flex items-center gap-1 text-coral-500 
                       hover:text-coral-600 transition-colors"
          >
            <MdMap size={20} />
            <span className="text-sm font-medium hidden sm:inline">地図</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="border-t border-white/5">
          <CategoryFilterChips />
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-120px)] overflow-y-auto">
        <div className="p-4">{Content}</div>
      </main>

      {/* FAB: Map View */}
      <button
        onClick={closeSpotList}
        className="fixed bottom-6 right-6 z-20
                   w-14 h-14 rounded-full bg-coral-500 text-white
                   shadow-elevation-3 hover:bg-coral-600
                   flex items-center justify-center
                   transition-all hover:scale-105 active:scale-95"
        title="地図で見る"
      >
        <MdMap size={24} />
      </button>
    </div>
  );
}
