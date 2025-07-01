import React from 'react';
import { Place, PlaceCategory } from '../types';
import { getCategoryDisplayName } from '../utils/categoryIcons';
import { formatCurrency } from '../utils/formatCurrency';

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
    return Array.from(map.entries());
  }, [places]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
        <span className="text-gray-600 text-sm">総費用</span>
        <span className="text-2xl font-bold text-green-700">{formatCurrency(total)}</span>
      </div>

      <div className="bg-white rounded-lg shadow-elevation-1 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-2">カテゴリ</th>
              <th className="px-4 py-2 text-right">費用</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map(([cat, amount]) => (
              <tr key={cat} className="border-t border-gray-100">
                <td className="px-4 py-2">{getCategoryDisplayName(cat)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 