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
      <div className="grid grid-cols-1 gap-4 px-5">
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

  const topAttractions = spots.slice(0, 2);
  const localFavorites = spots.slice(2);

  return (
    <div className="px-5">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-base font-semibold text-system-label">
          Top Attractions
        </h2>
        <button
          type="button"
          className="text-sm text-coral-500 hover:text-coral-600"
        >
          See All
        </button>
      </div>
      <div className="space-y-4">
        {topAttractions.map((spot) => (
          <SpotCard
            key={spot.place_id}
            spot={spot}
            variant="feature"
            onClick={() => onSpotClick?.(spot)}
          />
        ))}
      </div>

      {localFavorites.length > 0 && (
        <div className="pt-8">
          <h3 className="text-base font-semibold text-system-label mb-4">
            Local Favorites
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {localFavorites.map((spot) => (
              <SpotCard
                key={spot.place_id}
                spot={spot}
                variant="standard"
                onClick={() => onSpotClick?.(spot)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// スケルトンコンポーネント
function SpotCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="aspect-[16/9] bg-white/40 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-black/5 rounded animate-pulse" />
        <div className="h-3 bg-black/5 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}
