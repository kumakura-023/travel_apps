// src/types/region.ts
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Prefecture {
  code: string; // "13"
  name: string; // "東京都"
  nameEn: string; // "Tokyo"
  center: LatLng; // 代表座標
}

export interface City {
  code: string; // "13101"
  name: string; // "千代田区"
  nameEn: string; // "Chiyoda"
  center: LatLng; // 代表座標
  searchRadius: number; // 検索半径（m）
}

export interface RegionData {
  prefectures: Prefecture[];
}

export interface CityData {
  prefectureCode: string;
  cities: City[];
}
