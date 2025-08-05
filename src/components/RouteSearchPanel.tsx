import React, { useState, useRef } from 'react';
import { MdClose, MdDirectionsCar, MdDirectionsTransit, MdDirectionsWalk, MdDirectionsBike, MdFlight, MdSwapVert, MdSearch, MdNavigation } from 'react-icons/md';
import { Autocomplete } from '@react-google-maps/api';
import { useRouteConnectionsStore, useRouteSearchStore } from '../store/routeStoreMigration';
import { useSelectedPlaceStore } from '../store/selectedPlaceStore';
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
      if (originInputRef.current) {
        originInputRef.current.value = storeOrigin.name;
        originValueRef.current = storeOrigin.name;
      }
    }
  }, [storeOrigin]);

  React.useEffect(() => {
    if (storeDestination && storeDestination.name) {
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
    
    
    if (!currentOriginText.trim() || !currentDestinationText.trim()) {
      alert('出発地と目的地を入力してください');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    
    // 既存の検索結果ルートをクリア
    clearAllRoutes();

    try {
      let originCoords: { lat: number; lng: number };
      let destinationCoords: { lat: number; lng: number };

      // 選択された地点の座標があればそれを使用、なければGeocoding APIを使用
      
      if (storeOrigin && (currentOriginText === storeOrigin.name || currentOriginText.includes(storeOrigin.name))) {
        originCoords = storeOrigin;
      } else {
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
      }

      
      if (storeDestination && (currentDestinationText === storeDestination.name || currentDestinationText.includes(storeDestination.name))) {
        destinationCoords = storeDestination;
      } else {
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
      }

      // Directions APIで経路検索
      
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
          
          // WALKINGモードでリトライ（徒歩+公共交通機関の代替として）
          try {
            routeResult = await directionsService.getRoute(
              originCoords,
              destinationCoords,
              google.maps.TravelMode.WALKING
            );
            actualTravelMode = google.maps.TravelMode.WALKING;
            
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
            
            // 最後の手段としてDRIVINGを試行
            try {
              routeResult = await directionsService.getRoute(
                originCoords,
                destinationCoords,
                google.maps.TravelMode.DRIVING
              );
              actualTravelMode = google.maps.TravelMode.DRIVING;
              
              alert('公共交通機関・徒歩両方でルートが見つかりませんでした。\n参考として車でのルートを表示します。');
            } catch (drivingError) {
              throw new Error('申し訳ございません。この地点間のルートを見つけることができませんでした。\n地点を変更してお試しください。');
            }
          }
        } else {
          throw transitError;
        }
      }


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
      
      
      try {
        // 既存の検索結果ルートを削除（最新の検索結果のみ表示）
        addRoute(routeConnection);
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
            zIndex: 40,
            overflowY: 'auto',
            pointerEvents: 'auto'
          }}
          className="glass-effect shadow-elevation-5 border-r border-system-separator"
        >
          {children}
        </div>
      );
    }
    if (isTablet) {
      // タブレットでは画面下部に配置
      return (
        <div className="fixed left-0 right-0 bottom-0 h-[60vh] 
                        glass-effect rounded-t-2xl shadow-elevation-5 z-50 
                        overflow-y-auto safe-area-inset">
          {children}
        </div>
      );
    }
    // モバイルではフルスクリーン
    return (
      <div className="fixed inset-0 glass-effect z-50 overflow-y-auto safe-area-inset">
        {children}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景スクリーン (mobile/tablet) */}
      {(!isDesktop) && <div className="modal-backdrop" onClick={onClose} />}

      <Container>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-system-separator">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center">
              <MdNavigation className="text-coral-500 w-4 h-4" />
            </div>
            <h2 className="headline text-system-label">ルート検索</h2>
          </div>
          <button 
            onClick={() => {
              setSelectionMode(null);
              clearAllRoutes();
              clearSelections();
              setSearchResult(null);
              onClose();
            }}
            className="w-8 h-8 bg-system-secondary-background hover:bg-coral-500/10 
                       rounded-full flex items-center justify-center 
                       transition-all duration-150 ease-ios-default
                       hover:scale-110 active:scale-95
                       text-system-secondary-label hover:text-coral-500"
            title="ルート検索を閉じる"
          >
            <MdClose size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 説明テキスト */}
          <div className="text-center space-y-3">
            {selectionMode === 'origin' && (
              <div className="bg-coral-500/10 border border-coral-500/20 py-3 px-4 rounded-xl">
                <p className="subheadline text-coral-600 flex items-center justify-center space-x-2">
                  <span>🟢</span>
                  <span>出発地を入力中：地図上の地点をタップするか、下のフィールドに直接入力</span>
                </p>
              </div>
            )}
            {selectionMode === 'destination' && (
              <div className="bg-coral-500/10 border border-coral-500/20 py-3 px-4 rounded-xl">
                <p className="subheadline text-coral-600 flex items-center justify-center space-x-2">
                  <span>🔴</span>
                  <span>目的地を入力中：地図上の地点をタップするか、下のフィールドに直接入力</span>
                </p>
              </div>
            )}
            
            {/* デバッグ情報表示（開発時のみ） */}
            {import.meta.env.DEV && (
              <div className="footnote text-system-tertiary-label bg-system-secondary-background py-2 px-3 rounded-lg">
                <div>選択モード: {selectionMode || 'なし'}</div>
                <div>出発地設定済み: {storeOrigin ? '✅' : '❌'}</div>
                <div>目的地設定済み: {storeDestination ? '✅' : '❌'}</div>
              </div>
            )}
          </div>

          {/* 移動手段選択 */}
          <div className="space-y-3">
            <label className="subheadline text-system-label">移動手段</label>
            <div className="flex justify-center space-x-2">
              {travelModes.map(({ mode, icon: Icon, label }) => (
                <div key={mode} className="relative">
                  <button
                    onClick={() => setSelectedMode(mode)}
                    className={`flex flex-col items-center p-3 rounded-xl 
                               transition-all duration-150 ease-ios-default
                               hover:scale-105 active:scale-95
                               ${
                                 selectedMode === mode
                                   ? 'bg-coral-500 text-white shadow-elevation-2'
                                   : 'bg-system-secondary-background text-system-secondary-label hover:bg-coral-500/10 hover:text-coral-500'
                               } ${mode === 'TRANSIT' ? 'relative' : ''}`}
                    title={mode === 'TRANSIT' ? '⚠️ 日本では詳細な公共交通機関データが提供されていません' : ''}
                  >
                    <Icon size={20} />
                    <span className="caption-1 mt-1 font-medium">{label}</span>
                    {mode === 'TRANSIT' && (
                      <span className="absolute -top-1 -right-1 caption-2">⚠️</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 公共交通機関の制限に関する注意書き */}
          {selectedMode === 'TRANSIT' && (
            <div className="glass-effect bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <span className="text-orange-500 mt-0.5 text-lg">⚠️</span>
                <div className="flex-1">
                  <div className="subheadline font-semibold text-orange-600 mb-2">
                    日本の公共交通機関について
                  </div>
                  <div className="footnote text-system-secondary-label space-y-1">
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
            <label className="subheadline text-system-label font-medium">出発地</label>
            <div className="flex space-x-2">
              <input 
                ref={originInputRef}
                type="text" 
                placeholder="出発地を入力してください"
                onChange={(e) => {
                  originValueRef.current = e.target.value;
                }}
                className="input flex-1"
              />
              <button
                onClick={() => {
                  setSelectionMode('origin');
                }}
                className={`px-4 py-3 rounded-lg border transition-all duration-150 ease-ios-default
                           hover:scale-105 active:scale-95
                           ${
                             selectionMode === 'origin' 
                               ? 'bg-coral-500 text-white border-coral-500 shadow-elevation-1' 
                               : storeOrigin
                               ? 'bg-coral-500/10 text-coral-600 border-coral-500/30'
                               : 'bg-system-secondary-background text-system-secondary-label border-system-separator hover:border-coral-500/30 hover:text-coral-500'
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
              className="p-3 bg-system-secondary-background hover:bg-coral-500/10 
                         rounded-full transition-all duration-150 ease-ios-default
                         hover:scale-110 active:scale-95
                         text-system-secondary-label hover:text-coral-500"
              title="出発地と目的地を入れ替え"
            >
              <MdSwapVert size={20} />
            </button>
          </div>

          {/* 目的地入力 */}
          <div className="space-y-2">
            <label className="subheadline text-system-label font-medium">目的地</label>
            <div className="flex space-x-2">
              <input 
                ref={destinationInputRef}
                type="text" 
                placeholder="目的地を入力してください"
                onChange={(e) => {
                  destinationValueRef.current = e.target.value;
                }}
                className="input flex-1"
              />
              <button
                onClick={() => {
                  setSelectionMode('destination');
                }}
                className={`px-4 py-3 rounded-lg border transition-all duration-150 ease-ios-default
                           hover:scale-105 active:scale-95
                           ${
                             selectionMode === 'destination' 
                               ? 'bg-coral-500 text-white border-coral-500 shadow-elevation-1' 
                               : storeDestination
                               ? 'bg-coral-500/10 text-coral-600 border-coral-500/30'
                               : 'bg-system-secondary-background text-system-secondary-label border-system-separator hover:border-coral-500/30 hover:text-coral-500'
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
            className="btn-primary w-full flex items-center justify-center space-x-2 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdSearch size={18} />
            <span>{isSearching ? '検索中...' : 'ルートを検索'}</span>
          </button>

          {/* 検索結果 */}
          {searchResult && (
            <div className="glass-effect rounded-xl p-4 shadow-elevation-1 
                            bg-teal-500/10 border border-teal-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                  {React.createElement(getTravelModeIcon(searchResult.mode), { 
                    size: 16, 
                    className: "text-teal-600" 
                  })}
                </div>
                <div>
                  <h3 className="subheadline font-semibold text-teal-700">
                    ルート検索結果
                  </h3>
                  <p className="caption-1 text-system-secondary-label">
                    {searchResult.mode === 'WALKING' && '徒歩'}
                    {searchResult.mode === 'DRIVING' && '車'}
                    {searchResult.mode === 'TRANSIT' && '公共交通機関'}
                    {searchResult.mode === 'BICYCLING' && '自転車'}
                  </p>
                </div>
              </div>
              
                             <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <span className="callout text-system-secondary-label">所要時間</span>
                   <span className="headline font-semibold text-teal-600">
                     {searchResult.duration}
                   </span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="callout text-system-secondary-label">距離</span>
                   <span className="subheadline font-medium text-system-label">
                     {searchResult.distance}
                   </span>
                 </div>
               </div>
               
               {/* クリアボタン */}
               <button
                 onClick={() => {
                   clearAllRoutes();
                   clearSelections();
                   setSearchResult(null);
                 }}
                 className="w-full mt-3 px-4 py-2 bg-system-secondary-background text-system-secondary-label
                            rounded-lg callout font-medium transition-all duration-150 ease-ios-default
                            hover:bg-coral-500/10 hover:text-coral-500 active:scale-95
                            border border-system-separator hover:border-coral-500/30"
                 title="ルートを削除"
               >
                 ルートをクリア
               </button>
            </div>
          )}
        </div>
      </Container>
    </>
  );
} 