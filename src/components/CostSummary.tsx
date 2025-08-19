import React from "react";
import { Place, PlaceCategory } from "../types";
import {
  getCategoryDisplayName,
  getCategoryColor,
} from "../utils/categoryIcons";
import { formatCurrency } from "../utils/formatCurrency";

interface Props {
  places: Place[];
}

/** CostSummary – 選択された Place 配列から費用集計を行い表示する */
export default function CostSummary({ places }: Props) {
  const total = places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  // カテゴリ別集計
  const byCategory = React.useMemo(() => {
    const map = new Map<PlaceCategory, number>();
    for (const p of places) {
      map.set(p.category, (map.get(p.category) || 0) + (p.estimatedCost || 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]); // 金額順でソート
  }, [places]);

  return (
    <div className="space-y-4">
      {/* 総費用カード */}
      <div
        className="glass-effect rounded-xl p-5 shadow-elevation-2
                      bg-teal-500/10 border border-teal-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-teal-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <p className="subheadline text-system-secondary-label">総費用</p>
              <p className="caption-1 text-system-tertiary-label">
                {places.length}件の候補地
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="title-1 font-bold text-teal-600">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </div>

      {/* カテゴリ別詳細 */}
      {byCategory.length > 0 && (
        <div className="glass-effect rounded-xl overflow-hidden shadow-elevation-1">
          <div className="px-5 py-3 bg-system-secondary-background border-b border-system-separator">
            <h3 className="subheadline font-semibold text-system-label">
              カテゴリ別内訳
            </h3>
          </div>
          <div className="divide-y divide-system-separator">
            {byCategory.map(([cat, amount]) => {
              const categoryColor = getCategoryColor(cat);
              const percentage = total > 0 ? (amount / total) * 100 : 0;

              return (
                <div
                  key={cat}
                  className="px-5 py-3 hover:bg-system-secondary-background/50 
                                        transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: categoryColor }}
                      />
                      <div>
                        <p className="callout text-system-label">
                          {getCategoryDisplayName(cat)}
                        </p>
                        <p className="caption-2 text-system-tertiary-label">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="callout font-semibold text-system-label">
                        {formatCurrency(amount)}
                      </p>
                      <p className="caption-2 text-system-tertiary-label">
                        {places.filter((p) => p.category === cat).length}件
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
