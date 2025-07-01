import React, { useMemo, useState, useRef } from 'react';
import { FiX, FiTrash2, FiBookmark, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MdDirections } from 'react-icons/md';
import useMediaQuery from '../hooks/useMediaQuery';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { BookingService } from '../services/bookingService';
import ConfirmDialog from './ConfirmDialog';
import { usePlacesStore } from '../store/placesStore';
import { formatCurrency } from '../utils/formatCurrency';
import { classifyCategory } from '../utils/categoryClassifier';
import { getCategoryPath, getCategoryColor, getCategoryDisplayName } from '../utils/categoryIcons';
import { estimateCost } from '../utils/estimateCost';

export default function PlaceDetailPanel() {
  const { place, setPlace } = useSelectedPlaceStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { deletePlace, addPlace } = usePlacesStore((s) => ({ 
    deletePlace: s.deletePlace, 
    addPlace: s.addPlace 
  }));
  const savedPlaces = usePlacesStore((s) => s.places);
  const { setSelectedOrigin, setSelectedDestination, openRouteSearch } = useRouteSearchStore();
  const { map } = useGoogleMaps();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ブレークポイント
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  if (!place) return null;

  // 該当POIの写真
  const photos = place.photos ?? [];

  // 登録済みか判定
  const saved = savedPlaces.some((p) => p.name === place.name && p.address === place.formatted_address);

  const getLatLng = () => {
    const coords = (place as any).coordinates as { lat: number; lng: number } | undefined;
    const lat = place.geometry?.location?.lat() ?? coords?.lat;
    const lng = place.geometry?.location?.lng() ?? coords?.lng;
    if (lat === undefined || lng === undefined) return null;
    return { lat, lng } as { lat: number; lng: number };
  };

  const handleRouteFromHere = () => {
    const pos = getLatLng();
    if (!pos) return;

    setSelectedOrigin({
      ...pos,
      name: place.name || '選択した地点',
    });
    openRouteSearch();
  };

  const handleRouteToHere = () => {
    const pos = getLatLng();
    if (!pos) return;

    setSelectedDestination({
      ...pos,
      name: place.name || '選択した地点',
    });
    openRouteSearch();
  };

  const handleSavePlace = () => {
    const pos = getLatLng();
    if (!pos) return;

    if (saved) {
      // 既に保存済みの場合は削除
      const target = savedPlaces.find(
        (p) => p.name === place.name && p.address === place.formatted_address,
      );
      if (target) {
        deletePlace(target.id);
      }
    } else {
      // 新規保存
      const category = classifyCategory(place.types);
      addPlace({
        name: place.name || '名称未設定',
        address: place.formatted_address || '',
        coordinates: pos,
        category,
        memo: '',
        estimatedCost: estimateCost((place as any).price_level, category),
        photos: [],
      });
    }
  };

  const handleNearbySearch = () => {
    const pos = getLatLng();
    if (!pos || !map) return;

    const location = new google.maps.LatLng(pos.lat, pos.lng);
    // Places APIで周辺検索を実行
    const service = new google.maps.places.PlacesService(map);
    const request: google.maps.places.PlaceSearchRequest = {
      location,
      radius: 1000, // 1km圏内
      type: 'point_of_interest',
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        console.log('付近の施設:', results);
        // 検索結果をマップ上に表示する処理を実装
      } else {
        console.error('付近検索に失敗しました:', status);
      }
    });
  };

  // 画像スクロール機能
  const scrollImages = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 140; // 画像幅 + 間隔
    const currentScroll = scrollContainerRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

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
              src={typeof photos[0] === 'string' ? photos[0] : photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })}
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
          {/* カテゴリ表示を追加 */}
          {saved && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getCategoryColor(classifyCategory(place.types)) }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white"
                  >
                    <path
                      d={getCategoryPath(classifyCategory(place.types))}
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">
                  {getCategoryDisplayName(classifyCategory(place.types))}
                </span>
              </div>
            </div>
          )}
          {place.rating && (
            <p className="text-yellow-600 font-medium">★ {place.rating}</p>
          )}
          {/* 費用例 (ダミー) */}
          {saved && (
            <p className="headline font-medium pt-2">
              予想費用: {formatCurrency(savedPlaces.find(p => p.name === place.name && p.address === place.formatted_address)?.estimatedCost ?? 0)}
            </p>
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
                 {/* アクションボタン */}
         <div className="p-4 border-t border-system-separator">
           <div className="grid grid-cols-2 gap-4 mb-4">
             {/* ここから出発 */}
             <button
               onClick={handleRouteFromHere}
               className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
               title="ここから出発"
             >
               <MdDirections size={24} className="text-blue-600 mb-1" />
               <span className="text-sm font-medium text-blue-800">ここから出発</span>
             </button>
             
             {/* ここに向かう */}
             <button
               onClick={handleRouteToHere}
               className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
               title="ここに向かう"
             >
               <MdDirections size={24} className="text-green-600 mb-1 transform rotate-180" />
               <span className="text-sm font-medium text-green-800">ここに向かう</span>
             </button>
           </div>
           
           <div className="flex items-center justify-center space-x-6">
             {/* 候補地追加／保存済みトグル */}
             <button
               onClick={handleSavePlace}
               className="flex flex-col items-center justify-center p-2 group"
               title={saved ? '保存済み' : '保存'}
             >
               <div
                 className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-200 ${
                   saved
                     ? 'border-coral-500 bg-coral-500'
                     : 'border-gray-400 group-hover:border-coral-500 group-hover:bg-coral-500 group-active:bg-coral-600'
                 }`}
               >
                 <FiBookmark
                   size={20}
                   className={`transition-colors duration-200 ${
                     saved
                       ? 'text-white'
                       : 'text-gray-400 group-hover:text-white group-active:text-white'
                   }`}
                 />
               </div>
               <span className="caption-1 text-system-secondary-label">
                 {saved ? '保存済み' : '保存'}
               </span>
             </button>
             
             {/* 付近を検索 */}
             <button
               onClick={handleNearbySearch}
               className="flex flex-col items-center justify-center p-2 group"
               title="付近を検索"
             >
               <div className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center mb-2 transition-all duration-200 group-hover:border-coral-500 group-hover:bg-coral-500 group-active:bg-coral-600">
                 <FiSearch size={20} className="text-gray-400 group-hover:text-white group-active:text-white transition-colors duration-200" />
               </div>
               <span className="caption-1 text-system-secondary-label">付近を検索</span>
             </button>
           </div>
         </div>

         {/* 詳細情報セクション */}
         <div className="p-4 space-y-4">
           {/* 住所 */}
           {place.formatted_address && (
             <div className="space-y-1">
               <h3 className="subheadline font-medium text-system-label">住所</h3>
               <p className="body text-system-secondary-label">{place.formatted_address}</p>
             </div>
           )}

           {/* 営業時間 */}
           {place.opening_hours && (
             <div className="space-y-1">
               <h3 className="subheadline font-medium text-system-label">営業時間</h3>
               <div className="space-y-1">
                 {place.opening_hours.weekday_text?.map((hours, index) => (
                   <p key={index} className="caption-1 text-system-secondary-label">
                     {hours}
                   </p>
                 ))}
                 {place.opening_hours.isOpen?.() && (
                   <p className="caption-1 font-medium text-green-600">
                     現在営業中
                   </p>
                 )}
               </div>
             </div>
           )}

           {/* 画像ギャラリー */}
           {photos.length > 1 && (
             <div className="space-y-2">
               <h3 className="subheadline font-medium text-system-label">写真</h3>
               <div className="relative group">
                 {/* 左矢印ボタン */}
                 <button
                   onClick={() => scrollImages('left')}
                   className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                   aria-label="前の写真"
                 >
                   <FiChevronLeft size={16} className="text-gray-600" />
                 </button>
                 
                 {/* 右矢印ボタン */}
                 <button
                   onClick={() => scrollImages('right')}
                   className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                   aria-label="次の写真"
                 >
                   <FiChevronRight size={16} className="text-gray-600" />
                 </button>
                 
                 <div 
                   ref={scrollContainerRef}
                   className="flex overflow-x-auto scrollbar-hide space-x-3 pb-2"
                 >
                   {photos.map((photo, index) => (
                     <div key={index} className="flex-shrink-0">
                       <img
                         src={typeof photo === 'string' ? photo : photo.getUrl({ maxWidth: 400, maxHeight: 300 })}
                         alt={`${place.name} - 写真 ${index + 1}`}
                         className="w-32 h-24 object-cover rounded-lg shadow-sm"
                       />
                     </div>
                   ))}
                 </div>
                 
                 {/* スクロールヒント */}
                 <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none md:hidden" />
               </div>
               
               {/* 操作ヒント */}
               <p className="caption-2 text-system-tertiary-label text-center">
                 {isMobile ? 'スワイプして他の写真を見る' : 'ホバーして矢印ボタンで写真を切り替え'}
               </p>
             </div>
           )}
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