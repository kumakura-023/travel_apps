import { MapService, MapEvent } from "../interfaces/MapService";

/**
 * Google Maps APIをMapServiceインターフェースに適合させるアダプター
 * 依存性の逆転原則を適用し、Google Maps APIの具体的な実装を抽象インターフェースでラップ
 */
export class GoogleMapsServiceAdapter implements MapService {
  private mapInstance: google.maps.Map;
  private eventListeners: Map<string, google.maps.MapsEventListener[]> =
    new Map();

  constructor(mapInstance: google.maps.Map) {
    this.mapInstance = mapInstance;
  }

  // 地図の基本操作
  addEventListener(event: string, callback: (e: any) => void): void {
    const listener = this.mapInstance.addListener(event, callback);

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, callback: (e: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      // Google Maps APIでは個別のリスナーを削除する直接的な方法がないため、
      // 全てのリスナーを削除して再登録する方式を採用
      listeners.forEach((listener) => {
        google.maps.event.removeListener(listener);
      });
      this.eventListeners.delete(event);
    }
  }

  panTo(lat: number, lng: number, zoom?: number): void {
    const latLng = new google.maps.LatLng(lat, lng);
    this.mapInstance.panTo(latLng);

    if (zoom !== undefined) {
      this.setZoom(zoom);
    }
  }

  getZoom(): number {
    return this.mapInstance.getZoom() ?? 14;
  }

  setZoom(zoom: number): void {
    this.mapInstance.setZoom(zoom);
  }

  // 地図の状態
  isLoaded(): boolean {
    return this.mapInstance !== null && this.mapInstance !== undefined;
  }

  getCenter(): { lat: number; lng: number } {
    const center = this.mapInstance.getCenter();
    if (!center) {
      throw new Error("Map center is not available");
    }

    return {
      lat: center.lat(),
      lng: center.lng(),
    };
  }

  setCenter(lat: number, lng: number): void {
    const latLng = new google.maps.LatLng(lat, lng);
    this.mapInstance.setCenter(latLng);
  }

  // 追加のヘルパーメソッド
  getBounds(): {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null {
    const bounds = this.mapInstance.getBounds();
    if (!bounds) {
      return null;
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    return {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    };
  }

  fitBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): void {
    const googleBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(bounds.south, bounds.west),
      new google.maps.LatLng(bounds.north, bounds.east),
    );
    this.mapInstance.fitBounds(googleBounds);
  }

  // Google Maps特有の機能へのアクセス
  getGoogleMapInstance(): google.maps.Map {
    return this.mapInstance;
  }

  // クリーンアップ
  dispose(): void {
    // 全てのイベントリスナーを削除
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((listener) => {
        google.maps.event.removeListener(listener);
      });
    });
    this.eventListeners.clear();
  }
}

/**
 * GoogleMapsServiceAdapterのファクトリー
 */
export class GoogleMapsServiceFactory {
  static create(mapInstance: google.maps.Map): GoogleMapsServiceAdapter {
    return new GoogleMapsServiceAdapter(mapInstance);
  }
}
