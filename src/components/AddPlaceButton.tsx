import { usePlacesStore } from '../store/placesStore';
import { classifyCategory } from '../utils/categoryClassifier';
import { estimateCost } from '../utils/estimateCost';

interface Props {
  place: google.maps.places.PlaceResult;
}

export default function AddPlaceButton({ place }: Props) {
  const addPlace = usePlacesStore((s) => s.addPlace);

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
      });
      alert('候補地を追加しました (予想費用を自動設定)');
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

  return (
    <div className="mt-6">
      <button
        onClick={handleAdd}
        className="btn-primary w-full"
      >
        この場所を候補地に追加
      </button>
    </div>
  );
} 