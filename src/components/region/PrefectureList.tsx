import React, { useState, useMemo } from "react";
import type { Prefecture } from "../../types/region";
import prefecturesData from "../../data/regions/prefectures.json";

interface RegionGroup {
  id: string;
  label: string;
  prefectureCodes: string[];
}

interface PrefectureListProps {
  onSelect: (prefecture: Prefecture) => void;
  regions: RegionGroup[];
  activeRegionId: string;
  onRegionChange: (regionId: string) => void;
  selectedPrefectureCode?: string;
}

const PrefectureList: React.FC<PrefectureListProps> = ({
  onSelect,
  regions,
  activeRegionId,
  onRegionChange,
  selectedPrefectureCode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const imagePool = [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  ];

  const getImageForPrefecture = (code: string) => {
    const index = Number.parseInt(code, 10) % imagePool.length;
    return imagePool[index];
  };

  const prefectures: Prefecture[] = prefecturesData.prefectures;
  const activeRegion = regions.find((region) => region.id === activeRegionId);
  const regionPrefectureCodes = activeRegion?.prefectureCodes ?? [];
  const regionPrefectureCount = regionPrefectureCodes.length;

  const filteredPrefectures = useMemo(() => {
    const regionScoped = prefectures.filter((p) =>
      regionPrefectureCodes.length
        ? regionPrefectureCodes.includes(p.code)
        : true,
    );
    if (!searchQuery.trim()) {
      return regionScoped;
    }
    const query = searchQuery.toLowerCase().trim();
    return regionScoped.filter(
      (p) => p.name.includes(query) || p.nameEn.toLowerCase().includes(query),
    );
  }, [prefectures, searchQuery, regionPrefectureCodes]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pb-2">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {regions.map((region) => {
            const isActive = region.id === activeRegionId;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => onRegionChange(region.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm border
                  ${
                    isActive
                      ? "bg-coral-500 text-white border-transparent shadow-md"
                      : "bg-white text-system-secondary-label border-white/80 hover:text-system-label"
                  }`}
              >
                {region.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-4">
        <h3 className="text-xl font-semibold text-system-label">
          Destinations in {activeRegion?.label ?? "Japan"}
        </h3>
        <p className="text-sm text-system-secondary-label mt-1">
          Explore {regionPrefectureCount} prefectures in this region
        </p>
      </div>

      <div className="px-5 pb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prefecture"
            className="w-full px-4 py-3 pl-11 bg-white rounded-full text-system-label placeholder:text-system-tertiary-label focus:outline-none focus:ring-2 focus:ring-coral-500/40 shadow-sm"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-system-tertiary-label"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredPrefectures.length === 0 ? (
          <div className="px-4 py-8 text-center text-system-secondary-label">
            No prefectures found
          </div>
        ) : (
          <div
            role="listbox"
            aria-label="都道府県一覧"
            className="grid grid-cols-2 gap-4 px-5 pb-8"
          >
            {filteredPrefectures.map((prefecture) => (
              <button
                key={prefecture.code}
                type="button"
                onClick={() => onSelect(prefecture)}
                className={`group relative overflow-hidden text-left transition-all duration-200 ease-ios-out active:scale-[0.98] rounded-2xl border-2
                  ${
                    selectedPrefectureCode === prefecture.code
                      ? "border-coral-500 shadow-lg"
                      : "border-transparent shadow-sm hover:shadow-md"
                  }`}
                role="option"
                aria-selected={selectedPrefectureCode === prefecture.code}
              >
                <div className="relative aspect-[3/4]">
                  <img
                    src={getImageForPrefecture(prefecture.code)}
                    alt={prefecture.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="block text-white text-lg font-semibold drop-shadow-sm">
                      {prefecture.name}
                    </span>
                    <span className="text-white/80 text-[10px] uppercase tracking-widest">
                      {prefecture.nameEn}
                    </span>
                  </div>

                  {selectedPrefectureCode === prefecture.code && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-coral-500 text-white flex items-center justify-center shadow-md">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrefectureList;
