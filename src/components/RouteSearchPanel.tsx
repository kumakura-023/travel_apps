import React, { useState, useRef } from 'react';
import { MdClose, MdDirectionsCar, MdTrain, MdDirectionsWalk, MdDirectionsBike, MdFlight, MdSwapVert, MdSearch, MdNavigation } from 'react-icons/md';
import { Autocomplete } from '@react-google-maps/api';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { directionsService } from '../services/directionsService';

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

  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // 選択された地点の情報を反映
  React.useEffect(() => {
    if (selectedOrigin && !originText) {
      setOriginText(selectedOrigin.name);
      if (originInputRef.current) {
        originInputRef.current.value = selectedOrigin.name;
      }
    }
  }, [selectedOrigin, originText]);

  React.useEffect(() => {
    if (selectedDestination && !destinationText) {
      setDestinationText(selectedDestination.name);
      if (destinationInputRef.current) {
        destinationInputRef.current.value = selectedDestination.name;
      }
    }
  }, [selectedDestination, destinationText]);

  if (!isOpen) return null;

  const travelModes = [
    { mode: 'DRIVING' as TravelMode, icon: MdDirectionsCar, label: '車' },
    { mode: 'TRANSIT' as TravelMode, icon: MdTrain, label: '電車' },
    { mode: 'WALKING' as TravelMode, icon: MdDirectionsWalk, label: '徒歩' },
    { mode: 'BICYCLING' as TravelMode, icon: MdDirectionsBike, label: '自転車' },
  ];

  const handleSearch = async () => {
    if (!originText.trim() || !destinationText.trim()) {
      alert('出発地と目的地を入力してください');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      let originCoords: { lat: number; lng: number };
      let destinationCoords: { lat: number; lng: number };

      // 選択された地点の座標があればそれを使用、なければGeocoding APIを使用
      if (selectedOrigin && (originText === selectedOrigin.name || originText.includes(selectedOrigin.name))) {
        originCoords = selectedOrigin;
      } else {
        const geocoder = new google.maps.Geocoder();
        const originResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
          geocoder.geocode({ address: originText }, (results, status) => {
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

      if (selectedDestination && (destinationText === selectedDestination.name || destinationText.includes(selectedDestination.name))) {
        destinationCoords = selectedDestination;
      } else {
        const geocoder = new google.maps.Geocoder();
        const destinationResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
          geocoder.geocode({ address: destinationText }, (results, status) => {
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
      const routeResult = await directionsService.getRoute(
        originCoords,
        destinationCoords,
        google.maps.TravelMode[selectedMode]
      );

      setSearchResult({
        duration: routeResult.durationText,
        distance: routeResult.distanceText,
        mode: selectedMode
      });

    } catch (error) {
      console.error('経路検索エラー:', error);
      alert(`経路検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSwap = () => {
    const temp = originText;
    setOriginText(destinationText);
    setDestinationText(temp);
    
    // インプットの値も更新
    if (originInputRef.current) {
      originInputRef.current.value = destinationText;
    }
    if (destinationInputRef.current) {
      destinationInputRef.current.value = temp;
    }
  };

  const getTravelModeIcon = (mode: TravelMode) => {
    const modeData = travelModes.find(tm => tm.mode === mode);
    return modeData ? modeData.icon : MdDirectionsCar;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // 背景クリック時のみ閉じる（パネル内のクリックは無視）
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <MdNavigation className="text-blue-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">ルート検索</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MdClose size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 移動手段選択 */}
          <div className="flex justify-center space-x-2">
            {travelModes.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                  selectedMode === mode
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-1">{label}</span>
              </button>
            ))}
          </div>

          {/* 出発地入力 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">出発地</label>
            <Autocomplete
              onLoad={(autocomplete: google.maps.places.Autocomplete) => {
                originAutocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={() => {
                const place = originAutocompleteRef.current?.getPlace();
                if (place?.name) {
                  setOriginText(place.name);
                  if (originInputRef.current) {
                    originInputRef.current.value = place.name;
                  }
                } else if (place?.formatted_address) {
                  setOriginText(place.formatted_address);
                  if (originInputRef.current) {
                    originInputRef.current.value = place.formatted_address;
                  }
                }
              }}
            >
              <input
                ref={originInputRef}
                type="text"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="出発地を入力するか、地図をクリック"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </Autocomplete>
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
            <Autocomplete
              onLoad={(autocomplete: google.maps.places.Autocomplete) => {
                destinationAutocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={() => {
                const place = destinationAutocompleteRef.current?.getPlace();
                if (place?.name) {
                  setDestinationText(place.name);
                  if (destinationInputRef.current) {
                    destinationInputRef.current.value = place.name;
                  }
                } else if (place?.formatted_address) {
                  setDestinationText(place.formatted_address);
                  if (destinationInputRef.current) {
                    destinationInputRef.current.value = place.formatted_address;
                  }
                }
              }}
            >
              <input
                ref={destinationInputRef}
                type="text"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="目的地を入力"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </Autocomplete>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={isSearching || !originText.trim() || !destinationText.trim()}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <MdSearch size={20} />
            <span>{isSearching ? '検索中...' : '検索'}</span>
          </button>

          {/* 検索結果表示 */}
          {searchResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 