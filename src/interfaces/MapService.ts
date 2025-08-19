/**
 * 地図操作のインターフェース
 * Google Maps APIへの依存を抽象化し、実装詳細を隠蔽
 */

export interface MapService {
  // 地図の基本操作
  addEventListener(event: string, callback: (e: any) => void): void;
  removeEventListener(event: string, callback: (e: any) => void): void;
  panTo(lat: number, lng: number, zoom?: number): void;
  getZoom(): number;
  setZoom(zoom: number): void;

  // 地図の状態
  isLoaded(): boolean;
  getCenter(): { lat: number; lng: number };
  setCenter(lat: number, lng: number): void;
}

/**
 * 地図設定のインターフェース
 */
export interface MapConfiguration {
  center: { lat: number; lng: number };
  zoom: number;
  options: {
    zoomControl: boolean;
    fullscreenControl: boolean;
    streetViewControl: boolean;
    mapTypeControl: boolean;
    gestureHandling: string;
    styles?: Array<{
      featureType: string;
      elementType: string;
      stylers: Array<{ [key: string]: any }>;
    }>;
  };
}

/**
 * 地図イベントのインターフェース
 */
export interface MapEvent {
  type: "click" | "zoom_changed" | "center_changed";
  latLng?: { lat: number; lng: number };
  placeId?: string;
  zoom?: number;
}

/**
 * 地図サービスの実装ファクトリー
 */
export interface MapServiceFactory {
  create(mapInstance: any): MapService;
}
