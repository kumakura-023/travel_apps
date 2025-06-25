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
} 