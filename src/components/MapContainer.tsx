import { GoogleMap } from '@react-google-maps/api';
import { useState, useEffect } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import MapStateManager from './MapStateManager';
import MapEventHandler from './MapEventHandler';
import MapOverlayManager from './MapOverlayManager';
import { useUIStore } from '../store/uiStore';
import { loadMapState } from '../services/storageService';
import { usePlanStore } from '../store/planStore';

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
}

export default function MapContainer({ children, showLabelToggle = true }: MapContainerProps) {
  const { setMap, map } = useGoogleMaps();
  // 保存されたズームレベルがあればそれを使用、なければデフォルトの14
  const savedState = loadMapState();
  const [zoom, setZoom] = useState(savedState?.zoom || 14);
  const isMapInteractionEnabled = useUIStore((s) => s.isMapInteractionEnabled);
  const { plan } = usePlanStore();

  // 地図の読み込み完了時のハンドラー
  const handleMapLoad = (map: google.maps.Map) => {
    setMap(map);
    
    // 保存された状態がある場合は明示的に設定
    if (savedState) {
      // 中心位置を設定
      if (savedState.center) {
        map.setCenter(savedState.center);
      }
      // ズームレベルを設定
      if (savedState.zoom) {
        map.setZoom(savedState.zoom);
      }
      
      if (import.meta.env.DEV) {
        console.log('地図の初期状態を復元:', {
          center: savedState.center,
          zoom: savedState.zoom,
          lastUpdated: savedState.lastUpdated
        });
      }
    }
    
    setZoom(map.getZoom() ?? 14);
    
    // ズーム変更の監視
    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom() ?? 14);
    });
  };
  
  // planのlastActionPositionが変更されたら地図を移動
  useEffect(() => {
    if (map && plan?.lastActionPosition?.position) {
      if (import.meta.env.DEV) {
        console.log('[MapContainer] Firestoreの最後の操作位置に地図を移動:', plan.lastActionPosition.position);
      }
      map.panTo(plan.lastActionPosition.position);
    }
  }, [map, plan?.lastActionPosition]);

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
          <MapEventHandler />
          
          {/* オーバーレイ管理コンポーネント */}
          <MapOverlayManager
            zoom={zoom}
            showLabelToggle={showLabelToggle}
          >
            {children}
          </MapOverlayManager>
        </GoogleMap>
      )}
    </MapStateManager>
  );
} 