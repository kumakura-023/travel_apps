# 旅行計画Webアプリ - 予約機能実装ガイド

## 1. 概要

このドキュメントは、旅行計画Webアプリにおける予約サイト連携機能の実装詳細を記載します。
Google Maps上のPOI（Point of Interest）をクリックした際に、ホテルやレストランの予約サイトへ適切にユーザーを誘導する機能を実装します。

## 2. 技術アーキテクチャ

### 2.1 使用技術
- **Google Maps JavaScript API**: POI情報の取得
- **Google Places API**: 施設詳細情報の取得
- **React + TypeScript**: UI実装
- **Zustand**: 状態管理
- **Tailwind CSS**: スタイリング

### 2.2 データフロー
```
1. ユーザーが地図上のPOIをクリック
2. Places APIで詳細情報を取得
3. 施設タイプを判定（ホテル/レストラン等）
4. 対応する予約リンクを生成
5. 予約パネルUIを表示
6. ユーザーが予約サイトを選択
7. 新しいタブで予約サイトを開く
```

## 3. 実装ファイル構成

```
src/
├── services/
│   ├── bookingService.ts         # 予約リンク生成ロジック
│   └── placesService.ts          # Places API連携
├── hooks/
│   ├── usePOIHandler.ts          # POIクリックハンドリング
│   └── useBookingLinks.ts        # 予約リンク管理
├── components/
│   ├── HotelDetailsPanel.tsx     # ホテル詳細パネル
│   ├── RestaurantDetailsPanel.tsx # レストラン詳細パネル
│   └── BookingSiteSelector.tsx   # 予約サイト選択UI
├── types/
│   └── booking.ts                # 予約関連の型定義
└── utils/
    └── bookingHelpers.ts         # ヘルパー関数
```

## 4. 詳細実装

### 4.1 型定義

```typescript
// src/types/booking.ts

export interface BookingLinkParams {
  // 共通パラメータ
  name: string;                    // 施設名
  latitude?: number;               // 緯度
  longitude?: number;              // 経度
  
  // ホテル用パラメータ
  checkIn?: Date;                  // チェックイン日
  checkOut?: Date;                 // チェックアウト日
  adults?: number;                 // 大人の人数（デフォルト: 2）
  children?: number;               // 子供の人数（デフォルト: 0）
  rooms?: number;                  // 部屋数（デフォルト: 1）
  
  // レストラン用パラメータ
  reservationDate?: Date;          // 予約日
  reservationTime?: string;        // 予約時間（HH:mm形式）
  partySize?: number;              // 人数
}

export interface BookingLinks {
  [key: string]: string;           // サイト名: URL
}

export interface PlaceDetailsWithBooking extends google.maps.places.PlaceResult {
  bookingInfo?: {
    isBookable: boolean;           // 予約可能かどうか
    type: 'hotel' | 'restaurant'; // 施設タイプ
    supportedSites: string[];      // 対応予約サイト
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
  };
}

// 予約サイトの設定
export interface BookingSiteConfig {
  id: string;                      // サイト識別子
  name: string;                    // 表示名
  icon: string;                    // アイコンパス
  regions: string[];               // 対応地域
  types: ('hotel' | 'restaurant')[]; // 対応施設タイプ
}
```

### 4.2 予約リンク生成サービス

