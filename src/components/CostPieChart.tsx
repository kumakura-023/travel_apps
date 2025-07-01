import React from 'react';
import { Place } from '../types';
import { getCategoryColor, getCategoryDisplayName } from '../utils/categoryIcons';

interface Props {
  places: Place[];
}

/**
 * CostPieChart – 外部ライブラリ非依存の簡易リングチャート
 * (SVG円弧で実装 / small dataset 用)
 */
export default function CostPieChart({ places }: Props) {
  const data = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of places) {
      map.set(p.category, (map.get(p.category) || 0) + (p.estimatedCost || 0));
    }
    return Array.from(map.entries()).filter(([, v]) => v > 0);
  }, [places]);

  const total = data.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;

  // SVG circle metrics
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center space-y-2">
      <svg width={150} height={150} viewBox="0 0 150 150" className="rotate-[-90deg]">
        {data.map(([cat, value]) => {
          const fraction = value / total;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const strokeDasharray = `${dash} ${gap}`;
          const strokeDashoffset = cumulative;
          cumulative += dash;
          return (
            <circle
              key={cat}
              cx={75}
              cy={75}
              r={radius}
              fill="transparent"
              stroke={getCategoryColor(cat as any)}
              strokeWidth={20}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-strokeDashoffset}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {data.map(([cat]) => (
          <div key={cat} className="flex items-center space-x-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: getCategoryColor(cat as any) }}
            />
            <span>{getCategoryDisplayName(cat as any)}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 