import { MdPlace } from "react-icons/md";
import type { City, Prefecture } from "../../types/region";

interface RegionSummaryCardProps {
  city: City;
  prefecture: Prefecture | null;
}

export default function RegionSummaryCard({
  city,
  prefecture,
}: RegionSummaryCardProps) {
  return (
    <div className="mx-4 mt-4 p-4 glass-effect-border rounded-xl">
      <div className="flex items-start gap-3">
        {/* 地図アイコン */}
        <div
          className="w-12 h-12 rounded-lg bg-coral-500/20 
                        flex items-center justify-center flex-shrink-0"
        >
          <MdPlace className="text-coral-500" size={24} />
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-system-label">{city.name}</h2>
          {prefecture && (
            <p className="text-sm text-system-secondary-label">
              {prefecture.name}
            </p>
          )}
          <p className="text-xs text-system-tertiary-label mt-1">
            検索半径: {(city.searchRadius / 1000).toFixed(1)}km
          </p>
        </div>
      </div>
    </div>
  );
}
