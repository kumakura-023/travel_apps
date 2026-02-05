import { useEffect, useMemo, useRef, useState } from "react";
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
    openModal,
    spots,
  } = useRegionSearchStore();

  const { loadMore, hasMore } = useNearbySearch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

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

  // Scroll handler for parallax
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
      });
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isSpotListOpen]);

  if (!isSpotListOpen) return null;

  const handleLoadMore = () => {
    if (hasMore() && !isLoading) {
      loadMore();
    }
  };

  const handleBackToCitySelect = () => {
    closeSpotList();
    openModal();
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

  // Parallax & Transition Values
  const heroHeight = "44vh";
  const minHeroHeight = "340px";
  const parallaxTranslateY = scrollTop * 0.5;
  const textOpacity = Math.max(0, 1 - scrollTop / 250);
  const textTranslateY = scrollTop * 0.2;
  const isScrolledPastHeader = scrollTop > 280;

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F7F4] font-system">
      {/* 1. BACKGROUND PARALLAX LAYER (Fixed) */}
      <div
        className="absolute top-0 left-0 w-full overflow-hidden z-0 bg-slate-900"
        style={{ height: heroHeight, minHeight: minHeroHeight }}
      >
        <div
          className="w-full h-full relative will-change-transform"
          style={{ transform: `translate3d(0, ${parallaxTranslateY}px, 0)` }}
        >
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={title}
              className="absolute inset-0 w-full h-[110%] object-cover opacity-90 transition-opacity duration-700"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Hero Text Content (Fades out on scroll) */}
        <div
          className="absolute bottom-0 left-0 w-full px-6 pb-20 z-10 text-white will-change-transform"
          style={{
            opacity: textOpacity,
            transform: `translate3d(0, ${textTranslateY}px, 0)`,
          }}
        >
          <div className="flex items-center gap-2 text-xs mb-3 font-medium tracking-wide">
            <span className="bg-coral-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg shadow-coral-500/20">
              Japan
            </span>
            {rating && (
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                <span className="text-yellow-300 text-[10px] transform scale-110">
                  ★
                </span>
                <span className="font-semibold">{rating.toFixed(1)}</span>
                {reviews && (
                  <span className="text-white/70 text-[10px]">
                    ({reviews.toLocaleString()})
                  </span>
                )}
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight tracking-tight drop-shadow-sm">
            {title}
          </h1>

          {(subtitle || title) && (
            <div className="flex items-center gap-2 text-sm md:text-base text-white/80 mt-3 font-light">
              <MdPlace size={18} className="text-white/60" />
              <span>{subtitle || title}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SCROLLABLE FOREGROUND LAYER */}
      <div
        ref={scrollRef}
        className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden custom-scrollbar scroll-smooth"
      >
        {/* Spacer for Parallax Header */}
        <div
          className="w-full pointer-events-none"
          style={{ height: heroHeight, minHeight: minHeroHeight }}
        />

        {/* Content Sheet */}
        <div className="relative -mt-6 bg-[#F9F7F4] rounded-t-[32px] shadow-elevation-5 min-h-screen">
          {/* Handle bar for visual cue */}
          <div className="w-full flex justify-center pt-3 pb-1 opacity-50">
            <div className="w-12 h-1.5 rounded-full bg-slate-300/50" />
          </div>

          <div className="pt-4 pb-32">
            <CategoryFilterChips className="pb-6 px-5" />
            <SpotGrid />

            {hasMore() && (
              <div className="flex justify-center py-12 px-5">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-8 py-3 bg-white text-coral-600 border border-coral-200 rounded-full
                             hover:bg-coral-50 disabled:opacity-50
                             transition-all active:scale-95 font-semibold text-sm shadow-elevation-2"
                >
                  {isLoading ? "読み込み中..." : "さらに読み込む"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. FIXED HEADER UI (Back Button, etc) */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${
          isScrolledPastHeader
            ? "bg-white/90 backdrop-blur-md shadow-sm py-2 border-b border-gray-100/50"
            : "py-4 bg-transparent"
        }`}
      >
        <div className="px-4 flex items-center justify-between pointer-events-auto">
          <button
            onClick={handleBackToCitySelect}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              isScrolledPastHeader
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                : "bg-black/20 backdrop-blur-md text-white hover:bg-black/30 border border-white/10"
            }`}
            aria-label="戻る"
          >
            <MdArrowBack size={20} />
          </button>

          {/* Title appears in header when scrolled past */}
          <span
            className={`font-semibold text-gray-800 transition-opacity duration-300 ${
              isScrolledPastHeader ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </span>

          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              isScrolledPastHeader
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                : "bg-black/20 backdrop-blur-md text-white hover:bg-black/30 border border-white/10"
            }`}
            aria-label="共有"
          >
            <MdShare size={18} />
          </button>
        </div>
      </div>

      {/* Floating Action Button (Bottom Right) */}
      <div className="fixed bottom-8 right-6 z-50">
        <button
          onClick={handleBackToCitySelect}
          className="px-6 py-3.5 rounded-full bg-coral-500 text-white
                     shadow-coral-glow hover:bg-coral-600 hover:scale-105
                     flex items-center gap-2 text-sm font-semibold
                     transition-all duration-300 active:scale-95"
        >
          <MdArrowBack size={18} />
          <span>地域選択へ</span>
        </button>
      </div>
    </div>
  );
}
