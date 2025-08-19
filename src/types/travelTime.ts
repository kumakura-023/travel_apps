// 型定義: 旅行時間機能
// 移動手段
export type TravelMode = "walking" | "driving" | "transit";

// Google Maps LatLngLiteral と同様の簡易型
export interface LatLng {
  lat: number;
  lng: number;
}

// 1 つの移動時間円を表す
export interface TravelCircle {
  id: string;
  center: LatLng;
  mode: TravelMode;
  minutes: number;
}
