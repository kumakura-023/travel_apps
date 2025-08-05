/**
 * 経路リクエストのインターフェース
 */
export interface RouteRequest {
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  travelMode: google.maps.TravelMode;
  waypoints?: Array<{
    location: {
      lat: number;
      lng: number;
    };
    stopover?: boolean;
  }>;
  optimizeWaypoints?: boolean;
}

/**
 * 経路結果のインターフェース
 */
export interface RouteResult {
  duration: number; // seconds
  distance: number; // meters  
  durationText: string;
  distanceText: string;
  route: google.maps.DirectionsResult;
  path: google.maps.LatLngLiteral[];
}

/**
 * 経路計算サービスのインターフェース
 * Google Maps Directions APIを抽象化
 */
export interface IDirectionsService {
  /**
   * 単一の経路を計算
   * @param request 経路リクエスト
   * @returns 経路結果
   */
  calculateRoute(request: RouteRequest): Promise<RouteResult>;

  /**
   * 複数の経路を一括計算
   * @param requests 経路リクエストの配列
   * @returns 経路結果の配列
   */
  calculateBatchRoutes(requests: RouteRequest[]): Promise<RouteResult[]>;

  /**
   * 経路計算のキャッシュをクリア
   */
  clearCache(): void;

  /**
   * 旅行時間を計算（分単位）
   * @param origin 出発地点
   * @param destination 到着地点
   * @param travelMode 移動手段
   * @returns 所要時間（分）
   */
  calculateTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: google.maps.TravelMode
  ): Promise<number>;

  /**
   * 距離を計算（メートル単位）
   * @param origin 出発地点
   * @param destination 到着地点
   * @param travelMode 移動手段
   * @returns 距離（メートル）
   */
  calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: google.maps.TravelMode
  ): Promise<number>;

  /**
   * 最適化された経路を計算
   * @param origin 出発地点
   * @param destination 到着地点
   * @param waypoints 経由地点
   * @param travelMode 移動手段
   * @returns 最適化された経路結果
   */
  calculateOptimizedRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: Array<{ lat: number; lng: number }>,
    travelMode: google.maps.TravelMode
  ): Promise<RouteResult>;
}