import { useMemo } from 'react';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import useMediaQuery from '../hooks/useMediaQuery';
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

  // 地図の中心位置（優先順位: Firestoreのプラン共有位置 > デフォルト位置）
  const center = useMemo<google.maps.LatLngLiteral>(() => {
    // Firestoreのプラン共有位置を最優先（これが唯一の共有位置）
    if (plan?.lastActionPosition?.position) {
      if (import.meta.env.DEV) {
        console.log('[MapStateManager] プラン共有位置から復元:', {
          position: plan.lastActionPosition.position,
          userId: plan.lastActionPosition.userId,
          actionType: plan.lastActionPosition.actionType,
          timestamp: plan.lastActionPosition.timestamp
        });
      }
      return plan.lastActionPosition.position;
    }
    
    // ローカルストレージは使用しない（個人の位置は共有しない）
    if (import.meta.env.DEV) {
      console.log('[MapStateManager] プラン共有位置がないため、デフォルト位置（東京駅）を使用');
    }
    
    // デフォルトは東京駅
    return { lat: 35.681236, lng: 139.767125 };
  }, [plan?.lastActionPosition]);

  // 個人の地図状態保存は無効化（プラン共有位置のみを使用）
  // useEffect(() => {
  //   if (!map) return;
  //   // ローカルストレージへの保存は行わない
  // }, [map]);

  const mapState: MapState = {
    containerStyle,
    mapOptions,
    center
  };

  return <>{children(mapState)}</>;
} 