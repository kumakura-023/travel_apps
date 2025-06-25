import { usePlacesStore } from '../store/placesStore';
import { classifyCategory } from '../utils/categoryClassifier';

interface Props {
  place: google.maps.places.PlaceResult;
}

export default function AddPlaceButton({ place }: Props) {
  const addPlace = usePlacesStore((s) => s.addPlace);

  const handleAdd = () => {
    if (!place.geometry?.location) return;
    const category = classifyCategory(place.types);

    addPlace({
      name: place.name || '名称未設定',
      address: place.formatted_address || '',
      coordinates: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
      category,
      memo: '',
      estimatedCost: 0,
      photos: [],
    });
    alert('候補地に追加しました');
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