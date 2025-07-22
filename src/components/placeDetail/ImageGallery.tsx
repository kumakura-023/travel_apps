import React, { useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface Props {
  photos: (string | google.maps.places.PlacePhoto)[];
  placeName: string;
  onImageClick: (index: number) => void;
  isMobile: boolean;
}

export default function ImageGallery({ photos, placeName, onImageClick, isMobile }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollImages = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 140;
    const newScrollLeft = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  return (
    <div className="glass-effect rounded-xl p-4">
      <h3 className="headline font-semibold text-system-label mb-3">写真</h3>
      <div className="relative group">
        <button
          onClick={() => scrollImages('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 glass-effect rounded-full shadow-elevation-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ease-ios-default hover:shadow-elevation-3 hover:scale-105"
          aria-label="前の写真"
        >
          <FiChevronLeft size={16} className="text-system-label" />
        </button>
        <button
          onClick={() => scrollImages('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 glass-effect rounded-full shadow-elevation-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ease-ios-default hover:shadow-elevation-3 hover:scale-105"
          aria-label="次の写真"
        >
          <FiChevronRight size={16} className="text-system-label" />
        </button>
        <div ref={scrollContainerRef} className="flex overflow-x-auto scrollbar-hide space-x-3 pb-2">
          {photos.map((photo, index) => (
            <div key={index} className="flex-shrink-0">
              <div className="relative group cursor-pointer" onClick={() => onImageClick(index)}>
                <img
                  src={typeof photo === 'string' ? photo : photo.getUrl({ maxWidth: 400, maxHeight: 300 })}
                  alt={`${placeName} - 写真 ${index + 1}`}
                  className="w-32 h-24 object-cover rounded-lg shadow-elevation-2 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center rounded-lg">
                  <div className="w-6 h-6 glass-effect border border-white/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none md:hidden rounded-r-xl" />
      </div>
      <p className="caption-2 text-system-tertiary-label text-center mt-3">
        {isMobile ? 'スワイプして他の写真を見る' : 'ホバーして矢印ボタンで写真を切り替え'}
      </p>
    </div>
  );
}
