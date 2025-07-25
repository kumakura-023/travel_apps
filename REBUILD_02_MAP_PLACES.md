# Phase 2: 地図・場所機能 - 詳細実装指示

## 目標
Google Maps APIを使用した地図表示と場所管理機能を実装する。パフォーマンス最適化と使いやすさを重視した設計とする。

## 実装期間
2-3週間

## 前提条件
- Phase 1の基盤構築が完了済み
- Google Maps APIキーが設定済み
- 基本ストアが動作中

## タスクリスト

### 1. Google Maps統合の構築

#### A. マップサービスの実装 (`src/services/api/mapService.ts`)
```typescript
import { GooglePlace } from '@/types/api';

class MapService {
  private map: google.maps.Map | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private directionsService: google.maps.DirectionsService | null = null;

  async initializeMap(container: HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map> {
    // Google Maps APIの遅延読み込み
    if (!window.google) {
      await this.loadGoogleMapsAPI();
    }

    this.map = new google.maps.Map(container, {
      zoom: 13,
      center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      ...options,
    });

    this.placesService = new google.maps.places.PlacesService(this.map);
    this.directionsService = new google.maps.DirectionsService();

    return this.map;
  }

  private async loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=ja`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
      document.head.appendChild(script);
    });
  }

  async searchPlaces(query: string, location?: google.maps.LatLng): Promise<GooglePlace[]> {
    if (!this.placesService) {
      throw new Error('Places service is not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.TextSearchRequest = {
        query,
        location,
        radius: 5000, // 5km
      };

      this.placesService!.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: GooglePlace[] = results.map(place => ({
            place_id: place.place_id!,
            name: place.name!,
            formatted_address: place.formatted_address!,
            geometry: {
              location: {
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng(),
              },
            },
            types: place.types!,
            rating: place.rating,
            photos: place.photos,
          }));
          resolve(places);
        } else {
          reject(new Error(`場所の検索に失敗しました: ${status}`));
        }
      });
    });
  }

  async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult> {
    if (!this.placesService) {
      throw new Error('Places service is not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'photos',
          'formatted_phone_number',
          'opening_hours',
          'website',
          'types',
        ],
      };

      this.placesService!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`場所の詳細取得に失敗しました: ${status}`));
        }
      });
    });
  }

  getMap(): google.maps.Map | null {
    return this.map;
  }
}

export const mapService = new MapService();
```

#### B. マップストアの実装 (`src/stores/mapStore.ts`)
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GooglePlace } from '@/types/api';

interface MapState {
  map: google.maps.Map | null;
  isLoaded: boolean;
  center: { lat: number; lng: number };
  zoom: number;
  searchResults: GooglePlace[];
  selectedPlace: GooglePlace | null;
  isSearching: boolean;
  searchError: string | null;
}

interface MapActions {
  setMap: (map: google.maps.Map) => void;
  setLoaded: (loaded: boolean) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setSearchResults: (results: GooglePlace[]) => void;
  setSelectedPlace: (place: GooglePlace | null) => void;
  setSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  clearSearch: () => void;
}

export const useMapStore = create<MapState & MapActions>()(
  immer((set) => ({
    // State
    map: null,
    isLoaded: false,
    center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
    zoom: 13,
    searchResults: [],
    selectedPlace: null,
    isSearching: false,
    searchError: null,

    // Actions
    setMap: (map) => set((state) => {
      state.map = map;
    }),

    setLoaded: (loaded) => set((state) => {
      state.isLoaded = loaded;
    }),

    setCenter: (center) => set((state) => {
      state.center = center;
    }),

    setZoom: (zoom) => set((state) => {
      state.zoom = zoom;
    }),

    setSearchResults: (results) => set((state) => {
      state.searchResults = results;
    }),

    setSelectedPlace: (place) => set((state) => {
      state.selectedPlace = place;
    }),

    setSearching: (searching) => set((state) => {
      state.isSearching = searching;
    }),

    setSearchError: (error) => set((state) => {
      state.searchError = error;
    }),

    clearSearch: () => set((state) => {
      state.searchResults = [];
      state.selectedPlace = null;
      state.searchError = null;
    }),
  }))
);
```

