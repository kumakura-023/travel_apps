export type PlaceCategory =
  | 'hotel'
  | 'restaurant'
  | 'sightseeing'
  | 'shopping'
  | 'transport'
  | 'other';

export interface Place {
  id: string; // UUID
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  category: PlaceCategory;
  memo: string;
  estimatedCost: number;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  scheduledDay?: number; // 何日目に予定しているか（1始まり）
  labelText?: string;
  labelFontSize?: number;
  labelWidth?: number;
  labelHeight?: number;
  labelColor?: string;
  labelFontFamily?: string;
  labelHidden?: boolean;
  labelPosition?: {
    lat: number;
    lng: number;
  };
}

export interface TravelPlan {
  id: string; // UUID
  name: string; // 計画名
  description: string; // 説明
  places: Place[];
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  labels: MapLabel[]; // 付箋データ
  endDate: Date | null;
  startDate: Date | null;
}

export interface MapLabel {
  id: string;
  text: string;
  position: {
    lat: number;
    lng: number;
  };
  fontSize: number; // px
  fontFamily: string;
  color: string;
  width: number; // px
  height: number; // px
  linkedPlaceId?: string; // 候補地とのリンク
  createdAt: Date; // 作成時刻
  updatedAt: Date; // 更新時刻
}

// 2地点間移動時間表示のための型定義
export interface RouteConnection {
  id: string;
  originId: string; // 出発地点のID（PlaceのIDまたはTravelCircleのID）
  destinationId: string; // 到着地点のID
  originCoordinates: {
    lat: number;
    lng: number;
  };
  destinationCoordinates: {
    lat: number;
    lng: number;
  };
  travelMode: google.maps.TravelMode;
  duration: number; // seconds
  distance: number; // meters
  durationText: string;
  distanceText: string;
  route: google.maps.DirectionsResult;
  createdAt: Date;
}

// 地点選択状態の管理
export interface PlaceSelectionState {
  isSelecting: boolean;
  selectedPlaceId: string | null;
  selectionMode: 'ctrl-click' | 'long-press' | null;
}

// モバイル/デスクトップでの操作方法
export type SelectionMethod = 'ctrl-click' | 'long-press';

export type { RouteConnection as Route }; 