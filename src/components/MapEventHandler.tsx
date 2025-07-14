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

interface MapEventHandlerProps {
  labelMode: boolean;
  onLabelModeChange: (mode: boolean) => void;
}

export default function MapEventHandler({ labelMode, onLabelModeChange }: MapEventHandlerProps) {
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

  console.log('🔄 MapEventHandler render - selectionMode:', selectionMode);
  console.log('🗺️ Map instance state:', !!map, map);

  useEffect(() => {
    labelModeRef.current = labelMode;
  }, [labelMode]);
  
  // MapEventHandlerのマウント/アンマウントをログ出力
  useEffect(() => {
    console.log('✅ MapEventHandler mounted');
    return () => {
      console.log('❌ MapEventHandler unmounted');
    };
  }, []);

  // 統合されたマップクリックハンドラー（useCallbackでメモ化）
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    console.log('=== MAP CLICK EVENT ===');
    console.log('Event object:', e);
    console.log('Event latLng:', e.latLng);
    console.log('labelMode:', labelModeRef.current);
    
    // 最新のselectionModeを取得
    const currentRouteState = useRouteSearchStore.getState();
    console.log('Current route state:', currentRouteState);
    console.log('Current selectionMode:', currentRouteState.selectionMode);
    
    // ラベル追加モードの処理
    if (labelModeRef.current && e.latLng) {
      console.log('📍 Label mode - adding label');
      addLabel({ text: '', position: { lat: e.latLng.lat(), lng: e.latLng.lng() } });
      // ラベルモードを維持して連続でメモを追加可能にする
      // onLabelModeChange(false); // この行をコメントアウト
      return;
    }

    // 移動時間選択モードの処理
    const travelTimeState = useTravelTimeMode.getState();
    if (travelTimeState.selectingOrigin && e.latLng) {
      console.log('⏰ Travel time mode - adding circle');
      travelTimeState.addCircle({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      return;
    }

    // POI クリックの処理
    const clicked = e as unknown as { placeId?: string; stop: () => void };
    console.log('POI click check - placeId:', clicked.placeId);
    if (!clicked.placeId) {
      console.log('❌ No placeId found - not a POI click');
      console.log('Regular map click - checking for route selection mode');
      
      // 55%状態でマップタップ時にパネルを閉じる処理（モバイルのみ）
      const { place: currentPlace } = useSelectedPlaceStore.getState();
      const { percent, isDragging } = useBottomSheetStore.getState();
      if (isMobile && currentPlace && percent === 55 && !isDragging) {
        console.log('📱 Mobile: 55% panel state detected - closing panel on map tap');
        setPlace(null);
        useBottomSheetStore.getState().setState(100, false);
        return;
      }
      
      // POIではないが、ルート選択モードの場合は座標を使用
      if (currentRouteState.selectionMode && e.latLng) {
        console.log('🎯 Route selection mode active - using map coordinates');
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
        console.log('=== PLACES SERVICE RESPONSE ===');
        console.log('Status:', status);
        console.log('Detail:', detail);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
          // 最新のルート検索ストアの状態を取得
          const routeState = useRouteSearchStore.getState();
          const currentSelectionMode = routeState.selectionMode;
          
          console.log('=== POI CLICKED DEBUG ===');
          console.log('detail.name:', detail.name);
          console.log('detail.formatted_address:', detail.formatted_address);
          console.log('currentSelectionMode:', currentSelectionMode);
          console.log('detail.geometry?.location:', detail.geometry?.location);
          console.log('Route search store state:', routeState);
          
          if (currentSelectionMode && detail.geometry?.location) {
            // ルート検索の選択モード中
            console.log('✅ ROUTE SELECTION MODE - Creating point for selection');
            const point = {
              lat: detail.geometry.location.lat(),
              lng: detail.geometry.location.lng(),
              name: detail.name || detail.formatted_address || '選択した地点'
            };
            console.log('Created point:', point);
            console.log('Calling selectPointFromMap...');
            selectPointFromMap(point);
            console.log('selectPointFromMap called successfully');
            return;
          }
          
          // 通常モード：詳細パネルを開く
          console.log('✅ NORMAL MODE - Opening detail panel');
          
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
          
          console.log('📱 Created Place object for detail panel:', placeForPanel);
          console.log('🚀 Calling setPlace to open detail panel...');
          
          setPlace(placeForPanel);
          
          // POI クリック時は常に55%位置で詳細パネルを表示（モバイル版のみ）
          if (isMobile) {
            console.log('📱 Setting BottomSheet to 55% position for POI detail panel');
            useBottomSheetStore.getState().setState(55, false);
          }
          
          if (detail.geometry?.location) {
            const currentZoom = map!.getZoom() ?? 14;
            const zoomArg = currentZoom < 17 ? 17 : undefined;
            panTo(detail.geometry.location.lat(), detail.geometry.location.lng(), zoomArg);
          }
          
          // デバッグ用：詳細パネル表示確認
          setTimeout(() => {
            console.log('🔍 Detail panel should be visible now');
          }, 100);
        } else {
          console.log('❌ Places service failed:', status);
        }
      },
    );
  }, [map, panTo, onLabelModeChange, addLabel, setPlace, selectPointFromMap]);

  // イベントリスナーの登録（確実にイベントをキャッチ）
  useEffect(() => {
    console.log('🔧 useEffect for click listeners triggered');
    console.log('🔧 Map exists:', !!map);
    console.log('🔧 Map object:', map);
    
    if (!map) {
      console.log('❌ No map instance - returning early');
      return;
    }

    console.log('✅ MapEventHandler: Registering ALL click listeners');
    console.log('Current selectionMode:', selectionMode);
    console.log('Map instance:', map);
    
    // メインのクリックハンドラー
    const clickListener = map.addListener('click', handleMapClick);
    
    // DOM要素への直接的なクリックイベント（フォールバック）
    const mapDiv = map.getDiv();
    const domClickHandler = (e: MouseEvent) => {
      console.log('=== DOM CLICK DETECTED ===');
      console.log('DOM click event:', e);
    };
    mapDiv.addEventListener('click', domClickHandler);
    
    // Google Maps の bounds_changed イベント（地図操作検出）
    const boundsChangedListener = map.addListener('bounds_changed', () => {
      console.log('Map bounds changed');
    });

    return () => {
      console.log('MapEventHandler: Removing ALL listeners');
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
  
  // 緊急用：地図が読み込まれた後に強制的にクリックテスト
  useEffect(() => {
    if (!map) return;
    
    const timer = setTimeout(() => {
      console.log('🔧 Emergency click test - map ready check');
      console.log('Map instance ready:', !!map);
      console.log('Map div element:', map.getDiv());
      
      // テスト用のクリックリスナー
      const testListener = map.addListener('click', () => {
        console.log('🎯 TEST CLICK DETECTED - Map is working!');
      });
      
      // 5秒後にテストリスナーを削除
      setTimeout(() => {
        google.maps.event.removeListener(testListener);
        console.log('Test listener removed');
      }, 5000);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [map]);

  // このコンポーネントはイベント処理のみを担当し、UIは持たない
  return null;
} 