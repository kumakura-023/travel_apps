import { useEffect, useMemo } from "react";
import { MdArrowBack, MdShare, MdPlace } from "react-icons/md";
import { useRegionSearchStore } from "../../store/regionSearchStore";
import { useNearbySearch } from "../../hooks/useNearbySearch";
import SpotGrid from "./SpotGrid";
import CategoryFilterChips from "./CategoryFilterChips";

export default function RegionSpotList() {
  const {
    isSpotListOpen,
    selectedPrefecture,
    selectedCity,
    isLoading,
    closeSpotList,
    spots,
  } = useRegionSearchStore();

  const { loadMore, hasMore } = useNearbySearch();

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

  const title =
    selectedCity?.nameEn ||
    selectedCity?.name ||
    selectedPrefecture?.nameEn ||
    selectedPrefecture?.name ||
    "";
  const subtitle = selectedCity
    ? selectedPrefecture?.nameEn || selectedPrefecture?.name || ""
    : "";

  const heroImageUrl = useMemo(() => {
    const heroSpot = spots[0];
    if (heroSpot?.photos && heroSpot.photos.length > 0) {
      return heroSpot.photos[0].getUrl({ maxWidth: 1200 });
    }
    return "";
  }, [spots]);

  const rating = spots[0]?.rating;
  const reviews = spots[0]?.user_ratings_total;

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F7F4]">
      <div className="h-full overflow-y-auto">
        <div className="relative h-[38vh] min-h-[280px]">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={closeSpotList}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"
              aria-label="戻る"
            >
              <MdArrowBack size={22} />
            </button>
            <button
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"
              aria-label="共有"
            >
              <MdShare size={20} />
            </button>
          </div>

          <div className="absolute bottom-6 left-5 right-5 text-white">
            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="bg-coral-500 text-white px-2.5 py-1 rounded-full">
                Japan
              </span>
              {rating && (
                <span className="bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="text-yellow-300">★</span>
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                  {reviews && (
                    <span className="text-white/80">
                      ({reviews.toLocaleString()} reviews)
                    </span>
                  )}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
            {(subtitle || title) && (
              <div className="flex items-center gap-2 text-sm text-white/80 mt-2">
                <MdPlace size={16} />
                <span>{subtitle || title}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative -mt-8 rounded-t-[28px] bg-[#F9F7F4] pt-6 pb-28">
          <CategoryFilterChips className="px-5 pb-4" />
          <SpotGrid />

          {hasMore() && (
            <div className="flex justify-center py-8">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-2.5 bg-coral-500 text-white rounded-full
                           hover:bg-coral-600 disabled:opacity-50
                           transition-colors font-medium text-sm shadow-md"
              >
                {isLoading ? "読み込み中..." : "もっと見る"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={closeSpotList}
          className="px-6 py-3.5 rounded-full bg-coral-500 text-white
                     shadow-lg shadow-coral-500/30 hover:bg-coral-600
                     flex items-center gap-2 text-sm font-semibold
                     transition-all active:scale-95"
        >
          Book Guide
        </button>
      </div>
    </div>
  );
}
