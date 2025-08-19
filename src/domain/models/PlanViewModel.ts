export interface PlanViewModel {
  id: string;
  name: string;
  description?: string;
  places: PlaceViewModel[];
  labels: LabelViewModel[];
  totalCost: number;
  placeCount: number;
  labelCount: number;
  isLoading: boolean;
  error?: string | null;
}

export interface PlaceViewModel {
  id: string;
  name: string;
  position: google.maps.LatLngLiteral;
  category: string;
  estimatedCost: number;
  memo?: string;
  imageUrls: string[];
  isSelected: boolean;
}

export interface LabelViewModel {
  id: string;
  text: string;
  position: google.maps.LatLngLiteral;
  color: string;
  fontSize: number;
  isSelected: boolean;
}
