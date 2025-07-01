import { PlaceCategory } from '../types';
import { priceLevelToCost } from './priceLevelToCost';

export function estimateCost(priceLevel: number | undefined | null, category: PlaceCategory): number {
  if (priceLevel !== undefined && priceLevel !== null) {
    return priceLevelToCost(priceLevel);
  }
  // Fallback by category
  switch (category) {
    case 'hotel':
      return 15000; // 1泊目安
    case 'restaurant':
      return 3000; // ランチ〜ディナー平均
    case 'sightseeing':
      return 1000; // 入館料など
    case 'shopping':
      return 0; // 費用はユーザー入力に任せる
    case 'transport':
      return 0; // 移動コストは別途
    default:
      return 0;
  }
} 