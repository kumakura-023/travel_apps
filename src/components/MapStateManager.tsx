import { useMemo, useEffect } from 'react';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import useMediaQuery from '../hooks/useMediaQuery';
import { loadMapState, saveMapState, loadLastActionPosition } from '../services/storageService';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { usePlanStore } from '../store/planStore';

/**
 * 地図の状態管理を担当するコンポーネント
 * 単一責任: 地図の表示状態（マージン、カーソル、レスポンシブ）の計算のみ
 */

interface MapStateManagerProps {
  children: (state: MapState) => React.ReactNode;
}

interface MapState {
  containerStyle: React.CSSProperties;
  mapOptions: google.maps.MapOptions;
  center: google.maps.LatLngLiteral;
}

export default function MapStateManager({ children }: MapStateManagerProps) {
  const { place } = useSelectedPlaceStore();
  const { selectionMode, isRouteSearchOpen } = useRouteSearchStore();
  const { selectingOrigin } = useTravelTimeMode();
  const isDesktopViewport = useMediaQuery('(min-width: 1024px)');
  const { map } = useGoogleMaps();
  const { plan } = usePlanStore();

  // コンテナスタイルの計算
  const containerStyle = useMemo(() => {
    let marginLeft = 0;
    
    if (isDesktopViewport) {
      // 詳細情報パネルが開いている場合
      if (place) {
        marginLeft = 540;
        // ルート検索パネルも開いている場合は追加で480px
        if (isRouteSearchOpen) {
          marginLeft += 480;
        }
      } 
      // 詳細情報パネルが閉じているが、ルート検索パネルが開いている場合
      else if (isRouteSearchOpen) {
        marginLeft = 480;
      }
    }
    
    return {
      width: '100%',
      height: '100vh',
      marginLeft,
      transition: 'margin 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', // iOS風イージング
      cursor: selectingOrigin || selectionMode
        ? 'url("https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png") 12 32, crosshair'
        : 'default',
    };
  }, [place, isDesktopViewport, selectingOrigin, selectionMode, isRouteSearchOpen]);

  // 地図オプションの設定
  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    // UI設定
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    gestureHandling: 'greedy',
    disableDefaultUI: false,
    
    // Apple風のスタイル調整
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [
          { visibility: 'simplified' }
        ]
      }
    ]
  }), [isDesktopViewport]);

  // 地図の中心位置（優先順位: Firestoreの最後の操作位置 > ローカルの最後の操作位置 > 保存された地図状態 > 東京駅）
  const center = useMemo<google.maps.LatLngLiteral>(() => {
    // Firestoreの最後の操作位置を優先
    if (plan?.lastActionPosition?.position) {
      if (import.meta.env.DEV) {
        console.log('[MapStateManager] Firestoreの最後の操作位置から復元:', plan.lastActionPosition.position);
      }
      return plan.lastActionPosition.position;
    }
    
    // ローカルの最後の操作位置
    const lastAction = loadLastActionPosition();
    if (lastAction?.position) {
      if (import.meta.env.DEV) {
        console.log('[MapStateManager] ローカルの最後の操作位置から復元:', lastAction.position);
      }
      return lastAction.position;
    }
    
    // 次に保存された地図状態
    const savedState = loadMapState();
    if (savedState?.center) {
      if (import.meta.env.DEV) {
        console.log('[MapStateManager] 保存された地図状態から復元:', savedState.center);
      }
      return savedState.center;
    }
    
    // デフォルトは東京駅
    if (import.meta.env.DEV) {
      console.log('[MapStateManager] デフォルト位置（東京駅）を使用');
    }
    return { lat: 35.681236, lng: 139.767125 };
  }, [plan]);

  // 地図の状態変更を監視して保存
  useEffect(() => {
    if (!map) return;

    // デバウンス関数
    function debounce<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: NodeJS.Timeout;
      return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }

    const saveStateDebounced = debounce(() => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center && zoom) {
        saveMapState(
          { lat: center.lat(), lng: center.lng() },
          zoom
        );
      }
    }, 500); // 0.5秒のデバウンス

    const listeners = [
      map.addListener('center_changed', saveStateDebounced),
      map.addListener('zoom_changed', saveStateDebounced)
    ];

    return () => {
      listeners.forEach(listener => listener.remove());
    };
  }, [map]);

  const mapState: MapState = {
    containerStyle,
    mapOptions,
    center
  };

  return <>{children(mapState)}</>;
} 