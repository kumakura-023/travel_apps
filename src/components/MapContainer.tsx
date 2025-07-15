import { GoogleMap } from '@react-google-maps/api';
import { useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import MapStateManager from './MapStateManager';
import MapEventHandler from './MapEventHandler';
import MapOverlayManager from './MapOverlayManager';
import { useUIStore } from '../store/uiStore';

/**
 * 地図コンテナコンポーネント
 * 単一責任: 地図の表示と子コンポーネントの統合のみ
 * 
 * アーキテクチャパターン: 
 * - MapStateManager: 状態管理の責任を分離
 * - MapEventHandler: イベント処理の責任を分離  
 * - MapOverlayManager: オーバーレイ管理の責任を分離
 */

interface MapContainerProps {
  children?: React.ReactNode;
  showLabelToggle?: boolean;
  labelMode?: boolean;
  onLabelModeChange?: (mode: boolean) => void;
}

export default function MapContainer({ children, showLabelToggle = true, labelMode = false, onLabelModeChange }: MapContainerProps) {
  const { setMap } = useGoogleMaps();
  const [zoom, setZoom] = useState(14);
  const isMapInteractionEnabled = useUIStore((s) => s.isMapInteractionEnabled);

  // 地図の読み込み完了時のハンドラー
  const handleMapLoad = (map: google.maps.Map) => {
    setMap(map);
    setZoom(map.getZoom() ?? 14);
    
    // ズーム変更の監視
    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom() ?? 14);
    });
  };

  return (
    <MapStateManager>
      {({ containerStyle, mapOptions, center }) => (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          options={{
            ...mapOptions,
            disableDoubleClickZoom: true, // ダブルクリックによるズームを無効化
            gestureHandling: isMapInteractionEnabled ? 'greedy' : 'none',
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={handleMapLoad}
        >
          {/* イベント処理コンポーネント（UIを持たない） */}
          <MapEventHandler 
            labelMode={labelMode} 
            onLabelModeChange={onLabelModeChange || (() => {})} 
          />
          
          {/* オーバーレイ管理コンポーネント */}
          <MapOverlayManager 
            zoom={zoom} 
            labelMode={labelMode}
            onLabelModeChange={onLabelModeChange || (() => {})}
            showLabelToggle={showLabelToggle}
          >
            {children}
          </MapOverlayManager>
        </GoogleMap>
      )}
    </MapStateManager>
  );
} 