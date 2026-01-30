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
          <ul role="listbox" aria-label="都道府県一覧">
            {filteredPrefectures.map((prefecture) => (
              <li key={prefecture.code}>
                <button
                  type="button"
                  onClick={() => onSelect(prefecture)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0 text-left"
                  role="option"
                  aria-selected={false}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-system-label font-medium">
                      {prefecture.name}
                    </span>
                    <span className="text-system-tertiary-label text-sm">
                      {prefecture.nameEn}
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

export default PrefectureList;