```typescript
// src/services/bookingService.ts

export class BookingService {
  // サポートする予約サイトの設定
  private static readonly BOOKING_SITES: BookingSiteConfig[] = [
    {
      id: 'booking',
      name: 'Booking.com',
      icon: '/icons/booking-com.svg',
      regions: ['global'],
      types: ['hotel']
    },
    {
      id: 'rakuten',
      name: '楽天トラベル',
      icon: '/icons/rakuten-travel.svg',
      regions: ['jp'],
      types: ['hotel']
    },
    {
      id: 'jalan',
      name: 'じゃらん',
      icon: '/icons/jalan.svg',
      regions: ['jp'],
      types: ['hotel']
    },
    {
      id: 'hotels',
      name: 'Hotels.com',
      icon: '/icons/hotels-com.svg',
      regions: ['global'],
      types: ['hotel']
    },
    {
      id: 'expedia',
      name: 'Expedia',
      icon: '/icons/expedia.svg',
      regions: ['global'],
      types: ['hotel']
    },
    {
      id: 'agoda',
      name: 'Agoda',
      icon: '/icons/agoda.svg',
      regions: ['asia', 'global'],
      types: ['hotel']
    },
    {
      id: 'gurunavi',
      name: 'ぐるなび',
      icon: '/icons/gurunavi.svg',
      regions: ['jp'],
      types: ['restaurant']
    },
    {
      id: 'tabelog',
      name: '食べログ',
      icon: '/icons/tabelog.svg',
      regions: ['jp'],
      types: ['restaurant']
    },
    {
      id: 'hotpepper',
      name: 'ホットペッパーグルメ',
      icon: '/icons/hotpepper.svg',
      regions: ['jp'],
      types: ['restaurant']
    },
    {
      id: 'opentable',
      name: 'OpenTable',
      icon: '/icons/opentable.svg',
      regions: ['global'],
      types: ['restaurant']
    }
  ];

  /**
   * ホテル予約リンクを生成
   */
  static generateHotelBookingLinks(params: BookingLinkParams): BookingLinks {
    const links: BookingLinks = {};
    
    // 各予約サイトのリンクを生成
    if (this.isAvailableInRegion('booking', params.latitude, params.longitude)) {
      links.booking = this.buildBookingUrl(params);
    }
    
    if (this.isAvailableInRegion('rakuten', params.latitude, params.longitude)) {
      links.rakuten = this.buildRakutenUrl(params);
    }
    
    if (this.isAvailableInRegion('jalan', params.latitude, params.longitude)) {
      links.jalan = this.buildJalanUrl(params);
    }
    
    // 他のサイトも同様に...
    
    return links;
  }

  /**
   * Booking.com用URL生成
   */
  private static buildBookingUrl(params: BookingLinkParams): string {
    const searchParams = new URLSearchParams();
    
    // 必須パラメータ
    searchParams.set('ss', params.name);
    
    // 日付パラメータ
    if (params.checkIn) {
      searchParams.set('checkin', this.formatDate(params.checkIn, 'yyyy-MM-dd'));
    }
    if (params.checkOut) {
      searchParams.set('checkout', this.formatDate(params.checkOut, 'yyyy-MM-dd'));
    }
    
    // 人数・部屋数
    searchParams.set('group_adults', (params.adults || 2).toString());
    searchParams.set('group_children', (params.children || 0).toString());
    searchParams.set('no_rooms', (params.rooms || 1).toString());
    
    // 位置情報（より正確な検索のため）
    if (params.latitude && params.longitude) {
      searchParams.set('latitude', params.latitude.toString());
      searchParams.set('longitude', params.longitude.toString());
    }
    
    // その他のパラメータ
    searchParams.set('sb_travel_purpose', 'leisure');
    searchParams.set('selected_currency', 'JPY');
    
    return `https://www.booking.com/searchresults.ja.html?${searchParams.toString()}`;
  }

  /**
   * 楽天トラベル用URL生成
   */
  private static buildRakutenUrl(params: BookingLinkParams): string {
    const searchParams = new URLSearchParams();
    
    // 施設名検索
    searchParams.set('f_query', params.name);
    
    // 日付（YYYYMMDD形式）
    if (params.checkIn) {
      searchParams.set('f_checkin', this.formatDate(params.checkIn, 'yyyyMMdd'));
    }
    if (params.checkOut) {
      searchParams.set('f_checkout', this.formatDate(params.checkOut, 'yyyyMMdd'));
    }
    
    // 人数
    searchParams.set('f_adult_num', (params.adults || 2).toString());
    if (params.children && params.children > 0) {
      searchParams.set('f_child_num', params.children.toString());
    }
    
    // 部屋数
    searchParams.set('f_room_num', (params.rooms || 1).toString());
    
    return `https://travel.rakuten.co.jp/search/result?${searchParams.toString()}`;
  }

  /**
   * じゃらん用URL生成
   */
  private static buildJalanUrl(params: BookingLinkParams): string {
    const searchParams = new URLSearchParams();
    
    searchParams.set('keyword', params.name);
    
    // 日付（YYYYMMDD形式）
    if (params.checkIn) {
      searchParams.set('checkInDate', this.formatDate(params.checkIn, 'yyyyMMdd'));
    }
    if (params.checkOut) {
      searchParams.set('checkOutDate', this.formatDate(params.checkOut, 'yyyyMMdd'));
    }
    
    // 人数・部屋数
    searchParams.set('adultNum', (params.adults || 2).toString());
    searchParams.set('roomNum', (params.rooms || 1).toString());
    
    return `https://www.jalan.net/uw/uwp2011/uww2011init.do?${searchParams.toString()}`;
  }

  /**
   * レストラン予約リンクを生成
   */
  static generateRestaurantBookingLinks(params: BookingLinkParams): BookingLinks {
    const links: BookingLinks = {};
    
    if (this.isAvailableInRegion('gurunavi', params.latitude, params.longitude)) {
      links.gurunavi = this.buildGurunaviUrl(params);
    }
    
    if (this.isAvailableInRegion('tabelog', params.latitude, params.longitude)) {
      links.tabelog = this.buildTabelogUrl(params);
    }
    
    // 他のレストラン予約サイトも同様に...
    
    return links;
  }

  /**
   * 地域判定
   */
  private static isAvailableInRegion(
    siteId: string, 
    lat?: number, 
    lng?: number
  ): boolean {
    const site = this.BOOKING_SITES.find(s => s.id === siteId);
    if (!site) return false;
    
    // グローバル対応サイトは常に利用可能
    if (site.regions.includes('global')) return true;
    
    // 位置情報がない場合はデフォルトで日本として扱う
    if (!lat || !lng) return site.regions.includes('jp');
    
    // 位置情報から地域を判定（簡易版）
    const isInJapan = lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154;
    
    return isInJapan && site.regions.includes('jp');
  }

  /**
   * 日付フォーマット
   */
  private static formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'yyyy-MM-dd':
        return `${year}-${month}-${day}`;
      case 'yyyyMMdd':
        return `${year}${month}${day}`;
      default:
        return date.toISOString();
    }
  }
}
```

### 4.3 POIハンドリングフック

```typescript
// src/hooks/usePOIHandler.ts

