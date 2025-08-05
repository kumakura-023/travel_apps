import { Circle, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useTravelTimeStore } from '../store/travelTimeStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useEffect, useRef } from 'react';
import { MdClose, MdDirectionsWalk, MdDirectionsCar, MdDirectionsTransit } from 'react-icons/md';

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

  const places = useSavedPlacesStore((s) => s.getFilteredPlaces());

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

  // Rough radius estimation: 80m per minute walking, 125m driving, 200m transit.
  // 車の値を都市部での実際の移動速度に合わせて調整（信号待ちや渋滞を考慮）
  const modeFactor = mode === 'WALKING' ? 80 : mode === 'DRIVING' ? 125 : 200;
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

  const getModeColor = () => {
    switch (mode) {
      case 'WALKING': return '#4ECDC4'; // teal-500
      case 'DRIVING': return '#3B82F6'; // blue-500
      case 'TRANSIT': return '#8B5CF6'; // violet-500
      default: return '#4ECDC4';
    }
  };

  const modeColor = getModeColor();

  return (
    <>
      <Circle
        key={`travel-circle-${origin.lat}-${origin.lng}-${mode}-${timeRange}`}
        center={origin}
        radius={radius}
        options={{
          fillColor: modeColor,
          fillOpacity: 0.12,
          strokeColor: modeColor,
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
          <div className="glass-effect rounded-xl shadow-elevation-3 border border-white/30 overflow-hidden">
            {/* ヘッダー部分 */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-b border-white/20"
              style={{
                background: `linear-gradient(135deg, ${modeColor}15, ${modeColor}08)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-elevation-2"
                  style={{ backgroundColor: modeColor }}
                >
                  {getModeIcon()}
                </div>
                <div className="flex flex-col">
                  <span className="footnote font-semibold tracking-tight" style={{ color: modeColor }}>
                    {getModeLabel()}
                  </span>
                  <span className="caption-2 text-system-secondary-label">
                    移動時間範囲
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="headline font-bold text-system-label">
                    {timeRange}
                  </span>
                  <span className="caption-1 text-system-secondary-label ml-1">
                    分
                  </span>
                </div>
                <button
                  className="w-6 h-6 bg-coral-500/90 hover:bg-coral-600 active:scale-95
                           rounded-full transition-all duration-150 ease-ios-default 
                           text-white flex items-center justify-center
                           shadow-elevation-2 backdrop-filter backdrop-blur-sm"
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