import { useCallback, useMemo } from 'react';
import { usePlanData } from './usePlanData';
import { PlaceViewModel, LabelViewModel } from '../domain/models/PlanViewModel';

export interface MapDataHook {
  places: PlaceViewModel[];
  labels: LabelViewModel[];
  selectedPlace: PlaceViewModel | null;
  selectedLabel: LabelViewModel | null;
  mapCenter: google.maps.LatLngLiteral | null;
  
  onPlaceClick: (place: PlaceViewModel) => void;
  onMapClick: (position: google.maps.LatLngLiteral) => void;
  onLabelClick: (label: LabelViewModel) => void;
  onPlaceAdd: (position: google.maps.LatLngLiteral, name: string) => Promise<void>;
  onLabelAdd: (position: google.maps.LatLngLiteral, text: string) => Promise<void>;
}

export function useMapData(): MapDataHook {
  const { plan, selectPlace, selectLabel, addPlace, addLabel } = usePlanData();
  
  const selectedPlace = useMemo(() => 
    plan?.places.find(p => p.isSelected) || null
  , [plan?.places]);
  
  const selectedLabel = useMemo(() => 
    plan?.labels.find(l => l.isSelected) || null
  , [plan?.labels]);
  
  const mapCenter = useMemo(() => {
    if (plan?.places && plan.places.length > 0) {
      // 全プレイスの中心を計算
      const lat = plan.places.reduce((sum, p) => sum + p.position.lat, 0) / plan.places.length;
      const lng = plan.places.reduce((sum, p) => sum + p.position.lng, 0) / plan.places.length;
      return { lat, lng };
    }
    return null;
  }, [plan?.places]);
  
  const onPlaceClick = useCallback((place: PlaceViewModel) => {
    selectPlace(place.id);
  }, [selectPlace]);
  
  const onMapClick = useCallback((position: google.maps.LatLngLiteral) => {
    // マップクリック時の処理（選択解除など）
    selectPlace(null);
    selectLabel(null);
  }, [selectPlace, selectLabel]);
  
  const onLabelClick = useCallback((label: LabelViewModel) => {
    selectLabel(label.id);
  }, [selectLabel]);
  
  const onPlaceAdd = useCallback(async (position: google.maps.LatLngLiteral, name: string) => {
    await addPlace({
      name,
      coordinates: position,
      category: 'other'
    });
  }, [addPlace]);
  
  const onLabelAdd = useCallback(async (position: google.maps.LatLngLiteral, text: string) => {
    await addLabel({
      text,
      position,
      color: '#000000',
      fontSize: 14
    });
  }, [addLabel]);
  
  return {
    places: plan?.places || [],
    labels: plan?.labels || [],
    selectedPlace,
    selectedLabel,
    mapCenter,
    onPlaceClick,
    onMapClick,
    onLabelClick,
    onPlaceAdd,
    onLabelAdd
  };
}