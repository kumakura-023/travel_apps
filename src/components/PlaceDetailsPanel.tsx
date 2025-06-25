import { useSelectedPlaceStore } from '../store/placeStore';
import { FiX } from 'react-icons/fi';
import { useMemo } from 'react';
import { BookingService } from '../services/bookingService';
import AddPlaceButton from './AddPlaceButton';

export default function PlaceDetailsPanel() {
  const { place, setPlace } = useSelectedPlaceStore();

  if (!place) return null;

  const photos = place.photos?.slice(0, 3) ?? [];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[540px] bg-white shadow-lg z-40 overflow-y-auto">
      <div className="relative">
        {photos.length > 0 && (
          <img
            src={photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })}
            alt={place.name || ''}
            className="w-full h-96 object-cover"
          />
        )}
        <button
          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
          onClick={() => setPlace(null)}
        >
          <FiX size={20} />
        </button>
      </div>
      <div className="p-4 space-y-2">
        <h2 className="text-2xl font-bold mb-2">{place.name}</h2>
        {place.formatted_address && (
          <p className="text-gray-700 text-base">{place.formatted_address}</p>
        )}
        {place.rating && (
          <p className="text-yellow-600 font-medium">★ {place.rating}</p>
        )}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            ウェブサイトへ
          </a>
        )}

        {/* ホテル予約リンク */}
        {place.types?.includes('lodging') && (
          <BookingLinksSection place={place} />
        )}
      </div>
      {/* 候補地追加ボタン */}
      <AddPlaceButton place={place} />
    </div>
  );
}

// separate component for booking links
function BookingLinksSection({ place }: { place: google.maps.places.PlaceResult }) {
  const links = useMemo(() => {
    return BookingService.generateHotelBookingLinks({
      name: place.name || '',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    });
  }, [place]);

  return (
    <div className="mt-4 space-y-3">
      {Object.entries(links).map(([site, url]) => (
        <button
          key={site}
          onClick={() => window.open(url, '_blank', 'noopener')}
          className="btn-primary w-full"
        >
          {site} で予約
        </button>
      ))}
    </div>
  );
}

// レストラン予約機能は削除済み 