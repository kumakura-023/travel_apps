import { useState, useCallback } from 'react';
import { useSelectedPlaceStore } from '../../../store/selectedPlaceStore';
import { useSavedPlacesStore } from '../../../store/savedPlacesStore';
import { usePlanStore } from '../../../store/planStore';
import { useRouteSearchStore } from '../../../store/routeStoreMigration';
import { useGoogleMaps } from '../../../hooks/useGoogleMaps';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { classifyCategory } from '../../../utils/categoryClassifier';
import { estimateCost } from '../../../utils/estimateCost';

export function usePlaceDetail() {
  const { place, setPlace } = useSelectedPlaceStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { deletePlace, addPlace, updatePlace } = useSavedPlacesStore((s) => ({ 
    deletePlace: s.deletePlace, 
    addPlace: s.addPlace,
    updatePlace: s.updatePlace
  }));
  const savedPlaces = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { plan } = usePlanStore();
  const { setSelectedOrigin, setSelectedDestination, openRouteSearch } = useRouteSearchStore();
  const { map } = useGoogleMaps();
  const { saveWithSyncManager } = useAutoSave(plan);

  // 登録済みか判定
  const saved = savedPlaces.some((p) => p.name === place?.name && p.address === place?.formatted_address);
  
  // 保存済み候補地の情報を取得
  const savedPlace = savedPlaces.find((p) => p.name === place?.name && p.address === place?.formatted_address);

  const getLatLng = useCallback(() => {
    if (!place) return null;
    const coords = (place as any).coordinates as { lat: number; lng: number } | undefined;
    const lat = place.geometry?.location?.lat() ?? coords?.lat;
    const lng = place.geometry?.location?.lng() ?? coords?.lng;
    if (lat === undefined || lng === undefined) return null;
    return { lat, lng } as { lat: number; lng: number };
  }, [place]);

  const handleRouteFromHere = useCallback(() => {
    const pos = getLatLng();
    if (!pos || !place) return;

    setSelectedOrigin({
      ...pos,
      name: place.name || '選択した地点',
    });
    openRouteSearch();
  }, [getLatLng, place, setSelectedOrigin, openRouteSearch]);

  const handleRouteToHere = useCallback(() => {
    const pos = getLatLng();
    if (!pos || !place) return;

    setSelectedDestination({
      ...pos,
      name: place.name || '選択した地点',
    });
    openRouteSearch();
  }, [getLatLng, place, setSelectedDestination, openRouteSearch]);

  const handleSavePlace = useCallback(() => {
    const pos = getLatLng();
    if (!pos || !place) return;

    if (saved) {
      // 既存の場合は削除
      const target = savedPlaces.find((p) => p.name === place.name && p.address === place.formatted_address);
      if (target) deletePlace(target.id);
    } else {
      // 新規追加
      const category = classifyCategory(place.types);
      const cost = estimateCost(place.price_level, category);
      const photos = place.photos ?? [];
      addPlace({
        name: place.name || '名前なし',
        address: place.formatted_address || '',
        category,
        estimatedCost: cost,
        coordinates: pos,
        scheduledDay: undefined,
        photos: photos.map(photo => 
          typeof photo === 'string' 
            ? photo 
            : photo.getUrl({ maxWidth: 800, maxHeight: 600 })
        ),
      });
    }
  }, [getLatLng, place, saved, savedPlaces, deletePlace, addPlace]);

  const handleNearbySearch = useCallback(() => {
    if (!map || !place) return;
    
    const pos = getLatLng();
    if (!pos) return;

    const request = {
      location: new google.maps.LatLng(pos.lat, pos.lng),
      radius: 1000,
      type: 'tourist_attraction',
    };

    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        console.log('Nearby places:', results);
        // 結果を表示する処理を追加
      }
    });
  }, [map, place, getLatLng]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setImageModalOpen(true);
  }, []);

  const handleScheduledDayChange = useCallback((day: number | undefined) => {
    if (!savedPlace) return;
    updatePlace(savedPlace.id, { scheduledDay: day });
  }, [savedPlace, updatePlace]);

  const handleClosePanel = useCallback(() => {
    setPlace(null);
  }, [setPlace]);

  return {
    place,
    saved,
    savedPlace,
    confirmOpen,
    setConfirmOpen,
    imageModalOpen,
    setImageModalOpen,
    selectedImageIndex,
    handleRouteFromHere,
    handleRouteToHere,
    handleSavePlace,
    handleNearbySearch,
    handleImageClick,
    handleScheduledDayChange,
    handleClosePanel,
    getLatLng,
    saveWithSyncManager,
  };
}