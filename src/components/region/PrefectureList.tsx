import React, { useState, useMemo } from "react";
import type { Prefecture } from "../../types/region";
import prefecturesData from "../../data/regions/prefectures.json";

interface PrefectureListProps {
  onSelect: (prefecture: Prefecture) => void;
}

/**
 * 都道府県一覧表示コンポーネント
 * - prefectures.json から都道府県リストを読み込み
 * - 絞り込み検索入力欄
 * - リスト表示で各都道府県をクリックで選択
 */
const PrefectureList: React.FC<PrefectureListProps> = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const prefectureGradientMap: Record<string, string> = {
    "01": "from-sky-500 via-sky-600 to-slate-700",
    "13": "from-rose-500 via-orange-500 to-amber-500",
    "14": "from-blue-500 via-cyan-500 to-teal-500",
    "26": "from-amber-600 via-orange-600 to-stone-700",
    "27": "from-red-500 via-orange-500 to-amber-500",
    "28": "from-emerald-500 via-teal-500 to-cyan-600",
    "29": "from-amber-500 via-yellow-500 to-lime-500",
    "34": "from-green-600 via-emerald-500 to-teal-600",
    "40": "from-orange-500 via-red-500 to-rose-500",
    "47": "from-teal-400 via-cyan-500 to-blue-500",
  };

  const getGradient = (code: string) =>
    prefectureGradientMap[code] ?? "from-slate-500 via-slate-600 to-slate-700";

  // 都道府県データを取得
  const prefectures: Prefecture[] = prefecturesData.prefectures;

  // 検索フィルタ
  const filteredPrefectures = useMemo(() => {
    if (!searchQuery.trim()) {
      return prefectures;
    }
    const query = searchQuery.toLowerCase().trim();
    return prefectures.filter(
      (p) => p.name.includes(query) || p.nameEn.toLowerCase().includes(query),
    );
  }, [prefectures, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* 検索入力欄 */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="都道府県を検索..."
            className="w-full px-4 py-2.5 pl-10 bg-white/10 border border-white/20 rounded-lg text-system-label placeholder:text-system-tertiary-label focus:outline-none focus:ring-2 focus:ring-coral-500/50 focus:border-coral-500 transition-colors"
            autoFocus
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

      {/* 都道府県一覧 */}
      <div className="flex-1 overflow-y-auto">
        {filteredPrefectures.length === 0 ? (
          <div className="px-4 py-8 text-center text-system-secondary-label">
            該当する都道府県がありません
          </div>
        ) : (
          <div
            role="listbox"
            aria-label="都道府県一覧"
            className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3"
          >
            {filteredPrefectures.map((prefecture) => (
              <button
                key={prefecture.code}
                type="button"
                onClick={() => onSelect(prefecture)}
                className={`group relative h-28 rounded-2xl overflow-hidden text-left shadow-sm transition-all duration-200 ease-ios-out active:scale-[0.98] hover:shadow-md border border-white/20 bg-gradient-to-br ${getGradient(
                  prefecture.code,
                )}`}
                role="option"
                aria-selected={false}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-3">
                  <span className="text-white text-[16px] font-semibold drop-shadow-sm">
                    {prefecture.name}
                  </span>
                  <span className="text-white/80 text-[12px] tracking-wide">
                    {prefecture.nameEn}
                  </span>
                </div>
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
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
