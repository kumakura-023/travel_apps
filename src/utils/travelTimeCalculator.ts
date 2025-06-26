import { TravelMode } from '../types/travelTime';

// 概算速度 (km/h) - 仕様より
export const TRAVEL_SPEEDS: Record<TravelMode, number> = {
  walking: 4,
  driving: 30,
  transit: 25,
};

/**
 * 時間 (分) と移動手段から半径 (メートル) を計算
 */
export function minutesToRadius(minutes: number, mode: TravelMode): number {
  const speed = TRAVEL_SPEEDS[mode];
  return (minutes * speed) / 60 * 1000; // km/h → m/min
}

/**
 * 手段別の円カラーを取得
 */
export function getTravelModeColor(mode: TravelMode): string {
  switch (mode) {
    case 'walking':
      return '#3B82F6'; // blue
    case 'driving':
      return '#10B981'; // green
    case 'transit':
      return '#F59E0B'; // amber
    default:
      return '#3B82F6';
  }
} 