### 2. 地図コンポーネントの実装

#### A. メインマップコンポーネント (`src/components/map/Map.tsx`)
```typescript
import React, { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { usePlanStore } from '@/stores/planStore';
import { mapService } from '@/services/api/mapService';
import { PlaceMarkers } from './PlaceMarkers';
import { MapControls } from './MapControls';

interface MapProps {
  className?: string;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
}

export const Map: React.FC<MapProps> = ({ className, onMapClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const { 
    map, 
    isLoaded, 
    center, 
    zoom,
    setMap, 
    setLoaded,
    setCenter,
    setZoom
  } = useMapStore();
  const { currentPlan } = usePlanStore();

  // マップの初期化
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || map) return;

      try {
        const googleMap = await mapService.initializeMap(mapRef.current, {
          center,
          zoom,
        });

        setMap(googleMap);
        setLoaded(true);

        // イベントリスナーの設定
        googleMap.addListener('center_changed', () => {
          const newCenter = googleMap.getCenter();
          if (newCenter) {
            setCenter({
              lat: newCenter.lat(),
              lng: newCenter.lng(),
            });
          }
        });

        googleMap.addListener('zoom_changed', () => {
          setZoom(googleMap.getZoom() || 13);
        });

        if (onMapClick) {
          googleMap.addListener('click', onMapClick);
        }

      } catch (error) {
        console.error('マップの初期化に失敗:', error);
      }
    };

    initMap();
  }, [map, center, zoom, setMap, setLoaded, setCenter, setZoom, onMapClick]);

  // 現在の計画の場所に合わせてマップを調整
  useEffect(() => {
    if (!map || !currentPlan?.places.length) return;

    const bounds = new google.maps.LatLngBounds();
    currentPlan.places.forEach(place => {
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    map.fitBounds(bounds);
  }, [map, currentPlan?.places]);

  const handleResize = useCallback(() => {
    if (map) {
      google.maps.event.trigger(map, 'resize');
    }
  }, [map]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      
      {isLoaded && (
        <>
          <MapControls />
          <PlaceMarkers />
        </>
      )}
    </div>
  );
};
```

#### B. 場所マーカーコンポーネント (`src/components/map/PlaceMarkers.tsx`)
```typescript
import React, { useEffect, useRef } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useMapStore } from '@/stores/mapStore';
import { usePlanStore } from '@/stores/planStore';
import type { Place } from '@/types/core';

export const PlaceMarkers: React.FC = () => {
  const { map } = useMapStore();
  const { currentPlan } = usePlanStore();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  // カテゴリ別のマーカーアイコン
  const getMarkerIcon = (category: Place['category']): string => {
    const icons = {
      restaurant: '🍽️',
      hotel: '🏨',
      attraction: '🎯',
      shopping: '🛍️',
      transport: '🚌',
      other: '📍',
    };
    return icons[category];
  };

  // マーカーの作成
  useEffect(() => {
    if (!map || !currentPlan?.places) return;

    // 既存のマーカーをクリア
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    // 新しいマーカーを作成
    const markers = currentPlan.places.map(place => {
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" fill="white">
                ${getMarkerIcon(place.category)}
              </text>
            </svg>`
          )}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      });

      // クリックイベント
      marker.addListener('click', () => {
        // 場所詳細パネルを開く処理をここに追加
        console.log('Place clicked:', place);
      });

      return marker;
    });

    markersRef.current = markers;

    // マーカークラスタリング
    if (markers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        algorithm: new google.maps.marker.SuperClusterAlgorithm({
          radius: 60,
        }),
      });
    }

    // クリーンアップ
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
    };
  }, [map, currentPlan?.places]);

  return null; // このコンポーネントは直接的なレンダリングを行わない
};
```

### 3. 場所検索機能の実装

#### A. 検索バーコンポーネント (`src/components/places/SearchBar.tsx`)
```typescript
import React, { useState, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useMapStore } from '@/stores/mapStore';
import { mapService } from '@/services/api/mapService';
import { SearchResults } from './SearchResults';
import { useDebounce } from '@/hooks/shared/useDebounce';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const {
    center,
    searchResults,
    isSearching,
    searchError,
    setSearchResults,
    setSearching,
    setSearchError,
    clearSearch,
  } = useMapStore();

  // デバウンス検索
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const results = await mapService.searchPlaces(
        searchQuery,
        new google.maps.LatLng(center.lat, center.lng)
      );
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : '検索エラーが発生しました');
    } finally {
      setSearching(false);
    }
  }, [center, setSearching, setSearchError, setSearchResults, clearSearch]);

  // デバウンス検索の実行
  React.useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    clearSearch();
    setShowResults(false);
  };

  const handleSelectPlace = (place: any) => {
    setQuery(place.name);
    setShowResults(false);
  };

  // 外部クリックでの結果非表示
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="場所を検索..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg 
                   bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                   text-sm placeholder-gray-500"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 検索結果 */}
      {showResults && (
        <SearchResults
          results={searchResults}
          isLoading={isSearching}
          error={searchError}
          onSelectPlace={handleSelectPlace}
        />
      )}
    </div>
  );
};
```

#### B. 検索結果コンポーネント (`src/components/places/SearchResults.tsx`)
```typescript
import React from 'react';
import { MapPinIcon, StarIcon } from '@heroicons/react/24/outline';
import type { GooglePlace } from '@/types/api';

