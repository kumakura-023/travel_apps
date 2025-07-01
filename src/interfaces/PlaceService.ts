/**
 * 地点操作のインターフェース
 * Places APIへの依存を抽象化し、実装詳細を隠蔽
 */

export interface PlaceDetails {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  photos?: string[];
  website?: string;
  types?: string[];
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  types?: string[];
}

export interface PlaceService {
  // 地点検索
  searchPlaces(query: string): Promise<PlaceSearchResult[]>;
  
  // 地点詳細取得
  getPlaceDetails(placeId: string): Promise<PlaceDetails | null>;
  
  // オートコンプリート
  getAutocompleteSuggestions(input: string): Promise<PlaceSearchResult[]>;
  
  // 周辺地点検索
  searchNearbyPlaces(
    location: { lat: number; lng: number },
    radius: number,
    types?: string[]
  ): Promise<PlaceSearchResult[]>;
}

/**
 * 地点サービスの設定
 */
export interface PlaceServiceConfig {
  apiKey: string;
  language?: string;
  region?: string;
  sessionToken?: string;
}

/**
 * 地点サービスの実装ファクトリー
 */
export interface PlaceServiceFactory {
  create(config: PlaceServiceConfig): PlaceService;
} 