import { useEffect, useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import { PlacesService } from '../services/placesService';
import { PlaceDetailsWithBooking } from '../types/booking';

export const usePOIHandler = () => {
  const { map } = useMapStore();
  const [selectedPOI, setSelectedPOI] = useState<PlaceDetailsWithBooking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;

    // POIクリックイベントリスナー
    const clickListener = map.addListener('click', async (event: google.maps.MapMouseEvent) => {
      // POIがクリックされた場合のみ処理
      if (!event.placeId) return;
      
      // デフォルトの情報ウィンドウを無効化
      event.stop();
      
      // 詳細情報を取得
      await fetchPOIDetails(event.placeId);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map]);

  const fetchPOIDetails = useCallback(async (placeId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Places APIで詳細情報を取得
      const placeDetails = await PlacesService.getPlaceDetails(placeId);
      
      // 予約情報を付加
      const detailsWithBooking = await enrichWithBookingInfo(placeDetails);
      
      setSelectedPOI(detailsWithBooking);
    } catch (err) {
      console.error('Failed to fetch POI details:', err);
      setError('施設情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enrichWithBookingInfo = async (
    place: google.maps.places.PlaceResult
  ): Promise<PlaceDetailsWithBooking> => {
    // 施設タイプを判定
    const types = place.types || [];
    const isHotel = types.some(type => 
      ['lodging', 'hotel', 'motel', 'resort'].includes(type)
    );
    const isRestaurant = types.some(type => 
      ['restaurant', 'cafe', 'bar', 'food'].includes(type)
    );
    
    if (!isHotel && !isRestaurant) {
      return place as PlaceDetailsWithBooking;
    }
    
    // 予約情報を付加
    return {
      ...place,
      bookingInfo: {
        isBookable: true,
        type: isHotel ? 'hotel' : 'restaurant',
        supportedSites: isHotel 
          ? ['booking', 'rakuten', 'jalan', 'hotels', 'expedia', 'agoda']
          : ['gurunavi', 'tabelog', 'hotpepper', 'opentable'],
        priceRange: place.price_level ? {
          min: place.price_level * 1000,
          max: place.price_level * 3000,
          currency: 'JPY'
        } : undefined
      }
    };
  };

  const clearSelection = useCallback(() => {
    setSelectedPOI(null);
    setError(null);
  }, []);

  return {
    selectedPOI,
    isLoading,
    error,
    clearSelection
  };
};
```

### 4.4 Places APIサービス

```typescript
// src/services/placesService.ts

export class PlacesService {
  private static service: google.maps.places.PlacesService | null = null;

  /**
   * PlacesServiceの初期化
   */
  private static getService(): google.maps.places.PlacesService {
    if (!this.service) {
      // ダミーのdiv要素を使用してサービスを初期化
      const dummyElement = document.createElement('div');
      this.service = new google.maps.places.PlacesService(dummyElement);
    }
    return this.service;
  }

  /**
   * Place詳細情報を取得
   */
  static async getPlaceDetails(
    placeId: string
  ): Promise<google.maps.places.PlaceResult> {
    return new Promise((resolve, reject) => {
      const service = this.getService();
      
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'types',
          'website',
          'formatted_phone_number',
          'international_phone_number',
          'rating',
          'user_ratings_total',
          'price_level',
          'photos',
          'reviews',
          'opening_hours',
          'utc_offset_minutes'
        ],
        language: 'ja' // 日本語で情報を取得
      };
      
      service.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }

  /**
   * 近くの施設を検索
   */
  static async searchNearby(
    location: google.maps.LatLng,
    radius: number,
    type: string
  ): Promise<google.maps.places.PlaceResult[]> {
    return new Promise((resolve, reject) => {
      const service = this.getService();
      
      const request: google.maps.places.PlaceSearchRequest = {
        location,
        radius,
        type,
        language: 'ja'
      };
      
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }
}
```

### 4.5 UIコンポーネント実装

```typescript
// src/components/HotelDetailsPanel.tsx

import React, { useState, useMemo } from 'react';
import { X, Calendar, Star, MapPin, Phone, Globe, Clock, ChevronRight } from 'react-icons/fi';
import { BookingService } from '../services/bookingService';
import { PlaceDetailsWithBooking, BookingLinkParams } from '../types/booking';
import { useTravelPlanStore } from '../store/travelPlanStore';
import { useAnalytics } from '../hooks/useAnalytics';

interface HotelDetailsPanelProps {
  place: PlaceDetailsWithBooking;
  onClose: () => void;
  position: 'side' | 'bottom' | 'fullscreen'; // レスポンシブ対応
}

export const HotelDetailsPanel: React.FC<HotelDetailsPanelProps> = ({
  place,
  onClose,
  position
}) => {
  const { currentPlan, addPlace } = useTravelPlanStore();
  const { trackEvent } = useAnalytics();
  const [activeTab, setActiveTab] = useState<'info' | 'booking' | 'reviews'>('info');
  const [isAddingToItinerary, setIsAddingToItinerary] = useState(false);

  // 予約リンクを生成
  const bookingLinks = useMemo(() => {
    const params: BookingLinkParams = {
      name: place.name || '',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      checkIn: currentPlan?.dates?.checkIn,
      checkOut: currentPlan?.dates?.checkOut,
      adults: currentPlan?.travelers?.adults || 2,
      children: currentPlan?.travelers?.children || 0,
      rooms: currentPlan?.travelers?.rooms || 1
    };
    
    return BookingService.generateHotelBookingLinks(params);
  }, [place, currentPlan]);

  // 予約サイトクリック処理
  const handleBookingClick = (siteId: string, url: string) => {
    // アナリティクス送信
    trackEvent('hotel_booking_click', {
      place_id: place.place_id,
      hotel_name: place.name,
      booking_site: siteId,
      has_dates: !!currentPlan?.dates?.checkIn
    });

    // 新しいタブで開く
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 旅行計画に追加
  const handleAddToItinerary = async () => {
    if (!place.name || !place.geometry?.location) return;
    
    setIsAddingToItinerary(true);
    
    try {
      await addPlace({
        name: place.name,
        address: place.formatted_address || '',
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        },
        category: 'hotel',
        memo: '',
        estimatedCost: 0,
        googlePlaceId: place.place_id
      });
      
      trackEvent('place_added_from_poi', {
        place_id: place.place_id,
        category: 'hotel'
      });
      
      // 成功メッセージ表示（トースト通知など）
      console.log('Added to itinerary successfully');
    } catch (error) {
      console.error('Failed to add to itinerary:', error);
    } finally {
      setIsAddingToItinerary(false);
    }
  };

  // ポジションに応じたクラス名
  const panelClasses = {
    side: 'fixed right-0 top-0 h-full w-[400px] shadow-xl',
    bottom: 'fixed bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl shadow-xl',
    fullscreen: 'fixed inset-0'
  };

  return (
    <div className={`bg-white z-50 overflow-hidden flex flex-col ${panelClasses[position]}`}>
      {/* ヘッダー */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold truncate flex-1 mr-4">
            {place.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* タブ */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'booking'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            予約
          </button>
          {place.reviews && place.reviews.length > 0 && (
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              レビュー ({place.reviews.length})
            </button>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {/* 基本情報タブ */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-4">
            {/* 写真 */}
            {place.photos && place.photos.length > 0 && (
              <div className="relative h-48 rounded-lg overflow-hidden">
                <img
                  src={place.photos[0].getUrl({ maxWidth: 800 })}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 評価 */}
            {place.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="ml-1 font-medium">{place.rating}</span>
                </div>
                <span className="text-gray-500">
                  ({place.user_ratings_total}件のレビュー)
                </span>
              </div>
            )}

            {/* 住所 */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">{place.formatted_address}</p>
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                >
                  Google Maps で見る
                </a>
              </div>
            </div>

            {/* 電話番号 */}
            {place.formatted_phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a
                  href={`tel:${place.international_phone_number}`}
                  className="text-sm text-gray-700 hover:text-blue-600"
                >
                  {place.formatted_phone_number}
                </a>
              </div>
            )}

            {/* ウェブサイト */}
            {place.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  公式サイト
                </a>
              </div>
            )}

            {/* 営業時間 */}
            {place.opening_hours && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className={`font-medium ${
                    place.opening_hours.isOpen() ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {place.opening_hours.isOpen() ? '営業中' : '営業時間外'}
                  </p>
                  <div className="mt-1 text-gray-600">
                    {place.opening_hours.weekday_text?.map((text, index) => (
                      <p key={index}>{text}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 価格レベル */}
            {place.price_level !== undefined && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">価格帯:</span>
                <span className="text-sm font-medium">
                  {'¥'.repeat(place.price_level + 1)}
                </span>
              </div>
            )}

            {/* 旅行計画に追加ボタン */}
            <button
              onClick={handleAddToItinerary}
              disabled={isAddingToItinerary}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
            >
              {isAddingToItinerary ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  追加中...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  旅行計画に追加
                </>
              )}
            </button>
          </div>
        )}

        {/* 予約タブ */}
        {activeTab === 'booking' && (
          <div className="p-4 space-y-4">
            {/* 日付未設定の警告 */}
            {(!currentPlan?.dates?.checkIn || !currentPlan?.dates?.checkOut) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      旅行日程が設定されていません
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      日程を設定すると、より正確な空室検索ができます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 予約サイト一覧 */}
            <div className="space-y-3">
              {Object.entries(bookingLinks).map(([siteId, url]) => {
                const siteConfig = BookingService.getSiteConfig(siteId);
                if (!siteConfig) return null;

                return (
                  <button
                    key={siteId}
                    onClick={() => handleBookingClick(siteId, url)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500
                             hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={siteConfig.icon}
                          alt={siteConfig.name}
                          className="w-8 h-8 object-contain"
                        />
                        <div className="text-left">
                          <p className="font-medium text-gray-900 group-hover:text-blue-600">
                            {siteConfig.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            空室を検索
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 予約のヒント */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900">予約のヒント</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 複数のサイトで価格を比較することをおすすめします</li>
                <li>• 会員限定の割引がある場合があります</li>
                <li>• キャンセルポリシーを必ず確認してください</li>
              </ul>
            </div>
          </div>
        )}

        {/* レビュータブ */}
        {activeTab === 'reviews' && place.reviews && (
          <div className="p-4 space-y-4">
            {place.reviews.map((review, index) => (
              <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{review.author_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-500 ml-1">
                        {review.relative_time_description}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4.6 レストラン予約パネル

```typescript
// src/components/RestaurantDetailsPanel.tsx

import React, { useState, useMemo } from 'react';
import { BookingService } from '../services/bookingService';
import { PlaceDetailsWithBooking } from '../types/booking';

export const RestaurantDetailsPanel: React.FC<{
  place: PlaceDetailsWithBooking;
  onClose: () => void;
}> = ({ place, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [partySize, setPartySize] = useState<number>(2);

  const bookingLinks = useMemo(() => {
    return BookingService.generateRestaurantBookingLinks({
      name: place.name || '',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      partySize
    });
  }, [place, selectedDate, selectedTime, partySize]);

  // レストラン用のUIを実装...
  // (基本的な構造はホテルと同様だが、日時・人数選択UIを追加)
};
```

### 4.7 スタイリング

```css
/* src/styles/booking-panel.css */

/* 共通スタイル */
.booking-panel {
  @apply bg-white shadow-xl;
}

/* デスクトップ用サイドパネル */
@media (min-width: 1024px) {
  .booking-panel-side {
    @apply fixed right-0 top-0 h-full w-96 lg:w-[28rem];
    animation: slideInRight 0.3s ease-out;
  }
}

/* タブレット用ボトムシート */
@media (min-width: 768px) and (max-width: 1023px) {
  .booking-panel-bottom {
    @apply fixed bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl;
    animation: slideInUp 0.3s ease-out;
  }
}

/* モバイル用フルスクリーン */
@media (max-width: 767px) {
  .booking-panel-fullscreen {
    @apply fixed inset-0 z-50;
    animation: fadeIn 0.2s ease-out;
  }
}

/* アニメーション */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 予約サイトボタン */
.booking-site-button {
  @apply w-full p-4 border rounded-lg transition-all duration-200;
  @apply hover:border-blue-500 hover:bg-blue-50 hover:shadow-md;
  @apply active:scale-[0.98];
}

.booking-site-icon {
  @apply w-8 h-8 object-contain;
  filter: grayscale(0.2);
}

.booking-site-button:hover .booking-site-icon {
  filter: grayscale(0);
}
```

## 5. エラーハンドリング

### 5.1 エラーケース

```typescript
// src/utils/errorHandling.ts

export enum BookingErrorType {
  PLACES_API_ERROR = 'PLACES_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INVALID_PLACE_TYPE = 'INVALID_PLACE_TYPE',
  MISSING_REQUIRED_DATA = 'MISSING_REQUIRED_DATA'
}

export class BookingError extends Error {
  constructor(
    public type: BookingErrorType,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export const handleBookingError = (error: unknown): string => {
  if (error instanceof BookingError) {
    switch (error.type) {
      case BookingErrorType.PLACES_API_ERROR:
        return '施設情報の取得に失敗しました。しばらく待ってから再度お試しください。';
      case BookingErrorType.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      case BookingErrorType.RATE_LIMIT_ERROR:
        return 'リクエスト制限に達しました。しばらく待ってから再度お試しください。';
      case BookingErrorType.INVALID_PLACE_TYPE:
        return 'この施設は予約に対応していません。';
      case BookingErrorType.MISSING_REQUIRED_DATA:
        return '必要な情報が不足しています。';
      default:
        return 'エラーが発生しました。';
    }
  }
  
  return 'エラーが発生しました。';
};
```

## 6. パフォーマンス最適化

### 6.1 キャッシュ戦略

```typescript
// src/utils/placeCache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class PlaceCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5分

  static set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  static clear(): void {
    this.cache.clear();
  }
}

// 使用例
export const getCachedPlaceDetails = async (
  placeId: string
): Promise<google.maps.places.PlaceResult> => {
  const cacheKey = `place_${placeId}`;
  const cached = PlaceCache.get<google.maps.places.PlaceResult>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const details = await PlacesService.getPlaceDetails(placeId);
  PlaceCache.set(cacheKey, details);
  
  return details;
};
```

### 6.2 遅延読み込み

```typescript
// src/components/LazyBookingPanel.tsx

import { lazy, Suspense } from 'react';

const HotelDetailsPanel = lazy(() => import('./HotelDetailsPanel'));
const RestaurantDetailsPanel = lazy(() => import('./RestaurantDetailsPanel'));

export const LazyBookingPanel: React.FC<{
  place: PlaceDetailsWithBooking;
  onClose: () => void;
}> = ({ place, onClose }) => {
  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      {place.bookingInfo?.type === 'hotel' ? (
        <HotelDetailsPanel place={place} onClose={onClose} />
      ) : (
        <RestaurantDetailsPanel place={place} onClose={onClose} />
      )}
    </Suspense>
  );
};
```

## 7. テスト

### 7.1 ユニットテスト例

```typescript
// src/services/__tests__/bookingService.test.ts

import { BookingService } from '../bookingService';

describe('BookingService', () => {
  describe('generateHotelBookingLinks', () => {
    it('should generate correct Booking.com URL', () => {
      const params = {
        name: 'ヒルトン東京',
        checkIn: new Date('2024-03-01'),
        checkOut: new Date('2024-03-03'),
        adults: 2,
        rooms: 1
      };
      
      const links = BookingService.generateHotelBookingLinks(params);
      
      expect(links.booking).toContain('booking.com');
      expect(links.booking).toContain('ss=%E3%83%92%E3%83%AB%E3%83%88%E3%83%B3%E6%9D%B1%E4%BA%AC');
      expect(links.booking).toContain('checkin=2024-03-01');
      expect(links.booking).toContain('checkout=2024-03-03');
    });
  });
});
```

## 8. 分析とトラッキング

### 8.1 イベントトラッキング

```typescript
// src/hooks/useAnalytics.ts

export const useAnalytics = () => {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }
    
    // カスタムアナリティクス
    console.log('[Analytics]', eventName, parameters);
  };

  return { trackEvent };
};

// トラッキングイベント定義
export const BOOKING_EVENTS = {
  POI_CLICKED: 'poi_clicked',
  BOOKING_PANEL_OPENED: 'booking_panel_opened',
  BOOKING_SITE_CLICKED: 'booking_site_clicked',
  PLACE_ADDED_FROM_POI: 'place_added_from_poi',
  BOOKING_TAB_VIEWED: 'booking_tab_viewed'
};
```

## 9. 注意事項とベストプラクティス

### 9.1 実装時の注意点

1. **API制限への対応**
   - Google Places APIには利用制限があるため、キャッシュを活用
   - 不要なAPI呼び出しを避ける

2. **レスポンシブデザイン**
   - デバイスサイズに応じて適切なUIを表示
   - タッチ操作とマウス操作の両方に対応

3. **アクセシビリティ**
   - キーボード操作に対応
   - スクリーンリーダー用のARIA属性を適切に設定

4. **パフォーマンス**
   - 大きなコンポーネントは遅延読み込み
   - 画像は適切なサイズで読み込む

### 9.2 セキュリティ

1. **外部リンク**
   - `rel="noopener noreferrer"` を必ず設定
   - ユーザーデータを含むURLパラメータは最小限に

2. **APIキー**
   - Google Maps APIキーは適切に制限
   - HTTPリファラー制限を設定

## 10. 今後の拡張案

1. **価格比較機能**
   - 各予約サイトの価格をリアルタイムで取得・表示

2. **予約確認機能**
   - メールから予約情報を自動取得
   - カレンダーへの自動登録

3. **オフライン対応**
   - 予約リンクをオフラインで保存
   - オンライン復帰時に通知

4. **AI推奨機能**
   - ユーザーの好みに基づいたホテル推奨
   - 最適な予約タイミングの提案