interface SearchResultsProps {
  results: GooglePlace[];
  isLoading: boolean;
  error: string | null;
  onSelectPlace: (place: GooglePlace) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  onSelectPlace,
}) => {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <p className="text-gray-500 text-sm">検索結果がありません</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
      <div className="py-2">
        {results.map((place) => (
          <button
            key={place.place_id}
            onClick={() => onSelectPlace(place)}
            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <MapPinIcon className="w-5 h-5 text-primary-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {place.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {place.formatted_address}
                </p>
                
                {place.rating && (
                  <div className="flex items-center mt-1">
                    <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-xs text-gray-600 ml-1">
                      {place.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 4. 場所管理機能の実装

#### A. 場所追加フック (`src/hooks/places/usePlaceActions.ts`)
```typescript
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { mapService } from '@/services/api/mapService';
import type { Place, PlaceCategory } from '@/types/core';
import type { GooglePlace } from '@/types/api';

export const usePlaceActions = () => {
  const { currentPlan, addPlace, updatePlace, deletePlace } = usePlanStore();
  const { user } = useAuthStore();

  const addPlaceFromGoogle = useCallback(async (
    googlePlace: GooglePlace,
    category: PlaceCategory = 'other'
  ): Promise<Place | null> => {
    if (!currentPlan || !user) return null;

    try {
      // Google Places APIから詳細情報を取得
      const details = await mapService.getPlaceDetails(googlePlace.place_id);
      
      const newPlace: Place = {
        id: uuidv4(),
        name: googlePlace.name,
        address: googlePlace.formatted_address,
        lat: googlePlace.geometry.location.lat,
        lng: googlePlace.geometry.location.lng,
        placeId: googlePlace.place_id,
        category,
        memo: '',
        rating: googlePlace.rating,
        photos: details.photos?.slice(0, 3).map(photo => 
          photo.getUrl({ maxWidth: 400, maxHeight: 300 })
        ) || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.id,
      };

      addPlace(currentPlan.id, newPlace);
      return newPlace;
    } catch (error) {
      console.error('場所の追加に失敗:', error);
      return null;
    }
  }, [currentPlan, user, addPlace]);

  const addPlaceManually = useCallback((
    name: string,
    address: string,
    lat: number,
    lng: number,
    category: PlaceCategory = 'other'
  ): Place | null => {
    if (!currentPlan || !user) return null;

    const newPlace: Place = {
      id: uuidv4(),
      name,
      address,
      lat,
      lng,
      category,
      memo: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.id,
    };

    addPlace(currentPlan.id, newPlace);
    return newPlace;
  }, [currentPlan, user, addPlace]);

  const updatePlaceInfo = useCallback((
    placeId: string,
    updates: Partial<Place>
  ) => {
    if (!currentPlan) return;

    updatePlace(currentPlan.id, placeId, {
      ...updates,
      updatedAt: new Date(),
    });
  }, [currentPlan, updatePlace]);

  const removePlaceFromPlan = useCallback((placeId: string) => {
    if (!currentPlan) return;
    deletePlace(currentPlan.id, placeId);
  }, [currentPlan, deletePlace]);

  return {
    addPlaceFromGoogle,
    addPlaceManually,
    updatePlaceInfo,
    removePlaceFromPlan,
  };
};
```

#### B. カテゴリフィルター (`src/components/places/CategoryFilter.tsx`)
```typescript
import React from 'react';
import { 
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  TruckIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import type { PlaceCategory } from '@/types/core';

interface CategoryFilterProps {
  selectedCategories: PlaceCategory[];
  onCategoryChange: (categories: PlaceCategory[]) => void;
}

const categoryConfig = {
  restaurant: { label: '飲食', icon: BuildingStorefrontIcon, color: 'bg-red-100 text-red-800' },
  hotel: { label: '宿泊', icon: BuildingOfficeIcon, color: 'bg-blue-100 text-blue-800' },
  attraction: { label: '観光', icon: MapPinIcon, color: 'bg-green-100 text-green-800' },
  shopping: { label: '買い物', icon: ShoppingBagIcon, color: 'bg-purple-100 text-purple-800' },
  transport: { label: '交通', icon: TruckIcon, color: 'bg-yellow-100 text-yellow-800' },
  other: { label: 'その他', icon: EllipsisHorizontalIcon, color: 'bg-gray-100 text-gray-800' },
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onCategoryChange,
}) => {
  const handleCategoryToggle = (category: PlaceCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const handleSelectAll = () => {
    const allCategories = Object.keys(categoryConfig) as PlaceCategory[];
    onCategoryChange(allCategories);
  };

  const handleClearAll = () => {
    onCategoryChange([]);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">カテゴリフィルター</h3>
        <div className="text-xs space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-primary-600 hover:text-primary-700"
          >
            すべて選択
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-gray-600 hover:text-gray-700"
          >
            クリア
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(categoryConfig).map(([category, config]) => {
          const isSelected = selectedCategories.includes(category as PlaceCategory);
          const Icon = config.icon;

          return (
            <button
              key={category}
              onClick={() => handleCategoryToggle(category as PlaceCategory)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors border
                ${isSelected 
                  ? `${config.color} border-current` 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

### 5. 共通フック・ユーティリティ

#### A. デバウンスフック (`src/hooks/shared/useDebounce.ts`)
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### B. 地理位置ユーティリティ (`src/utils/geoUtils.ts`)
```typescript
// 2点間の距離を計算（メートル）
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 現在位置を取得
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5分間キャッシュ
      }
    );
  });
}
```

## 完成チェックリスト

- [ ] Google Mapsが正常に表示される
- [ ] 場所検索が動作する
- [ ] 場所をマップに追加できる
- [ ] マーカーが正しく表示される
- [ ] カテゴリフィルターが動作する
- [ ] マーカークラスタリングが動作する
- [ ] レスポンシブデザインが適用されている
- [ ] パフォーマンスが良好（FCP < 1.5s）

## 次のフェーズ

地図・場所機能の実装が完了したら、`REBUILD_03_SYNC_MEMO.md`に進んで同期・メモ機能の実装を開始してください。

---

**重要**: この実装により、パフォーマンスが最適化された地図・場所管理機能が完成します。特にマーカークラスタリングと遅延読み込みにより、大量の場所データでも快適に動作します。