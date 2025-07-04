import React, { useMemo, useState, useRef } from 'react';
import { FiX, FiTrash2, FiBookmark, FiSearch, FiChevronLeft, FiChevronRight, FiCalendar, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { MdDirections } from 'react-icons/md';
import useMediaQuery from '../hooks/useMediaQuery';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { usePullToRefreshPrevention } from '../hooks/usePullToRefreshPrevention';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { usePlanStore } from '../store/planStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { BookingService } from '../services/bookingService';
import ConfirmDialog from './ConfirmDialog';
import { usePlacesStore } from '../store/placesStore';
import { formatCurrency } from '../utils/formatCurrency';
import { classifyCategory } from '../utils/categoryClassifier';
import { getCategoryPath, getCategoryColor, getCategoryDisplayName } from '../utils/categoryIcons';
import { estimateCost } from '../utils/estimateCost';
import ImageCarouselModal from './ImageCarouselModal';
import DaySelector from './DaySelector';

export default function PlaceDetailPanel() {
  const { place, setPlace } = useSelectedPlaceStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { deletePlace, addPlace, updatePlace } = usePlacesStore((s) => ({ 
    deletePlace: s.deletePlace, 
    addPlace: s.addPlace,
    updatePlace: s.updatePlace
  }));
  const savedPlaces = usePlacesStore((s) => s.places);
  const { plan } = usePlanStore();
  const { setSelectedOrigin, setSelectedDestination, openRouteSearch } = useRouteSearchStore();
  const { map } = useGoogleMaps();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ブレークポイント
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // BottomSheet機能（モバイル版のみ）
  const bottomSheet = useBottomSheet(50); // 初期位置は中間（50%）
  
  // プルツーリフレッシュ防止（モバイル版・展開時のみ）
  const { contentRef } = usePullToRefreshPrevention(
    bottomSheet.state.isExpanded,
    isMobile,
    bottomSheet.state.isDragging,
  );

  if (!place) return null;

  // 該当POIの写真
  const photos = place.photos ?? [];
  
  // 画像URLの配列を準備（カルーセルモーダル用）
  const imageUrls = photos.map(photo => 
    typeof photo === 'string' 
      ? photo 
      : photo.getUrl({ maxWidth: 1200, maxHeight: 900 })
  );

  // 登録済みか判定
  const saved = savedPlaces.some((p) => p.name === place.name && p.address === place.formatted_address);
  
  // 保存済み候補地の情報を取得
  const savedPlace = savedPlaces.find((p) => p.name === place.name && p.address === place.formatted_address);

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
      // 既存の場合は削除
      const target = savedPlaces.find((p) => p.name === place.name && p.address === place.formatted_address);
      if (target) deletePlace(target.id);
    } else {
      // 新規追加
      const category = classifyCategory(place.types);
      const cost = estimateCost(place.price_level, category);
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
        memo: '',
      });
    }
  };

  const handleNearbySearch = () => {
    if (!map) return;
    
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
  };

  const scrollImages = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = 140;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageModalOpen(true);
  };

  const handleScheduledDayChange = (day: number | undefined) => {
    if (!savedPlace) return;
    updatePlace(savedPlace.id, { scheduledDay: day });
  };

  const handleClosePanel = () => {
    setPlace(null);
  };

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isDesktop) {
      return (
        <div className="fixed left-0 top-0 bottom-0 w-[540px] 
                        glass-effect shadow-elevation-5 border-r border-system-separator
                        z-40 overflow-y-auto">
          {children}
        </div>
      );
    }
    if (isTablet) {
      return (
        <div className="fixed left-0 top-0 bottom-0 w-[min(540px,50vw)] 
                        glass-effect shadow-elevation-5 border-r border-system-separator
                        z-40 overflow-y-auto">
          {children}
        </div>
      );
    }
    // mobile - Google Maps風BottomSheet
    return (
      <div 
        className="fixed left-0 right-0 bottom-0 h-screen glass-effect shadow-elevation-5 
                   border-t border-system-separator z-50 flex flex-col touch-pan-y overscroll-y-contain
                   transition-transform duration-300 ease-out"
        style={bottomSheet.style}
      >
         {/* スワイプハンドルと閉じるボタン */}
         <div
           ref={bottomSheet.bindHandleRef}
           role="separator"
           aria-orientation="vertical"
           tabIndex={0}
           onKeyDown={(e) => {
             if (e.code === 'Space' || e.key === ' ') {
               e.preventDefault();
               bottomSheet.state.isExpanded ? bottomSheet.collapse() : bottomSheet.expand();
             }
             if (e.key === 'ArrowUp') {
               e.preventDefault();
               bottomSheet.setPercent(Math.max(0, bottomSheet.state.percent - 50));
             }
             if (e.key === 'ArrowDown') {
               e.preventDefault();
               bottomSheet.setPercent(Math.min(100, bottomSheet.state.percent + 50));
             }
           }}
           className="flex justify-between items-center pt-2 pb-1 px-4 flex-shrink-0 
                      cursor-grab active:cursor-grabbing focus:outline-none"
         >
           <div className="w-8"></div> {/* スペーサー */}
           <div className="w-10 h-1 bg-system-secondary-label/40 rounded-full" />
           <button
             onClick={handleClosePanel}
             className="w-8 h-8 flex items-center justify-center 
                        text-system-secondary-label hover:text-coral-500
                        transition-colors duration-150"
             title="閉じる"
           >
             <FiX size={20} />
           </button>
         </div>
         
         <div 
           ref={contentRef} 
           className={`flex-1 ${bottomSheet.state.isExpanded ? "overflow-y-auto" : "overflow-hidden"}`}
         >
           {children}
         </div>
       </div>
    );
  };

  return (
    <>
      {/* 背景スクリーンは削除 - web版と同じ動作にする */}
      <Container>
        <div className="relative">
          {photos.length > 0 && (
            <div className="relative group cursor-pointer" onClick={() => handleImageClick(0)}>
              <img
                src={typeof photos[0] === 'string' ? photos[0] : photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })}
                alt={place.name || ''}
                className="w-full h-60 object-cover transition-transform duration-300 
                           group-hover:scale-105 group-active:scale-95"
              />
              {/* 拡大アイコン */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 
                             transition-all duration-300 flex items-center justify-center">
                <div className="w-12 h-12 glass-effect border border-white/30 rounded-full 
                               flex items-center justify-center opacity-0 group-hover:opacity-100 
                               transition-opacity duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              {/* 画像枚数表示 */}
              {photos.length > 1 && (
                <div className="absolute top-3 right-3 glass-effect border border-white/30 
                               rounded-full px-3 py-1">
                  <span className="caption-1 text-white font-medium">
                    {photos.length}枚
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 基本情報セクション */}
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {/* タイトル行とアクションボタン */}
            <div className="flex items-start justify-between">
              <h2 className="title-2 text-system-label font-semibold flex-1 pr-3">{place.name}</h2>
              
              {/* 右側のアクションボタン */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {saved && (
                  <button
                    className="w-9 h-9 bg-red-50 hover:bg-red-100 border border-red-200
                               rounded-full shadow-elevation-1 
                               flex items-center justify-center
                               hover:shadow-elevation-2 hover:scale-105 
                               active:scale-95 transition-all duration-150 ease-ios-default"
                    onClick={() => setConfirmOpen(true)}
                    title="削除"
                  >
                    <FiTrash2 size={16} className="text-red-600" />
                  </button>
                )}
                {/* スマホ版では✕ボタンを非表示 */}
                {!isMobile && (
                  <button
                    className="w-9 h-9 bg-gray-100 hover:bg-gray-200 border border-gray-300
                               rounded-full shadow-elevation-1 
                               flex items-center justify-center
                               hover:shadow-elevation-2 hover:scale-105 
                               active:scale-95 transition-all duration-150 ease-ios-default"
                    onClick={handleClosePanel}
                    title="閉じる"
                  >
                    <FiX size={18} className="text-gray-600" />
                  </button>
                )}
              </div>
            </div>
            
            {/* カテゴリと評価を同じ行に */}
            <div className="flex items-center justify-between">
              {saved && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow-elevation-1"
                    style={{ backgroundColor: getCategoryColor(classifyCategory(place.types)) }}
                  >
                    <svg
                      width="14"
                      height="14"
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
                  <span className="subheadline text-system-secondary-label">
                    {getCategoryDisplayName(classifyCategory(place.types))}
                  </span>
                </div>
              )}
              
              {place.rating && (
                <div className="flex items-center space-x-1">
                  <div className="text-yellow-500">★</div>
                  <span className="subheadline font-medium text-system-label">{place.rating}</span>
                </div>
              )}
            </div>
            
            {/* 予想費用 */}
            {saved && (
              <div className="bg-coral-500/10 rounded-lg px-3 py-2 border border-coral-500/20">
                <span className="callout font-medium text-coral-600">
                  予想費用: {formatCurrency(savedPlaces.find(p => p.name === place.name && p.address === place.formatted_address)?.estimatedCost ?? 0)}
                </span>
              </div>
            )}
            
            {/* ウェブサイトリンク */}
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

        {/* アクションボタンセクション */}
        <div className="px-5 pb-5">
          <div className="glass-effect rounded-xl p-4 space-y-4">
            {/* ルート検索ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRouteFromHere}
                className="flex flex-col items-center justify-center p-4 
                           bg-teal-500/10 hover:bg-teal-500/20 
                           border border-teal-500/20 rounded-lg 
                           transition-all duration-150 ease-ios-default
                           hover:shadow-elevation-2 active:scale-95"
                title="ここから出発"
              >
                <MdDirections size={24} className="text-teal-500 mb-2" />
                <span className="subheadline font-medium text-teal-600">ここから出発</span>
              </button>
              
              <button
                onClick={handleRouteToHere}
                className="flex flex-col items-center justify-center p-4 
                           bg-coral-500/10 hover:bg-coral-500/20 
                           border border-coral-500/20 rounded-lg 
                           transition-all duration-150 ease-ios-default
                           hover:shadow-elevation-2 active:scale-95"
                title="ここに向かう"
              >
                <MdDirections size={24} className="text-coral-500 mb-2 transform rotate-180" />
                <span className="subheadline font-medium text-coral-600">ここに向かう</span>
              </button>
            </div>
            
            {/* セカンダリアクション */}
            <div className="flex items-center justify-center space-x-8 pt-2">
              {/* 保存ボタン */}
              <button
                onClick={handleSavePlace}
                className="flex flex-col items-center justify-center p-2 group"
                title={saved ? '保存済み' : '保存'}
              >
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 
                             transition-all duration-200 ease-ios-default ${
                    saved
                      ? 'border-coral-500 bg-coral-500 shadow-coral-glow'
                      : 'border-system-secondary-label/30 group-hover:border-coral-500 group-hover:bg-coral-500 group-active:bg-coral-600'
                  }`}
                >
                  <FiBookmark
                    size={20}
                    className={`transition-colors duration-200 ${
                      saved
                        ? 'text-white'
                        : 'text-system-secondary-label group-hover:text-white group-active:text-white'
                    }`}
                  />
                </div>
                <span className="caption-1 text-system-secondary-label">
                  {saved ? '保存済み' : '保存'}
                </span>
              </button>
              
              {/* 付近検索ボタン */}
              <button
                onClick={handleNearbySearch}
                className="flex flex-col items-center justify-center p-2 group"
                title="付近を検索"
              >
                <div className="w-12 h-12 rounded-full border-2 border-system-secondary-label/30 
                               flex items-center justify-center mb-2 
                               transition-all duration-200 ease-ios-default 
                               group-hover:border-teal-500 group-hover:bg-teal-500 
                               group-active:bg-teal-600">
                  <FiSearch size={20} className="text-system-secondary-label 
                                                 group-hover:text-white group-active:text-white 
                                                 transition-colors duration-200" />
                </div>
                <span className="caption-1 text-system-secondary-label">付近を検索</span>
              </button>
            </div>
            
            {/* 訪問日設定（保存済み候補地の場合のみ表示） */}
            {saved && plan && (
              <div className="pt-4 border-t border-system-separator/30 mt-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-6 h-6 text-coral-500 flex-shrink-0">
                    <FiCalendar size={18} />
                  </div>
                  <span className="subheadline font-medium text-system-label">訪問日設定</span>
                </div>
                <DaySelector
                  selectedDay={savedPlace?.scheduledDay}
                  onDayChange={handleScheduledDayChange}
                  maxDays={plan && plan.endDate ? Math.ceil((plan.endDate.getTime() - plan.startDate!.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 7}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* 詳細情報セクション */}
        <div className="px-5 pb-5 space-y-4">
          {/* 住所 */}
          {place.formatted_address && (
            <div className="glass-effect rounded-xl p-4">
              <h3 className="headline font-semibold text-system-label mb-2">住所</h3>
              <p className="body text-system-secondary-label leading-relaxed">
                {place.formatted_address}
              </p>
            </div>
          )}

          {/* 営業時間 */}
          {place.opening_hours && (
            <div className="glass-effect rounded-xl p-4">
              <h3 className="headline font-semibold text-system-label mb-3">営業時間</h3>
              <div className="space-y-2">
                {place.opening_hours.weekday_text?.map((hours, index) => (
                  <p key={index} className="callout text-system-secondary-label leading-relaxed">
                    {hours}
                  </p>
                ))}
                {place.opening_hours.isOpen?.() && (
                  <div className="mt-3 pt-3 border-t border-system-separator">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="callout font-medium text-green-600">
                        現在営業中
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 画像ギャラリー */}
          {photos.length > 1 && (
            <div className="glass-effect rounded-xl p-4">
              <h3 className="headline font-semibold text-system-label mb-3">写真</h3>
              <div className="relative group">
                {/* ナビゲーションボタン */}
                <button
                  onClick={() => scrollImages('left')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 
                             w-8 h-8 glass-effect rounded-full shadow-elevation-2 
                             flex items-center justify-center 
                             opacity-0 group-hover:opacity-100 
                             transition-all duration-200 ease-ios-default
                             hover:shadow-elevation-3 hover:scale-105"
                  aria-label="前の写真"
                >
                  <FiChevronLeft size={16} className="text-system-label" />
                </button>
                
                <button
                  onClick={() => scrollImages('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 
                             w-8 h-8 glass-effect rounded-full shadow-elevation-2 
                             flex items-center justify-center 
                             opacity-0 group-hover:opacity-100 
                             transition-all duration-200 ease-ios-default
                             hover:shadow-elevation-3 hover:scale-105"
                  aria-label="次の写真"
                >
                  <FiChevronRight size={16} className="text-system-label" />
                </button>
                
                <div 
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto scrollbar-hide space-x-3 pb-2"
                >
                  {photos.map((photo, index) => (
                    <div key={index} className="flex-shrink-0">
                      <div 
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(index)}
                      >
                        <img
                          src={typeof photo === 'string' ? photo : photo.getUrl({ maxWidth: 400, maxHeight: 300 })}
                          alt={`${place.name} - 写真 ${index + 1}`}
                          className="w-32 h-24 object-cover rounded-lg shadow-elevation-2 
                                     transition-transform duration-200 group-hover:scale-105 
                                     group-active:scale-95"
                        />
                        {/* 拡大アイコン */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 
                                       transition-all duration-200 flex items-center justify-center 
                                       rounded-lg">
                          <div className="w-6 h-6 glass-effect border border-white/50 rounded-full 
                                         flex items-center justify-center opacity-0 group-hover:opacity-100 
                                         transition-opacity duration-200">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* グラデーションヒント */}
                <div className="absolute right-0 top-0 bottom-2 w-8 
                               bg-gradient-to-l from-white via-white/80 to-transparent 
                               pointer-events-none md:hidden rounded-r-xl" />
              </div>
              
              {/* 操作ヒント */}
              <p className="caption-2 text-system-tertiary-label text-center mt-3">
                {isMobile ? 'スワイプして他の写真を見る' : 'ホバーして矢印ボタンで写真を切り替え'}
              </p>
            </div>
          )}
        </div>
        
        {/* 底部の余白 */}
        <div className="h-5" />
      </Container>

      {/* 削除確認ダイアログ */}
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

      {/* 画像カルーセルモーダル */}
      <ImageCarouselModal
        images={imageUrls}
        initialIndex={selectedImageIndex}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        placeName={place.name || ''}
      />
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