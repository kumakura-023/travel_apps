import React, { useState, useRef } from 'react';
import { MdClose, MdDirectionsCar, MdDirectionsTransit, MdDirectionsWalk, MdDirectionsBike, MdFlight, MdSwapVert, MdSearch, MdNavigation } from 'react-icons/md';
import { Autocomplete } from '@react-google-maps/api';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useSelectedPlaceStore } from '../store/placeStore';
import { directionsService } from '../services/directionsService';
import useMediaQuery from '../hooks/useMediaQuery';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedOrigin?: { lat: number; lng: number; name: string };
  selectedDestination?: { lat: number; lng: number; name: string };
}

type TravelMode = 'DRIVING' | 'WALKING' | 'TRANSIT' | 'BICYCLING';

export default function RouteSearchPanel({ isOpen, onClose, selectedOrigin, selectedDestination }: Props) {
  const [selectedMode, setSelectedMode] = useState<TravelMode>('DRIVING');
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    duration: string;
    distance: string;
    mode: TravelMode;
  } | null>(null);

  // RouteConnectionsStore から関数を取得
  const { addRoute, clearAllRoutes, routes } = useRouteConnectionsStore();

  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  
  // input要素の値を保持するRef
  const originValueRef = useRef<string>('');
  const destinationValueRef = useRef<string>('');

  // ブレークポイント
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // 詳細情報パネルの表示状態
  const placeOpen = !!useSelectedPlaceStore((s) => s.place);

  // ルート検索ストアの状態管理
  const { 
    selectedOrigin: storeOrigin, 
    selectedDestination: storeDestination,
    selectionMode,
    setSelectionMode,
    setSelectedOrigin: setStoreOrigin,
    setSelectedDestination: setStoreDestination,
    clearSelections
  } = useRouteSearchStore();

  // プロップスからの地点情報をストアに反映
  React.useEffect(() => {
    if (selectedOrigin) {
      setStoreOrigin(selectedOrigin);
    }
  }, [selectedOrigin, setStoreOrigin]);

  React.useEffect(() => {
    if (selectedDestination) {
      setStoreDestination(selectedDestination);
    }
  }, [selectedDestination, setStoreDestination]);

  // ストアの地点情報をテキストフィールドに反映
  React.useEffect(() => {
    if (storeOrigin && storeOrigin.name) {
      console.log('Updating origin input with:', storeOrigin.name);
      if (originInputRef.current) {
        originInputRef.current.value = storeOrigin.name;
        originValueRef.current = storeOrigin.name;
      }
    }
  }, [storeOrigin]);

  React.useEffect(() => {
    if (storeDestination && storeDestination.name) {
      console.log('Updating destination input with:', storeDestination.name);
      if (destinationInputRef.current) {
        destinationInputRef.current.value = storeDestination.name;
        destinationValueRef.current = storeDestination.name;
      }
    }
  }, [storeDestination]);

  // パネルが開いた時に選択モードをクリア（初期化は手動で行う）
  React.useEffect(() => {
    if (!isOpen) {
      setSelectionMode(null);
    }
  }, [isOpen, setSelectionMode]);

  // コンポーネントがレンダリングされた後にinput要素の値を復元
  React.useEffect(() => {
    const restoreInputValues = () => {
      if (originInputRef.current && originValueRef.current) {
        originInputRef.current.value = originValueRef.current;
      }
      if (destinationInputRef.current && destinationValueRef.current) {
        destinationInputRef.current.value = destinationValueRef.current;
      }
    };

    // 少し遅延させて確実にDOM要素が準備されてから実行
    const timeoutId = setTimeout(restoreInputValues, 50);
    
    return () => clearTimeout(timeoutId);
  });

  if (!isOpen) return null;

  const travelModes = [
    { mode: 'DRIVING' as TravelMode, icon: MdDirectionsCar, label: '車' },
    { mode: 'TRANSIT' as TravelMode, icon: MdDirectionsTransit, label: '公共交通機関' },
    { mode: 'WALKING' as TravelMode, icon: MdDirectionsWalk, label: '徒歩' },
    { mode: 'BICYCLING' as TravelMode, icon: MdDirectionsBike, label: '自転車' },
  ];

  const handleSearch = async () => {
    // 非制御コンポーネントから値を取得
    const currentOriginText = originInputRef.current?.value || '';
    const currentDestinationText = destinationInputRef.current?.value || '';
    
    // 現在の入力値をRefに保存（検索後の復元用）
    originValueRef.current = currentOriginText;
    destinationValueRef.current = currentDestinationText;
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Search triggered with:', { currentOriginText, currentDestinationText });
    console.log('Selected mode:', selectedMode);
    console.log('Store origin:', storeOrigin);
    console.log('Store destination:', storeDestination);
    
    if (!currentOriginText.trim() || !currentDestinationText.trim()) {
      alert('出発地と目的地を入力してください');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    
    // 既存の検索結果ルートをクリア
    console.log('=== 新しい検索開始 - 既存ルートをクリア ===');
    console.log('検索前のルート数:', routes.length);
    clearAllRoutes();
    console.log('ルートクリア実行（新しい検索）');

    try {
      let originCoords: { lat: number; lng: number };
      let destinationCoords: { lat: number; lng: number };

      // 選択された地点の座標があればそれを使用、なければGeocoding APIを使用
      console.log('=== ORIGIN COORDINATES PROCESSING ===');
      console.log('storeOrigin:', storeOrigin);
      console.log('currentOriginText:', currentOriginText);
      console.log('Text match check:', currentOriginText === storeOrigin?.name || currentOriginText.includes(storeOrigin?.name || ''));
      
      if (storeOrigin && (currentOriginText === storeOrigin.name || currentOriginText.includes(storeOrigin.name))) {
        console.log('✅ Using stored origin coordinates');
        originCoords = storeOrigin;
        console.log('Origin coords from store:', originCoords);
      } else {
        console.log('🔍 Using Geocoding API for origin');
        const geocoder = new google.maps.Geocoder();
        const originResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
          geocoder.geocode({ address: currentOriginText }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('出発地の住所が見つかりません'));
            }
          });
        });
        if (!originResult.geometry?.location) {
          throw new Error('出発地の座標の取得に失敗しました');
        }
        originCoords = {
          lat: originResult.geometry.location.lat(),
          lng: originResult.geometry.location.lng()
        };
        console.log('Origin coords from Geocoding:', originCoords);
      }

      console.log('=== DESTINATION COORDINATES PROCESSING ===');
      console.log('storeDestination:', storeDestination);
      console.log('currentDestinationText:', currentDestinationText);
      console.log('Text match check:', currentDestinationText === storeDestination?.name || currentDestinationText.includes(storeDestination?.name || ''));
      
      if (storeDestination && (currentDestinationText === storeDestination.name || currentDestinationText.includes(storeDestination.name))) {
        console.log('✅ Using stored destination coordinates');
        destinationCoords = storeDestination;
        console.log('Destination coords from store:', destinationCoords);
      } else {
        console.log('🔍 Using Geocoding API for destination');
        const geocoder = new google.maps.Geocoder();
        const destinationResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
          geocoder.geocode({ address: currentDestinationText }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('目的地の住所が見つかりません'));
            }
          });
        });
        if (!destinationResult.geometry?.location) {
          throw new Error('目的地の座標の取得に失敗しました');
        }
        destinationCoords = {
          lat: destinationResult.geometry.location.lat(),
          lng: destinationResult.geometry.location.lng()
        };
        console.log('Destination coords from Geocoding:', destinationCoords);
      }

      // Directions APIで経路検索
      console.log('=== CALLING DIRECTIONS API ===');
      console.log('Final originCoords:', originCoords);
      console.log('Final destinationCoords:', destinationCoords);
      console.log('Selected mode:', selectedMode);
      console.log('Travel mode enum:', google.maps.TravelMode[selectedMode]);
      console.log('Full request to directionsService.getRoute:', {
        originCoords,
        destinationCoords,
        travelMode: google.maps.TravelMode[selectedMode]
      });
      
      // TRANSITモードが失敗した場合はWALKINGにフォールバック
      let routeResult;
      let actualTravelMode = google.maps.TravelMode[selectedMode];
      
      try {
        routeResult = await directionsService.getRoute(
          originCoords,
          destinationCoords,
          google.maps.TravelMode[selectedMode]
        );
      } catch (transitError) {
        if (selectedMode === 'TRANSIT') {
          console.log('❌ TRANSIT mode failed, trying WALKING as fallback');
          console.log('TRANSIT error:', transitError);
          
          // WALKINGモードでリトライ（徒歩+公共交通機関の代替として）
          try {
            routeResult = await directionsService.getRoute(
              originCoords,
              destinationCoords,
              google.maps.TravelMode.WALKING
            );
            actualTravelMode = google.maps.TravelMode.WALKING;
            console.log('✅ WALKING fallback successful');
            
            // ユーザーに通知（時刻考慮版）
            const now = new Date();
            const currentHour = now.getHours();
            let timeMessage = '';
            
            if (currentHour >= 1 && currentHour < 5) {
              timeMessage = '• 現在は深夜時間帯（運行停止中）のため、朝の運行時間で検索しましたが、ルートが見つかりませんでした\n';
            } else if (currentHour >= 0 && currentHour < 1) {
              timeMessage = '• 現在は深夜時間帯（運行停止中）のため、日中の運行時間で検索しましたが、ルートが見つかりませんでした\n';
            }
            
            alert('🚇 公共交通機関のルート検索結果:\n' +
                  timeMessage +
                  '• この地域・経路では詳細な時刻表データが利用できませんでした\n' +
                  '• 徒歩での直線距離を表示しています\n' +
                  '• 実際の移動では「最寄り駅→電車→最寄り駅→徒歩」をご検討ください\n' +
                  '• Google Mapsアプリで詳細な公共交通機関ルートを確認できます');
          } catch (walkingError) {
            console.log('❌ WALKING fallback also failed:', walkingError);
            
            // 最後の手段としてDRIVINGを試行
            try {
              routeResult = await directionsService.getRoute(
                originCoords,
                destinationCoords,
                google.maps.TravelMode.DRIVING
              );
              actualTravelMode = google.maps.TravelMode.DRIVING;
              console.log('✅ DRIVING fallback successful');
              
              alert('公共交通機関・徒歩両方でルートが見つかりませんでした。\n参考として車でのルートを表示します。');
            } catch (drivingError) {
              console.log('❌ All fallback modes failed:', drivingError);
              throw new Error('申し訳ございません。この地点間のルートを見つけることができませんでした。\n地点を変更してお試しください。');
            }
          }
        } else {
          throw transitError;
        }
      }

      console.log('Route result received:', routeResult);

      // 実際の移動手段をTravelMode文字列に変換
      const actualModeString = actualTravelMode === google.maps.TravelMode.WALKING ? 'WALKING' :
                              actualTravelMode === google.maps.TravelMode.DRIVING ? 'DRIVING' :
                              actualTravelMode === google.maps.TravelMode.TRANSIT ? 'TRANSIT' :
                              actualTravelMode === google.maps.TravelMode.BICYCLING ? 'BICYCLING' : 'DRIVING';

      setSearchResult({
        duration: routeResult.durationText,
        distance: routeResult.distanceText,
        mode: actualModeString as TravelMode
      });
      
      console.log('Search result set:', {
        duration: routeResult.durationText,
        distance: routeResult.distanceText,
        mode: actualModeString,
        originalSelectedMode: selectedMode,
        actualTravelMode
      });

      // RouteConnectionsStoreにルートを追加して地図上に表示
      const routeConnection = {
        originId: `search_origin_${Date.now()}`, // 検索用の一意ID
        destinationId: `search_destination_${Date.now()}`, // 検索用の一意ID
        originCoordinates: originCoords,
        destinationCoordinates: destinationCoords,
        travelMode: actualTravelMode, // フォールバック処理後の実際の移動手段
        duration: routeResult.duration,
        distance: routeResult.distance,
        durationText: routeResult.durationText,
        distanceText: routeResult.distanceText,
        route: routeResult.route
      };
      
      console.log('=== ADDING ROUTE TO MAP ===');
      console.log('Route connection:', {
        id: routeConnection.originId,
        travelMode: actualTravelMode,
        originalMode: selectedMode,
        hasRoute: !!routeResult.route,
        routesCount: routeResult.route?.routes?.length || 0,
        fallbackUsed: actualTravelMode !== google.maps.TravelMode[selectedMode],
        coords: {
          origin: originCoords,
          destination: destinationCoords
        }
      });
      
      try {
        // 既存の検索結果ルートを削除（最新の検索結果のみ表示）
        console.log('Adding route to map display...');
        addRoute(routeConnection);
        console.log('✅ Route successfully added to map');
      } catch (error) {
        console.error('❌ Error adding route to map:', error);
        console.error('Route data:', routeConnection);
        throw error;
      }

    } catch (error) {
      console.error('経路検索エラー:', error);
      alert(`経路検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsSearching(false);
      
      // 検索後にinput要素の値を復元
      setTimeout(() => {
        if (originInputRef.current && originValueRef.current) {
          originInputRef.current.value = originValueRef.current;
        }
        if (destinationInputRef.current && destinationValueRef.current) {
          destinationInputRef.current.value = destinationValueRef.current;
        }
      }, 100);
    }
  };

  const handleSwap = () => {
    const originValue = originInputRef.current?.value || '';
    const destinationValue = destinationInputRef.current?.value || '';
    
    // input要素の値を入れ替え
    if (originInputRef.current) {
      originInputRef.current.value = destinationValue;
    }
    if (destinationInputRef.current) {
      destinationInputRef.current.value = originValue;
    }
    
    // Refの値も入れ替え
    originValueRef.current = destinationValue;
    destinationValueRef.current = originValue;
  };

  const getTravelModeIcon = (mode: TravelMode) => {
    const modeData = travelModes.find(tm => tm.mode === mode);
    return modeData ? modeData.icon : MdDirectionsCar;
  };

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isDesktop) {
      // デスクトップでは詳細情報パネルの右隣に配置
      const leftPosition = placeOpen ? 540 : 0;
      return (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: `${leftPosition}px`,
            width: '480px',
            backgroundColor: 'white',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 40,
            overflowY: 'auto',
            pointerEvents: 'auto'
          }}
        >
          {children}
        </div>
      );
    }
    if (isTablet) {
      // タブレットでは画面下部に配置
      return (
        <div className="fixed left-0 right-0 bottom-0 h-[60vh] bg-white rounded-t-2xl shadow-elevation-5 z-50 overflow-y-auto">
          {children}
        </div>
      );
    }
    // モバイルではフルスクリーン
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        {children}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景スクリーン (mobile/tablet) - 一時的に無効化 */}
      {/* {(!isDesktop) && <div className="modal-backdrop" onClick={onClose} />} */}

      <Container>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <MdNavigation className="text-blue-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">ルート検索</h2>
          </div>
          <button 
            onClick={() => {
              console.log('=== ルート検索パネルを閉じる ===');
              console.log('パネル閉じる前のルート数:', routes.length);
              setSelectionMode(null);
              clearAllRoutes();
              clearSelections();
              setSearchResult(null);
              console.log('パネル閉じる時のルートクリア実行');
              onClose();
            }}
            className="p-1 bg-white hover:bg-gray-100 rounded-full shadow transition-colors"
            title="ルート検索を閉じる"
          >
            <MdClose size={20} className="text-gray-600" />
          </button>
        </div>

                <div className="p-4 space-y-4">


          {/* 説明テキスト */}
          <div className="text-center space-y-2">
            {selectionMode === 'origin' && (
              <p className="text-sm text-green-600 bg-green-50 py-2 px-3 rounded-lg">
                🟢 出発地を入力中：地図上の地点をタップするか、下のフィールドに直接入力
              </p>
            )}
            {selectionMode === 'destination' && (
              <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg">
                🔴 目的地を入力中：地図上の地点をタップするか、下のフィールドに直接入力
              </p>
            )}
            
            {/* デバッグ情報表示 */}
            <div className="text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-lg">
              <div>選択モード: {selectionMode || 'なし'}</div>
              <div>出発地設定済み: {storeOrigin ? '✅' : '❌'}</div>
              <div>目的地設定済み: {storeDestination ? '✅' : '❌'}</div>
            </div>
          </div>

          {/* 移動手段選択 */}
          <div className="flex justify-center space-x-2">
            {travelModes.map(({ mode, icon: Icon, label }) => (
              <div key={mode} className="relative">
                <button
                  onClick={() => setSelectedMode(mode)}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                    selectedMode === mode
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${mode === 'TRANSIT' ? 'relative' : ''}`}
                  title={mode === 'TRANSIT' ? '⚠️ 日本では詳細な公共交通機関データが提供されていません' : ''}
                >
                  <Icon size={24} />
                  <span className="text-xs mt-1">{label}</span>
                  {mode === 'TRANSIT' && (
                    <span className="absolute -top-1 -right-1 text-xs">⚠️</span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* 公共交通機関の制限に関する注意書き */}
          {selectedMode === 'TRANSIT' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <div className="text-sm text-amber-700">
                  <div className="font-medium mb-1">日本の公共交通機関について</div>
                  <div className="text-xs space-y-1">
                    <div>• Google Directions APIでは日本の詳細な電車・地下鉄データが提供されていません</div>
                    <div>• 検索失敗時は自動的に徒歩ルートで代替表示します</div>
                    <div>• 詳細な乗換案内は Google Maps アプリをご利用ください</div>
                  </div>
                </div>
              </div>
            </div>
          )}

                    {/* 出発地入力 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">出発地</label>
            <div className="flex space-x-2">
              <input 
                ref={originInputRef}
                type="text" 
                placeholder="出発地を入力してください"
                onChange={(e) => {
                  originValueRef.current = e.target.value;
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
              />
              <button
                onClick={() => {
                  console.log('📍 Origin button clicked, setting selectionMode to origin');
                  console.log('Current store state before setting origin mode:', { storeOrigin, storeDestination, selectionMode });
                  setSelectionMode('origin');
                  console.log('Origin selection mode set');
                  
                  // 状態変更を確認
                  setTimeout(() => {
                    const currentState = useRouteSearchStore.getState();
                    console.log('Store state after setting origin mode:', currentState);
                  }, 100);
                }}
                className={`px-3 py-3 rounded-lg border transition-all ${
                  selectionMode === 'origin' 
                    ? 'bg-green-600 text-white border-green-600' 
                    : storeOrigin
                    ? 'bg-green-100 text-green-600 border-green-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="地図から出発地を選択"
              >
                {storeOrigin ? '🟢' : '📍'}
              </button>
            </div>
          </div>

          {/* 入れ替えボタン */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="出発地と目的地を入れ替え"
            >
              <MdSwapVert size={20} className="text-gray-600" />
            </button>
          </div>

                    {/* 目的地入力 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">目的地</label>
            <div className="flex space-x-2">
              <input 
                ref={destinationInputRef}
                type="text" 
                placeholder="目的地を入力してください"
                onChange={(e) => {
                  destinationValueRef.current = e.target.value;
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" 
              />
              <button
                onClick={() => {
                  console.log('📍 Destination button clicked, setting selectionMode to destination');
                  console.log('Current store state before setting destination mode:', { storeOrigin, storeDestination, selectionMode });
                  setSelectionMode('destination');
                  console.log('Destination selection mode set');
                  
                  // 状態変更を確認
                  setTimeout(() => {
                    const currentState = useRouteSearchStore.getState();
                    console.log('Store state after setting destination mode:', currentState);
                  }, 100);
                }}
                className={`px-3 py-3 rounded-lg border transition-all ${
                  selectionMode === 'destination' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : storeDestination
                    ? 'bg-red-100 text-red-600 border-red-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="地図から目的地を選択"
              >
                {storeDestination ? '🔴' : '📍'}
              </button>
            </div>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <MdSearch size={20} />
            <span>{isSearching ? '検索中...' : '検索'}</span>
          </button>

          {/* 検索結果表示 */}
          {searchResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {React.createElement(getTravelModeIcon(searchResult.mode), { 
                    size: 24, 
                    className: "text-green-600" 
                  })}
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-800">
                      {searchResult.duration}
                    </div>
                    <div className="text-sm text-green-600">
                      距離: {searchResult.distance}
                    </div>
                    <div className="text-xs text-green-500 mt-1">
                      地図上にルートを表示中
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    console.log('=== 検索結果削除ボタンクリック ===');
                    console.log('現在のルート数:', routes.length);
                    clearAllRoutes();
                    clearSelections();
                    setSearchResult(null);
                    console.log('ルートクリア実行完了');
                  }}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                  title="ルートを削除"
                >
                  <MdClose size={16} className="text-green-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </>
  );
} 