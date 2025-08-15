import { GoogleMap } from '@react-google-maps/api';
import { useState, useEffect, useRef } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import MapStateManager from './MapStateManager';
import MapEventHandler from './MapEventHandler';
import MapOverlayManager from './MapOverlayManager';
import { useUIStore } from '../store/uiStore';
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
  // デフォルトのズームレベル（個人の保存状態は使用しない）
  const [zoom, setZoom] = useState(14);
  const isMapInteractionEnabled = useUIStore((s) => s.isMapInteractionEnabled);
  const { plan } = usePlanStore();
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // 地図の読み込み完了時のハンドラー
  const handleMapLoad = (map: google.maps.Map) => {
    setMap(map);
    
    // 個人の保存状態は使用しない（プラン共有位置のみを使用）
    
    // プランの最後の操作位置があれば、地図を移動
    if (plan?.lastActionPosition?.position) {
      // 少し遅延を入れて確実に移動
      setTimeout(() => {
        if (plan.lastActionPosition?.position) {
          map.panTo(plan.lastActionPosition.position);
          map.setZoom(15); // 適切なズームレベルに設定
        }
      }, 100);
    }
    
    setZoom(map.getZoom() ?? 14);
    
    // ズーム変更の監視
    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom() ?? 14);
    });
  };
  
  // planのlastActionPositionが実際に変更されたら地図を移動
  useEffect(() => {
    if (map && plan?.lastActionPosition?.position) {
      const newPosition = plan.lastActionPosition.position;
      const lastPosition = lastPositionRef.current;
      
      // 前回の位置と比較して、実際に変更された場合のみ移動
      if (!lastPosition || 
          Math.abs(lastPosition.lat - newPosition.lat) > 0.000001 ||
          Math.abs(lastPosition.lng - newPosition.lng) > 0.000001) {
        
        // 地図の中心を移動
        map.panTo(newPosition);
        
        // ズームレベルも適切に設定
        if (map.getZoom()! < 14) {
          map.setZoom(15);
        }
        
        // 前回の位置を更新
        lastPositionRef.current = { ...newPosition };
      }
    }
  }, [map, plan?.lastActionPosition?.position?.lat, plan?.lastActionPosition?.position?.lng]);

  // isMapInteractionEnabledの変更を監視してgestureHandlingを更新
  useEffect(() => {
    if (map) {
      map.setOptions({
        gestureHandling: isMapInteractionEnabled ? 'greedy' : 'none'
      });
    }
  }, [map, isMapInteractionEnabled]);

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