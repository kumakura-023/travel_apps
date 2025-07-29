import { GoogleMap } from '@react-google-maps/api';
import { useState, useEffect } from 'react';
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

  // 地図の読み込み完了時のハンドラー
  const handleMapLoad = (map: google.maps.Map) => {
    setMap(map);
    
    // 個人の保存状態は使用しない（プラン共有位置のみを使用）
    if (import.meta.env.DEV) {
      console.log('[MapContainer] 地図の初期化完了', {
        planId: plan?.id,
        hasLastActionPosition: !!plan?.lastActionPosition,
        lastActionPosition: plan?.lastActionPosition
      });
    }
    
    // プランの最後の操作位置があれば、地図を移動
    if (plan?.lastActionPosition?.position) {
      if (import.meta.env.DEV) {
        console.log('[MapContainer] 初期化時に最後の操作位置に移動:', plan.lastActionPosition.position);
      }
      // 少し遅延を入れて確実に移動
      setTimeout(() => {
        map.panTo(plan.lastActionPosition.position);
        map.setZoom(15); // 適切なズームレベルに設定
      }, 100);
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
        console.log('[MapContainer] Firestoreの最後の操作位置に地図を移動:', {
          position: plan.lastActionPosition.position,
          actionType: plan.lastActionPosition.actionType,
          userId: plan.lastActionPosition.userId,
          mapReady: !!map
        });
      }
      
      // 地図の中心を移動
      map.panTo(plan.lastActionPosition.position);
      
      // ズームレベルも適切に設定
      if (map.getZoom() < 14) {
        map.setZoom(15);
      }
    }
  }, [map, plan?.lastActionPosition?.position?.lat, plan?.lastActionPosition?.position?.lng]);

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