import { memo, useMemo } from "react";
import { MdBookmarkBorder } from "react-icons/md";
import { classifyCategory } from "../../utils/categoryClassifier";
import { estimateCost } from "../../utils/estimateCost";
import { useSelectedPlaceStore } from "../../store/selectedPlaceStore";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { getPlacesApiService } from "../../services/placesApiService";

interface SpotCardProps {
  spot: google.maps.places.PlaceResult;
  onClick?: () => void;
  variant?: "feature" | "standard";
}

function SpotCard({ spot, onClick, variant = "standard" }: SpotCardProps) {
  const { setPlace } = useSelectedPlaceStore();
  const { panTo, map } = useGoogleMaps();

  // 写真URLを取得（なければプレースホルダー）
  const photoUrl = useMemo(() => {
    if (spot.photos && spot.photos.length > 0) {
      return spot.photos[0].getUrl({ maxWidth: 400 });
    }
    return "/placeholders/place.svg";
  }, [spot.photos]);

  const fetchPlaceDetails = async (placeId: string) => {
    if (!map) return null;
    try {
      const service = getPlacesApiService(map);
      return await service.getFullDetails(placeId);
    } catch (error) {
      console.error("Failed to fetch place details:", error);
      return null;
    }
  };

  // クリックハンドラ
  const handleClick = async () => {
    const detail = spot.place_id
      ? await fetchPlaceDetails(spot.place_id)
      : null;
    const source = detail ?? spot;
    const coords = source.geometry?.location
      ? {
          lat: source.geometry.location.lat(),
          lng: source.geometry.location.lng(),
        }
      : undefined;

    const category = classifyCategory(source.types || []);
    const placeForPanel: any = {
      id: crypto.randomUUID(),
      name: source.name || "名称不明",
      address: source.vicinity || source.formatted_address || "",
      formatted_address: source.formatted_address || source.vicinity || "",
      coordinates: coords,
      category,
      memo: "",
      estimatedCost: estimateCost(source.price_level, category),
      photos: source.photos || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      rating: source.rating,
      user_ratings_total: source.user_ratings_total,
      website: source.website,
      types: source.types,
      opening_hours: source.opening_hours,
      place_id: source.place_id,
      price_level: source.price_level,
    };

    setPlace(placeForPanel);

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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute top-3 right-3">
            <div className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
              <MdBookmarkBorder size={18} />
            </div>
          </div>

          {spot.rating && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-white text-xs flex items-center gap-1 border border-white/10">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{spot.rating.toFixed(1)}</span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 text-white">
            {vicinityLabel && (
              <span className="inline-block px-2.5 py-1 text-[11px] rounded-full bg-black/20 backdrop-blur-md mb-2 border border-white/10">
                {vicinityLabel}
              </span>
            )}
            <h3 className="text-xl font-display font-bold leading-tight drop-shadow-sm">
              {spot.name}
            </h3>
            <p className="text-xs text-white/90 truncate mt-1 font-medium">
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
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
          loading="lazy"
        />
      </div>

      <div className="p-3">
        <h3 className="text-system-label font-display font-semibold text-sm truncate">
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
