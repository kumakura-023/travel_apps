import React from "react";
import { Place } from "../types";
import {
  getCategoryColor,
  getCategoryDisplayName,
} from "../utils/categoryIcons";

interface Props {
  places: Place[];
}

/**
 * CostPieChart – 外部ライブラリ非依存の簡易リングチャート
 * (SVG円弧で実装 / small dataset 用)
 */
export default function CostPieChart({ places }: Props) {
  const total = places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  // カテゴリ別集計
  const categoryData = React.useMemo(() => {
    const map = new Map();
    for (const p of places) {
      const current = map.get(p.category) || 0;
      map.set(p.category, current + (p.estimatedCost || 0));
    }
    return Array.from(map.entries())
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [places]);

  if (categoryData.length === 0 || total === 0) {
    return null;
  }

  // Simple visual representation using bars instead of pie chart
  return (
    <div className="glass-effect rounded-xl p-5 shadow-elevation-1">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-coral-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <h3 className="subheadline font-semibold text-system-label">
            費用配分
          </h3>
          <p className="caption-1 text-system-tertiary-label">
            カテゴリ別の費用比率
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {categoryData.map(([category, amount]) => {
          const percentage = (amount / total) * 100;
          const categoryColor = getCategoryColor(category);

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <span className="callout text-system-label">
                    {getCategoryDisplayName(category)}
                  </span>
                </div>
                <span className="caption-1 text-system-secondary-label font-medium">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-system-secondary-background rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-ios-default"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: categoryColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 総計表示 */}
      <div className="mt-4 pt-3 border-t border-system-separator">
        <div className="flex items-center justify-between">
          <span className="subheadline text-system-secondary-label">総計</span>
          <span className="headline font-semibold text-system-label">
            ¥{total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
