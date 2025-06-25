import React, { useMemo, useState } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import useMediaQuery from '../hooks/useMediaQuery';
import { useSelectedPlaceStore } from '../store/placeStore';
import { BookingService } from '../services/bookingService';
import AddPlaceButton from './AddPlaceButton';
import ConfirmDialog from './ConfirmDialog';
import { usePlacesStore } from '../store/placesStore';
import { formatCurrency } from '../utils/formatCurrency';

export default function PlaceDetailPanel() {
  const { place, setPlace } = useSelectedPlaceStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deletePlace = usePlacesStore((s) => s.deletePlace);
  const savedPlaces = usePlacesStore((s) => s.places);

  // ブレークポイント
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  if (!place) return null;

  // 該当POIの写真
  const photos = place.photos?.slice(0, 3) ?? [];

  // 登録済みか判定
  const saved = savedPlaces.some((p) => p.name === place.name && p.address === place.formatted_address);

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isDesktop) {
      return (
        <div className="fixed left-0 top-0 bottom-0 w-[540px] bg-white shadow-lg z-40 overflow-y-auto">
          {children}
        </div>
      );
    }
    if (isTablet) {
      return (
        <div className="fixed left-0 right-0 bottom-0 h-[50vh] bg-white rounded-t-2xl shadow-elevation-5 z-50 overflow-y-auto">
          {children}
        </div>
      );
    }
    // mobile full screen
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        {children}
      </div>
    );
  };

  return (
    <>
      {/* 背景スクリーン (mobile/tablet) */}
      {(!isDesktop) && <div className="modal-backdrop" onClick={() => setPlace(null)} />}

      <Container>
        <div className="relative">
          {photos.length > 0 && (
            <img
              src={photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })}
              alt={place.name || ''}
              className="w-full h-60 object-cover"
            />
          )}
          <button
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow" onClick={() => setPlace(null)}
          >
            <FiX size={20} />
          </button>
          {saved && (
            <button
              className="absolute top-2 right-10 p-1 bg-white rounded-full shadow"
              onClick={() => setConfirmOpen(true)}
            >
              <FiTrash2 size={18} />
            </button>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h2 className="title-2 font-semibold mb-1">{place.name}</h2>
          {place.formatted_address && (
            <p className="body text-system-secondary-label">{place.formatted_address}</p>
          )}
          {place.rating && (
            <p className="text-yellow-600 font-medium">★ {place.rating}</p>
          )}
          {/* 費用例 (ダミー) */}
          {saved && (
            <p className="headline font-medium pt-2">予想費用: {formatCurrency(15000)}</p>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral-500 underline"
            >
              ウェブサイトへ
            </a>
          )}

          {/* ホテル予約リンク */}
          {place.types?.includes('lodging') && <BookingLinksSection place={place} />}
        </div>
        {/* 候補地に追加 / 保存済みラベル */}
        <div className="p-4">
          <AddPlaceButton place={place} />
        </div>
      </Container>

      {/* 削除確認 */}
      <ConfirmDialog
        open={confirmOpen}
        title="削除確認"
        message="この地点を削除しますか？"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={() => {
          if (place.place_id) {
            const target = savedPlaces.find((p) => p.name === place.name && p.address === place.formatted_address);
            if (target) deletePlace(target.id);
          }
          setConfirmOpen(false);
          setPlace(null);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

// Booking Links Section remains same
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