import { memo, useMemo } from "react";
import { MdBookmarkBorder } from "react-icons/md";
import { classifyCategory } from "../../utils/categoryClassifier";
import { estimateCost } from "../../utils/estimateCost";
import { useSelectedPlaceStore } from "../../store/selectedPlaceStore";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";

interface SpotCardProps {
  spot: google.maps.places.PlaceResult;
  onClick?: () => void;
  variant?: "feature" | "standard";
}

function SpotCard({ spot, onClick, variant = "standard" }: SpotCardProps) {
  const { setPlace } = useSelectedPlaceStore();
  const { panTo } = useGoogleMaps();

  // 写真URLを取得（なければプレースホルダー）
  const photoUrl = useMemo(() => {
    if (spot.photos && spot.photos.length > 0) {
      return spot.photos[0].getUrl({ maxWidth: 400 });
    }
    return "/placeholders/place.svg";
  }, [spot.photos]);

  // クリックハンドラ
  const handleClick = () => {
    const coords = spot.geometry?.location
      ? {
          lat: spot.geometry.location.lat(),
          lng: spot.geometry.location.lng(),
        }
      : undefined;

    const category = classifyCategory(spot.types || []);
    const placeForPanel: any = {
      id: crypto.randomUUID(),
      name: spot.name || "名称不明",
      address: spot.vicinity || spot.formatted_address || "",
      formatted_address: spot.formatted_address || spot.vicinity || "",
      coordinates: coords,
      category,
      memo: "",
      estimatedCost: estimateCost(spot.price_level, category),
      photos: spot.photos || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      rating: spot.rating,
      website: spot.website,
      types: spot.types,
      opening_hours: spot.opening_hours,
      place_id: spot.place_id,
    };

    setPlace(placeForPanel);

    // 地図を移動
    if (coords) {
      panTo(coords.lat, coords.lng, 15);
    }

    onClick?.();
  };

  const vicinityLabel = useMemo(() => {
    const raw = spot.vicinity || spot.formatted_address || "";
    return raw.split(",")[0] || raw;
  }, [spot.vicinity, spot.formatted_address]);

  if (variant === "feature") {
    return (
      <div
        onClick={handleClick}
        className="group cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
      >
        <div className="relative aspect-[16/9]">
          <img
            src={photoUrl}
            alt={spot.name || "スポット"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute top-3 right-3">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <MdBookmarkBorder size={18} />
            </div>
          </div>

          {spot.rating && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs flex items-center gap-1">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{spot.rating.toFixed(1)}</span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 text-white">
            {vicinityLabel && (
              <span className="inline-block px-2.5 py-1 text-[11px] rounded-full bg-white/20 mb-2">
                {vicinityLabel}
              </span>
            )}
            <h3 className="text-lg font-semibold leading-tight">{spot.name}</h3>
            <p className="text-xs text-white/80 truncate">
              {spot.vicinity || spot.formatted_address || ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={photoUrl}
          alt={spot.name || "スポット"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      <div className="p-3">
        <h3 className="text-system-label font-semibold text-sm truncate">
          {spot.name}
        </h3>
        <p className="text-system-secondary-label text-xs truncate mt-1">
          {spot.vicinity || spot.formatted_address || ""}
        </p>
      </div>
    </div>
  );
}

export default memo(SpotCard);
