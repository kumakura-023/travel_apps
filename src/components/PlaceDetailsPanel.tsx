import { useSelectedPlaceStore } from '../store/placeStore';
import { FiX } from 'react-icons/fi';
import { useMemo } from 'react';
import { BookingService } from '../services/bookingService';
import AddPlaceButton from './AddPlaceButton';

export default function PlaceDetailsPanel() {
  const { place, setPlace } = useSelectedPlaceStore();

  if (!place) return null;

  const photos = place.photos ?? [];

  return (
    <>
      {/* 背景 */}
      <div className="modal-backdrop" onClick={() => setPlace(null)} />
      
      <div className="fixed left-0 top-0 bottom-0 w-[540px] 
                      glass-effect shadow-elevation-5 border-r border-system-separator 
                      z-40 overflow-y-auto">
        {/* ヘッダー画像 */}
        <div className="relative">
          {photos.length > 0 && (
            <img
              src={photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })}
              alt={place.name || ''}
              className="w-full h-60 object-cover"
            />
          )}
        </div>
        
        {/* メイン情報 */}
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {/* タイトル行とクローズボタン */}
            <div className="flex items-start justify-between">
              <h2 className="title-2 text-system-label font-semibold flex-1 pr-3">{place.name}</h2>
              
              {/* 閉じるボタン */}
              <button
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 border border-gray-300
                           rounded-full shadow-elevation-1 
                           flex items-center justify-center flex-shrink-0
                           hover:shadow-elevation-2 hover:scale-105 
                           active:scale-95 transition-all duration-150 ease-ios-default"
                onClick={() => setPlace(null)}
                title="閉じる"
              >
                <FiX size={18} className="text-gray-600" />
              </button>
            </div>
            
            {place.formatted_address && (
              <div className="glass-effect rounded-lg p-3">
                <p className="body text-system-secondary-label leading-relaxed">
                  {place.formatted_address}
                </p>
              </div>
            )}
            
            {place.rating && (
              <div className="flex items-center space-x-2">
                <div className="text-yellow-500">★</div>
                <span className="subheadline font-medium text-system-label">{place.rating}</span>
              </div>
            )}
            
            {place.website && (
              <button
                onClick={() => window.open(place.website, '_blank', 'noopener noreferrer')}
                className="flex items-center space-x-2 text-coral-500 hover:text-coral-600 
                           transition-colors duration-150"
              >
                <span className="callout">ウェブサイトを開く</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}

            {/* ホテル予約リンク */}
            {place.types?.includes('lodging') && <BookingLinksSection place={place} />}
          </div>
        </div>
        
        {/* 候補地追加ボタン */}
        <div className="p-5">
          <AddPlaceButton place={place} />
        </div>
        
        {/* 底部の余白 */}
        <div className="h-5" />
      </div>
    </>
  );
}

// ホテル予約リンクセクション
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
      <h4 className="headline font-semibold text-system-label">宿泊予約</h4>
      <div className="space-y-2">
        {Object.entries(links).map(([site, url]) => (
          <button
            key={site}
            onClick={() => window.open(url, '_blank', 'noopener')}
            className="w-full px-4 py-3 bg-coral-500 hover:bg-coral-600 active:bg-coral-700
                       text-white rounded-lg shadow-elevation-2 hover:shadow-elevation-3
                       transition-all duration-150 ease-ios-default
                       active:scale-95 callout font-medium"
          >
            {site} で予約
          </button>
        ))}
      </div>
    </div>
  );
}

// レストラン予約機能は削除済み 