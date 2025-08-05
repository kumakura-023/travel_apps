import React, { useState } from 'react';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { classifyCategory } from '../utils/categoryClassifier';
import { estimateCost } from '../utils/estimateCost';
import DaySelector from './DaySelector';

interface Props {
  place: google.maps.places.PlaceResult;
}

export default function AddPlaceButton({ place }: Props) {
  const addPlace = useSavedPlacesStore((s) => s.addPlace);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [showDaySelector, setShowDaySelector] = useState(false);

  const handleAdd = () => {
    if (!place.geometry?.location) return;
    const category = classifyCategory(place.types);

    const add = (priceLevel: number | undefined | null) => {
      addPlace({
        name: place.name || '名称未設定',
        address: place.formatted_address || '',
        coordinates: {
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        },
        category,
        memo: '',
        estimatedCost: estimateCost(priceLevel, category),
        photos: [],
        scheduledDay: selectedDay,
      });
      alert(`候補地を追加しました${selectedDay ? ` (${selectedDay}日目に予定)` : ''}`);
      setShowDaySelector(false);
      setSelectedDay(undefined);
    };

    if (place.price_level !== undefined && place.price_level !== null) {
      add(place.price_level);
    } else if (place.place_id) {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId: place.place_id, fields: ['price_level'] }, (detail, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
          add((detail as any).price_level);
        } else {
          add(undefined);
        }
      });
    } else {
      add(undefined);
    }
  };

  if (!showDaySelector) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setShowDaySelector(true)}
          className="btn-primary w-full"
        >
          この場所を候補地に追加
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <DaySelector
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
      />
      
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="btn-primary flex-1"
        >
          追加する
        </button>
        <button
          onClick={() => {
            setShowDaySelector(false);
            setSelectedDay(undefined);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 
                     hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
} 