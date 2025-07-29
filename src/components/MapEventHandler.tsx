import { useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useLabelsStore } from '../store/labelsStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import { useBottomSheetStore } from '../store/bottomSheetStore';
import useMediaQuery from '../hooks/useMediaQuery';
import { Place } from '../types';
import { classifyCategory } from '../utils/categoryClassifier';
import { estimateCost } from '../utils/estimateCost';

/**
 * 地図のイベント処理を担当するコンポーネント
 * 単一責任: 地図上のクリック、POI選択、起点選択などのイベント処理のみ
 */

interface MapEventHandlerProps {}
import { useLabelModeStore } from '../store/labelModeStore';

export default function MapEventHandler({}: MapEventHandlerProps) {
  const { labelMode, toggleLabelMode } = useLabelModeStore();
  const { map, panTo } = useGoogleMaps();
  const labelModeRef = useRef(false);
  
  // ストア依存をインターフェースで抽象化
  const { selectionMode, selectPointFromMap, isRouteSearchOpen } = useRouteSearchStore();
  const { setPlace } = useSelectedPlaceStore();
  const { addLabel } = useLabelsStore();
  // モバイル版BottomSheet制御用
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;


  useEffect(() => {
    labelModeRef.current = labelMode;
  }, [labelMode]);
  
  // MapEventHandlerのマウント/アンマウントをログ出力
  useEffect(() => {
  }, []);

  // 統合されたマップクリックハンドラー（useCallbackでメモ化）
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    
    // 最新のselectionModeを取得
    const currentRouteState = useRouteSearchStore.getState();
    
    // ラベル追加モードの処理
    if (labelModeRef.current && e.latLng) {
      addLabel({ text: '', position: { lat: e.latLng.lat(), lng: e.latLng.lng() } });
      // ラベルを1つ追加したらラベルモードを終了する
      toggleLabelMode();
      return;
    }

    // 移動時間選択モードの処理
    const travelTimeState = useTravelTimeMode.getState();
    if (travelTimeState.selectingOrigin && e.latLng) {
      travelTimeState.addCircle({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      return;
    }

    // POI クリックの処理
    const clicked = e as unknown as { placeId?: string; stop: () => void };
    if (!clicked.placeId) {
      
      // 55%状態でマップタップ時にパネルを閉じる処理（モバイルのみ）
      const { place: currentPlace } = useSelectedPlaceStore.getState();
      const { percent, isDragging } = useBottomSheetStore.getState();
      if (isMobile && currentPlace && percent === 55 && !isDragging) {
        setPlace(null);
        useBottomSheetStore.getState().setState(100, false);
        return;
      }
      
      // POIではないが、ルート選択モードの場合は座標を使用
      if (currentRouteState.selectionMode && e.latLng) {
        const point = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          name: `地図上の地点 (${e.latLng.lat().toFixed(4)}, ${e.latLng.lng().toFixed(4)})`
        };
        selectPointFromMap(point);
      }
      return;
    }
    
    // デフォルトの情報ウィンドウを無効化
    clicked.stop();

    const service = new google.maps.places.PlacesService(map!);
    service.getDetails(
      {
        placeId: clicked.placeId,
        fields: [
          'place_id',
          'name',
          'geometry',
          'formatted_address',
          'rating',
          'photos',
          'website',
          'types',
          'price_level',
        ],
      },
      (detail, status) => {
        
        if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
          // 最新のルート検索ストアの状態を取得
          const routeState = useRouteSearchStore.getState();
          const currentSelectionMode = routeState.selectionMode;
          
          
          if (currentSelectionMode && detail.geometry?.location) {
            // ルート検索の選択モード中
            const point = {
              lat: detail.geometry.location.lat(),
              lng: detail.geometry.location.lng(),
              name: detail.name || detail.formatted_address || '選択した地点'
            };
            selectPointFromMap(point);
            return;
          }
          
          // 通常モード：詳細パネルを開く
          
          // Google Places APIのPlaceResultをPlace型に変換
          const placeForPanel: any = {
            id: crypto.randomUUID(),
            name: detail.name || '名称不明',
            address: detail.formatted_address || '',
            formatted_address: detail.formatted_address || '', // PlaceDetailPanel互換性のため
            coordinates: {
              lat: detail.geometry?.location?.lat() || 0,
              lng: detail.geometry?.location?.lng() || 0,
            },
            category: classifyCategory(detail.types || []),
            memo: '',
            estimatedCost: estimateCost((detail as any).price_level, classifyCategory(detail.types || [])),
            photos: detail.photos || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            // Google Maps API互換プロパティ
            rating: detail.rating,
            website: detail.website,
            types: detail.types,
            opening_hours: detail.opening_hours,
          };
          
          
          setPlace(placeForPanel);
          
          // POI クリック時は常に55%位置で詳細パネルを表示（モバイル版のみ）
          if (isMobile) {
            useBottomSheetStore.getState().setState(55, false);
          }
          
          if (detail.geometry?.location) {
            const currentZoom = map!.getZoom() ?? 14;
            const zoomArg = currentZoom < 17 ? 17 : undefined;
            panTo(detail.geometry.location.lat(), detail.geometry.location.lng(), zoomArg);
          }
          
        } else {
        }
      },
    );
  }, [map, panTo, toggleLabelMode, addLabel, setPlace, selectPointFromMap]);

  // イベントリスナーの登録（確実にイベントをキャッチ）
  useEffect(() => {
    if (!map) {
      return;
    }
    
    // メインのクリックハンドラー
    const clickListener = map.addListener('click', handleMapClick);
    
    // DOM要素への直接的なクリックイベント（フォールバック）
    const mapDiv = map.getDiv();
    const domClickHandler = (e: MouseEvent) => {
    };
    mapDiv.addEventListener('click', domClickHandler);
    
    // Google Maps の bounds_changed イベント（地図操作検出）
    const boundsChangedListener = map.addListener('bounds_changed', () => {
    });

    return () => {
      if (clickListener) {
        google.maps.event.removeListener(clickListener);
      }
      if (boundsChangedListener) {
        google.maps.event.removeListener(boundsChangedListener);
      }
      if (mapDiv) {
        mapDiv.removeEventListener('click', domClickHandler);
      }
    };
  }, [map, handleMapClick]); // handleMapClickの変更も監視
  

  // このコンポーネントはイベント処理のみを担当し、UIは持たない
  return null;
} 