import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useMediaQuery from '../hooks/useMediaQuery';

interface ImageCarouselModalProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  placeName?: string;
}

export default function ImageCarouselModal({
  images,
  initialIndex,
  isOpen,
  onClose,
  placeName
}: ImageCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // モーダル開閉時の初期化
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // キーボード操作
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  };

  const handleImageClick = () => {
    if (!isMobile) {
      setIsZoomed(!isZoomed);
    }
  };

  // タッチ操作（スワイプ）
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart === null) return;

    const dragEnd = e.changedTouches[0].clientX;
    const dragDistance = dragStart - dragEnd;
    const threshold = 50;

    if (Math.abs(dragDistance) > threshold) {
      if (dragDistance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }

    setDragStart(null);
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景 */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-modal-fade-in"
        onClick={onClose}
      />

      {/* モーダルコンテンツ */}
      <div className="relative w-full h-full flex flex-col animate-modal-zoom-in">
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-inset">
          <div className="glass-effect border-b border-white/10 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {placeName && (
                  <h2 className="headline font-semibold text-white truncate">
                    {placeName}
                  </h2>
                )}
                <p className="caption-1 text-white/70 mt-1">
                  {currentIndex + 1} / {images.length}
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-9 h-9 glass-effect border border-white/20 rounded-full 
                           flex items-center justify-center ml-4
                           hover:bg-white/20 active:bg-white/30 
                           transition-all duration-150 ease-ios-default"
                title="閉じる"
              >
                <FiX size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* 画像表示エリア */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* ナビゲーションボタン（左） */}
          {images.length > 1 && !isMobile && (
            <button
              onClick={handlePrevious}
              className="absolute left-5 z-10 w-12 h-12 glass-effect 
                         border border-white/20 rounded-full 
                         flex items-center justify-center
                         hover:bg-white/20 active:bg-white/30 
                         transition-all duration-150 ease-ios-default
                         hover:scale-105 active:scale-95"
              title="前の画像"
            >
              <FiChevronLeft size={24} className="text-white" />
            </button>
          )}

          {/* 画像 */}
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center p-5 pt-20 pb-20"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              ref={imageRef}
              src={images[currentIndex]}
              alt={`${placeName || ''} - 写真 ${currentIndex + 1}`}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 ease-ios-default
                         ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}
                         ${isMobile ? 'cursor-default' : ''}`}
              onClick={handleImageClick}
              onLoad={() => {
                // 画像ロード完了時の処理
              }}
            />
          </div>

          {/* ナビゲーションボタン（右） */}
          {images.length > 1 && !isMobile && (
            <button
              onClick={handleNext}
              className="absolute right-5 z-10 w-12 h-12 glass-effect 
                         border border-white/20 rounded-full 
                         flex items-center justify-center
                         hover:bg-white/20 active:bg-white/30 
                         transition-all duration-150 ease-ios-default
                         hover:scale-105 active:scale-95"
              title="次の画像"
            >
              <FiChevronRight size={24} className="text-white" />
            </button>
          )}

          {/* スワイプヒント（モバイル） */}
          {isMobile && images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
              <div className="glass-effect border border-white/20 rounded-full px-4 py-2">
                <p className="caption-2 text-white/70 text-center">
                  左右にスワイプして画像を切り替え
                </p>
              </div>
            </div>
          )}
        </div>

        {/* インジケーター */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 safe-area-inset">
            <div className="glass-effect border-t border-white/10 px-5 py-3">
              <div className="flex justify-center space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsZoomed(false);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ease-ios-default
                               ${index === currentIndex 
                                 ? 'bg-white shadow-elevation-2' 
                                 : 'bg-white/40 hover:bg-white/60'}`}
                    title={`画像 ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ズーム状態のヒント */}
        {isZoomed && !isMobile && (
          <div className="absolute top-20 right-5">
            <div className="glass-effect border border-white/20 rounded-lg px-3 py-2">
              <p className="caption-2 text-white/70">
                クリックで元のサイズに戻す
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 