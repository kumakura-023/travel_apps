import SpotCard from "./SpotCard";
import { useRegionSearchStore } from "../../store/regionSearchStore";

interface SpotGridProps {
  onSpotClick?: (spot: google.maps.places.PlaceResult) => void;
}

export default function SpotGrid({ onSpotClick }: SpotGridProps) {
  const spots = useRegionSearchStore((state) => state.spots);
  const isLoading = useRegionSearchStore((state) => state.isLoading);
  const error = useRegionSearchStore((state) => state.error);

  // エラー状態
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-system-secondary-label text-center">{error}</p>
      </div>
    );
  }

  // ローディング状態（初回）
  if (isLoading && spots.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {[...Array(6)].map((_, i) => (
          <SpotCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 空の状態
  if (spots.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-system-secondary-label text-center">
          スポットが見つかりませんでした
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {spots.map((spot) => (
        <SpotCard
          key={spot.place_id}
          spot={spot}
          onClick={() => onSpotClick?.(spot)}
        />
      ))}
    </div>
  );
}

// スケルトンコンポーネント
function SpotCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden glass-effect-border">
      <div className="aspect-[4/3] bg-white/10 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded animate-pulse" />
        <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}
