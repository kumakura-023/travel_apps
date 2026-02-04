import React, { useState, useMemo, useEffect } from "react";
import type { City } from "../../types/region";

interface CityListProps {
  prefectureCode: string;
  onSelect: (city: City) => void;
}

const prefectureFileMap: Record<string, string> = {
  "01": "hokkaido",
  "13": "tokyo",
  "14": "kanagawa",
  "26": "kyoto",
  "27": "osaka",
  "28": "hyogo",
  "29": "nara",
  "34": "hiroshima",
  "40": "fukuoka",
  "47": "okinawa",
};

const loadCities = async (prefectureCode: string): Promise<City[]> => {
  try {
    const fileName = prefectureFileMap[prefectureCode];
    if (!fileName) {
      return [];
    }

    const module = await import(`../../data/regions/cities/${fileName}.json`);
    return module.default?.cities || module.cities || [];
  } catch (error) {
    console.error("Failed to load cities:", error);
    return [];
  }
};

type CityType = "all" | "ward" | "city" | "town" | "village";

const getCityType = (name: string): CityType => {
  if (name.endsWith("区")) return "ward";
  if (name.endsWith("市")) return "city";
  if (name.endsWith("町")) return "town";
  if (name.endsWith("村")) return "village";
  return "city";
};

const CITY_TYPE_LABELS: Record<CityType, string> = {
  all: "All",
  ward: "Wards",
  city: "Cities",
  town: "Towns",
  village: "Villages",
};

const CityList: React.FC<CityListProps> = ({ prefectureCode, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<CityType>("all");

  useEffect(() => {
    let mounted = true;

    const fetchCities = async () => {
      setIsLoading(true);
      setError(null);
      setActiveType("all");

      const loadedCities = await loadCities(prefectureCode);

      if (mounted) {
        if (loadedCities.length === 0 && prefectureFileMap[prefectureCode]) {
          setError("市区町村データの読み込みに失敗しました");
        } else if (!prefectureFileMap[prefectureCode]) {
          setError("この都道府県のデータは準備中です");
        }
        setCities(loadedCities);
        setIsLoading(false);
      }
    };

    fetchCities();

    return () => {
      mounted = false;
    };
  }, [prefectureCode]);

  const availableTypes = useMemo(() => {
    const counts: Record<CityType, number> = {
      all: cities.length,
      ward: 0,
      city: 0,
      town: 0,
      village: 0,
    };

    cities.forEach((city) => {
      const type = getCityType(city.name);
      counts[type] += 1;
    });

    return (Object.keys(counts) as CityType[]).filter((type) =>
      type === "all" ? true : counts[type] > 0,
    );
  }, [cities]);

  const filteredCities = useMemo(() => {
    const scoped =
      activeType === "all"
        ? cities
        : cities.filter((city) => getCityType(city.name) === activeType);

    if (!searchQuery.trim()) {
      return scoped;
    }
    const query = searchQuery.toLowerCase().trim();
    return scoped.filter(
      (c) => c.name.includes(query) || c.nameEn.toLowerCase().includes(query),
    );
  }, [cities, searchQuery, activeType]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pb-2">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {availableTypes.map((type) => {
            const isActive = type === activeType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm border
                  ${
                    isActive
                      ? "bg-coral-500 text-white border-transparent shadow-md"
                      : "bg-white text-system-secondary-label border-white/80 hover:text-system-label"
                  }`}
              >
                {CITY_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city"
            className="w-full px-4 py-3 pl-11 bg-white rounded-full text-system-label placeholder:text-system-tertiary-label focus:outline-none focus:ring-2 focus:ring-coral-500/40 shadow-sm"
            autoFocus
            disabled={isLoading}
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-coral-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-system-secondary-label">
            {error}
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="px-4 py-8 text-center text-system-secondary-label">
            該当する市区町村がありません
          </div>
        ) : (
          <div
            role="listbox"
            aria-label="市区町村一覧"
            className="grid grid-cols-2 gap-4 px-5 pb-8"
          >
            {filteredCities.map((city) => (
              <button
                key={city.code}
                type="button"
                onClick={() => onSelect(city)}
                className="group relative flex flex-col items-start justify-center p-4 bg-white rounded-2xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-coral-200 text-left transition-all"
                role="option"
                aria-selected={false}
              >
                <span className="text-system-label text-lg font-semibold leading-tight mb-1">
                  {city.name}
                </span>
                <span className="text-system-tertiary-label text-[11px] uppercase tracking-widest">
                  {city.nameEn}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CityList;
