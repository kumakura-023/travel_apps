import { memo, useMemo } from "react";
import { useSelectedPlaceStore } from "../../store/selectedPlaceStore";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";

interface SpotCardProps {
  spot: google.maps.places.PlaceResult;
  onClick?: () => void;
}

function SpotCard({ spot, onClick }: SpotCardProps) {
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
    // 選択状態を更新
    setPlace(spot);

    // 地図を移動
    if (spot.geometry?.location) {
      panTo(spot.geometry.location.lat(), spot.geometry.location.lng(), 15);
    }

    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-xl overflow-hidden 
                 glass-effect-border shadow-elevation-1
                 hover:shadow-elevation-2 transition-all duration-200"
    >
      {/* 写真（アスペクト比 4:3） */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={photoUrl}
          alt={spot.name || "スポット"}
          className="w-full h-full object-cover 
                     group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* 評価バッジ（右上） */}
        {spot.rating && (
          <div
            className="absolute top-2 right-2 px-2 py-1 
                          bg-black/60 backdrop-blur-sm rounded-full
                          flex items-center gap-1"
          >
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white text-xs font-medium">
              {spot.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* 情報部分 */}
      <div className="p-3">
        {/* スポット名 */}
        <h3
          className="text-system-label font-semibold text-sm 
                       truncate mb-1"
        >
          {spot.name}
        </h3>

        {/* サブタイトル（タイプ or 住所） */}
        <p className="text-system-secondary-label text-xs truncate">
          {spot.vicinity || spot.formatted_address || ""}
        </p>

        {/* レビュー件数 */}
        {spot.user_ratings_total && (
          <p className="text-system-tertiary-label text-xs mt-1">
            ({spot.user_ratings_total.toLocaleString()}件のレビュー)
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(SpotCard);
