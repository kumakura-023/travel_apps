import { Circle, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useTravelTimeStore } from '../store/travelTimeStore';
import { usePlacesStore } from '../store/placesStore';
import { useEffect, useRef } from 'react';
import { MdClose, MdDirectionsWalk, MdDirectionsCar, MdDirectionsTransit, MdAccessTime } from 'react-icons/md';

export default function TravelTimeOverlay() {
  const { map } = useGoogleMaps();
  const {
    origin,
    selectingOrigin,
    setOrigin,
    setSelectingOrigin,
    mode,
    timeRange,
    enabled,
  } = useTravelTimeStore();

  const places = usePlacesStore((s) => s.places);

  const circleRef = useRef<google.maps.Circle | null>(null);

  // 円をクリアする関数
  const clearCircle = () => {
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  };

  // 移動時間機能が無効になった時にクリーンアップ
  useEffect(() => {
    if (!enabled) {
      clearCircle();
    }
  }, [enabled]);

  // Cleanup when origin cleared
  useEffect(() => {
    if (!origin) {
      clearCircle();
    }
  }, [origin]);

  // Cleanup when TravelTimeOverlay unmounts
  useEffect(() => {
    return () => {
      clearCircle();
    };
  }, []);

  // Listen for click to set origin when selectingOrigin true
  useEffect(() => {
    if (!map) return;
    if (!selectingOrigin) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setOrigin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        setSelectingOrigin(false);
      }
    });
    return () => listener.remove();
  }, [map, selectingOrigin, setOrigin, setSelectingOrigin]);

  // Handle Ctrl+Click for two-point route selection
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: any) => {
      if ((e.domEvent as MouseEvent).ctrlKey && e.latLng) {
        useTravelTimeStore.getState().addRoutePoint({
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        });
      }
    });
    return () => listener.remove();
  }, [map]);

  // 移動時間機能が無効か起点がない場合は何も表示しない
  if (!enabled || !origin) return null;

  // Rough radius estimation: 80m per minute walking, 250m driving, 200m transit.
  const modeFactor = mode === 'WALKING' ? 80 : mode === 'DRIVING' ? 250 : 200;
  const radius = modeFactor * timeRange;

  // アイコンとラベルを取得
  const getModeIcon = () => {
    switch (mode) {
      case 'WALKING': return <MdDirectionsWalk className="w-4 h-4" />;
      case 'DRIVING': return <MdDirectionsCar className="w-4 h-4" />;
      case 'TRANSIT': return <MdDirectionsTransit className="w-4 h-4" />;
      default: return <MdDirectionsWalk className="w-4 h-4" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'WALKING': return '徒歩';
      case 'DRIVING': return '車';
      case 'TRANSIT': return '公共交通機関';
      default: return '徒歩';
    }
  };

  return (
    <>
      <Circle
        key={`travel-circle-${origin.lat}-${origin.lng}-${mode}-${timeRange}`}
        center={origin}
        radius={radius}
        options={{
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          strokeColor: '#3B82F6',
          strokeOpacity: 0.4,
          strokeWeight: 2,
          zIndex: 60,
          clickable: false,
        }}
        onLoad={(c: google.maps.Circle) => {
          // 既存の円があれば削除してから新しい円を設定
          clearCircle();
          circleRef.current = c;
        }}
        onUnmount={() => {
          clearCircle();
        }}
      />

      {/* 情報カード */}
      <InfoWindow
        position={origin}
        options={{ 
          disableAutoPan: true,
          pixelOffset: new google.maps.Size(0, -10),
          closeBoxURL: '', // デフォルトの閉じるボタンを非表示
        }}
      >
        <div className="p-0 max-w-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-elevation-2 border border-blue-200/50 overflow-hidden">
            {/* コンパクトなバッジ */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-blue-600">
                {getModeIcon()}
                <span className="text-sm font-medium">{getModeLabel()}</span>
              </div>
              <div className="text-xs text-gray-600 border-l border-gray-300 pl-2">
                {timeRange}分
              </div>
              <button
                className="p-0.5 hover:bg-red-100 rounded-full transition-colors duration-150 text-gray-400 hover:text-red-500"
                onClick={() => {
                  clearCircle();
                  useTravelTimeStore.getState().setOrigin(null);
                }}
                aria-label="移動時間の円を削除"
              >
                <MdClose className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </InfoWindow>

      {/* TODO: Show badges for each place based on direction duration */}
      {places.map((p) => (
        <Marker
          key={p.id + '_time'}
          position={p.coordinates}
          label={{
            text: p.name,
            fontSize: '10px',
            color: '#000',
          }}
          opacity={1}
        />
      ))}
    </>
  );
} 