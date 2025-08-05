import { useMemo, useEffect, useState } from 'react';
import { useSelectedPlaceStore } from '../store/selectedPlaceStore';
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
  const { plan, isLoading } = usePlanStore();
  

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

  // デフォルトの中心位置（東京駅）
  const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 };
  
  // 地図の中心位置を管理（planの読み込みを待つため）
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [centerInitialized, setCenterInitialized] = useState(false);
  
  // planが読み込まれたら、lastActionPositionから中心位置を設定
  useEffect(() => {
    // すでに初期化済みの場合はスキップ（重複実行を防ぐ）
    if (centerInitialized && !plan?.lastActionPosition?.position) {
      return;
    }
    
    if (plan?.lastActionPosition?.position) {
      setCenter(plan.lastActionPosition.position);
      setCenterInitialized(true);
    } else if (!isLoading && !centerInitialized) {
      // planの読み込みが完了したが、lastActionPositionがない場合
      setCenter(DEFAULT_CENTER);
      setCenterInitialized(true);
    }
  }, [plan?.lastActionPosition, isLoading, centerInitialized]);

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