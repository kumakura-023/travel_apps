import React, { useState, useMemo, useEffect } from "react";
import type { City } from "../../types/region";

interface CityListProps {
  prefectureCode: string;
  onSelect: (city: City) => void;
}

/**
 * 都道府県コードからファイル名へのマッピング
 */
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

/**
 * 市区町村を動的に読み込む
 */
const loadCities = async (prefectureCode: string): Promise<City[]> => {
  try {
    const fileName = prefectureFileMap[prefectureCode];
    if (!fileName) {
      return [];
    }

    // 動的インポートで市区町村データを読み込み
    const module = await import(`../../data/regions/cities/${fileName}.json`);
    return module.default?.cities || module.cities || [];
  } catch (error) {
    console.error("Failed to load cities:", error);
    return [];
  }
};

/**
 * 市区町村一覧表示コンポーネント
 * - 選択された都道府県に基づいて市区町村を動的読み込み
 * - 絞り込み検索入力欄
 * - リスト表示で各市区町村をクリックで選択
 */
const CityList: React.FC<CityListProps> = ({ prefectureCode, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 都道府県コードが変わったら市区町村を読み込む
  useEffect(() => {
    let mounted = true;

    const fetchCities = async () => {
      setIsLoading(true);
      setError(null);

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

  // 検索フィルタ
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return cities;
    }
    const query = searchQuery.toLowerCase().trim();
    return cities.filter(
      (c) => c.name.includes(query) || c.nameEn.toLowerCase().includes(query),
    );
  }, [cities, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* 検索入力欄 */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="市区町村を検索..."
            className="w-full px-4 py-2.5 pl-10 bg-white/10 border border-white/20 rounded-lg text-system-label placeholder:text-system-tertiary-label focus:outline-none focus:ring-2 focus:ring-coral-500/50 focus:border-coral-500 transition-colors"
            autoFocus
            disabled={isLoading}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-system-tertiary-label"
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

      {/* 市区町村一覧 */}
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
          <ul role="listbox" aria-label="市区町村一覧">
            {filteredCities.map((city) => (
              <li key={city.code}>
                <button
                  type="button"
                  onClick={() => onSelect(city)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0 text-left"
                  role="option"
                  aria-selected={false}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-system-label font-medium">
                      {city.name}
                    </span>
                    <span className="text-system-tertiary-label text-sm">
                      {city.nameEn}
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-system-tertiary-label"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CityList;
