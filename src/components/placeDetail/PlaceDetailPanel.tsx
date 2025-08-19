import React, { useRef, useEffect, useMemo } from "react";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { usePullToRefreshPrevention } from "../../hooks/usePullToRefreshPrevention";
import { useBottomSheetStore } from "../../store/bottomSheetStore";
import { usePlaceDetail } from "./hooks/usePlaceDetail";
import PlaceDetailHeader from "./PlaceDetailHeader";
import PlaceDetailInfo from "./PlaceDetailInfo";
import PlaceActions from "./PlaceActions";
import ImageGallery from "./ImageGallery";
import MemoEditor from "./MemoEditor";
import ConfirmDialog from "../ConfirmDialog";
import ImageCarouselModal from "../ImageCarouselModal";
import { useSavedPlacesStore } from "../../store/savedPlacesStore";
import { usePlanStore } from "../../store/planStore";

export default function PlaceDetailPanel() {
  const {
    place,
    saved,
    savedPlace,
    confirmOpen,
    setConfirmOpen,
    imageModalOpen,
    setImageModalOpen,
    selectedImageIndex,
    handleRouteFromHere,
    handleRouteToHere,
    handleSavePlace,
    handleNearbySearch,
    handleImageClick,
    handleScheduledDayChange,
    handleClosePanel,
    saveWithSyncManager,
  } = usePlaceDetail();

  const { deletePlace, updatePlace } = useSavedPlacesStore((s) => ({
    deletePlace: s.deletePlace,
    updatePlace: s.updatePlace,
  }));
  const savedPlaces = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { plan } = usePlanStore();

  const bottomSheetRootRef = useRef<HTMLDivElement>(null);

  // ブレークポイント
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isMobile = !isDesktop && !isTablet;

  // BottomSheet機能（モバイル版のみ）
  const bottomSheet = useBottomSheet(55);

  // オーバースクロール時の動的処理
  const handleOverscrollDown = useMemo(() => {
    if (!isMobile) return undefined;

    return () => {
      const currentPercent = bottomSheet.state.percent;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        if (currentPercent <= 10) {
          bottomSheet.setPercent(55);
        }
      } else {
        if (currentPercent <= 25) {
          bottomSheet.setPercent(55);
        }
      }
    };
  }, [bottomSheet, isMobile]);

  // プルツーリフレッシュ防止
  const { contentRef } = usePullToRefreshPrevention(
    (() => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      return isStandalone
        ? bottomSheet.state.percent <= 50
        : bottomSheet.state.percent <= 55;
    })(),
    isMobile,
    bottomSheet.state.isDragging,
    handleOverscrollDown,
  );

  // アンマウント時にBottomSheetの状態を初期化
  useEffect(() => {
    return () => {
      useBottomSheetStore.getState().setState(100, false);
    };
  }, []);

  if (!place) return null;

  // 該当POIの写真
  const photos = place.photos ?? [];

  // 画像URLの配列を準備
  const imageUrls = photos.map((photo) =>
    typeof photo === "string"
      ? photo
      : photo.getUrl({ maxWidth: 1200, maxHeight: 900 }),
  );

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isDesktop) {
      return (
        <div
          className="fixed left-0 top-0 bottom-0 w-[540px] 
                        glass-effect shadow-elevation-5 border-r border-system-separator
                        z-40 overflow-y-auto"
        >
          {children}
        </div>
      );
    }
    if (isTablet) {
      return (
        <div
          className="fixed left-0 top-0 bottom-0 w-[min(540px,50vw)] 
                        glass-effect shadow-elevation-5 border-r border-system-separator
                        z-40 overflow-y-auto"
        >
          {children}
        </div>
      );
    }
    // mobile - Google Maps風BottomSheet
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const contentPaddingClass = isStandalone ? "" : "pb-20";
    return (
      <div
        ref={bottomSheetRootRef}
        className="fixed left-0 right-0 bottom-0 h-screen h-[100dvh] glass-effect shadow-elevation-5 
                   border-t border-system-separator z-50 flex flex-col touch-pan-y overscroll-y-contain
                   transition-transform duration-300 ease-out"
        style={bottomSheet.style}
      >
        <PlaceDetailHeader
          isDesktop={isDesktop}
          isTablet={isTablet}
          isMobile={isMobile}
          bottomSheet={bottomSheet}
          handleClosePanel={handleClosePanel}
        />

        <div
          ref={contentRef}
          className={`flex-1 ${bottomSheet.state.isExpanded ? "overflow-y-auto overscroll-y-contain touch-pan-y" : "overflow-hidden"} ${contentPaddingClass}`}
        >
          {children}
        </div>
      </div>
    );
  };

  return (
    <>
      <Container>
        <div className="relative">
          {/* メイン画像 */}
          {photos.length > 0 && (
            <div
              className="relative group cursor-pointer"
              onClick={() => handleImageClick(0)}
            >
              <img
                src={
                  typeof photos[0] === "string"
                    ? photos[0]
                    : photos[0].getUrl({ maxWidth: 1080, maxHeight: 540 })
                }
                alt={place.name || ""}
                className="w-full h-60 object-cover transition-transform duration-300 
                           group-hover:scale-105 group-active:scale-95"
              />
              {/* 拡大アイコン */}
              <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 
                             transition-all duration-300 flex items-center justify-center"
              >
                <div
                  className="w-12 h-12 glass-effect border border-white/30 rounded-full 
                               flex items-center justify-center opacity-0 group-hover:opacity-100 
                               transition-opacity duration-300"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
              {/* 画像枚数表示 */}
              {photos.length > 1 && (
                <div
                  className="absolute top-3 right-3 glass-effect border border-white/30 
                               rounded-full px-3 py-1"
                >
                  <span className="caption-1 text-white font-medium">
                    {photos.length}枚
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 基本情報セクション */}
        <PlaceDetailInfo
          place={place}
          saved={saved}
          savedPlace={savedPlace}
          isMobile={isMobile}
          onClosePanel={handleClosePanel}
          onDeleteClick={() => setConfirmOpen(true)}
        />

        {/* アクションボタンセクション */}
        <div className="px-5 pb-5">
          <PlaceActions
            saved={saved}
            savedPlace={savedPlace}
            plan={plan}
            onRouteFromHere={handleRouteFromHere}
            onRouteToHere={handleRouteToHere}
            onSavePlace={handleSavePlace}
            onNearbySearch={handleNearbySearch}
            onDayChange={handleScheduledDayChange}
          />
        </div>

        {/* 詳細情報セクション */}
        <div className="px-5 pb-5 space-y-4">
          {/* 住所 */}
          {place.formatted_address && (
            <div className="glass-effect rounded-xl p-4">
              <h3 className="headline font-semibold text-system-label mb-2">
                住所
              </h3>
              <p className="body text-system-secondary-label leading-relaxed">
                {place.formatted_address}
              </p>
            </div>
          )}

          {/* 営業時間 */}
          {place.opening_hours && (
            <div className="glass-effect rounded-xl p-4">
              <h3 className="headline font-semibold text-system-label mb-3">
                営業時間
              </h3>
              <div className="space-y-2">
                {place.opening_hours.weekday_text?.map((hours, index) => (
                  <p
                    key={index}
                    className="callout text-system-secondary-label leading-relaxed"
                  >
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

          {/* メモ */}
          {saved && (
            <MemoEditor
              saved={saved}
              savedPlace={savedPlace}
              isMobile={isMobile}
              updatePlace={updatePlace}
              onMemoChange={(id, memo, operationType, isEditing) => {
                if (plan) {
                  saveWithSyncManager(plan);
                }
              }}
            />
          )}

          {/* 画像ギャラリー */}
          {photos.length > 1 && (
            <ImageGallery
              photos={photos}
              placeName={place.name || ""}
              onImageClick={handleImageClick}
              isMobile={isMobile}
            />
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
            const target = savedPlaces.find(
              (p) =>
                p.name === place.name && p.address === place.formatted_address,
            );
            if (target) deletePlace(target.id);
          }
          setConfirmOpen(false);
          handleClosePanel();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* 画像カルーセルモーダル */}
      <ImageCarouselModal
        images={imageUrls}
        initialIndex={selectedImageIndex}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        placeName={place.name || ""}
      />
    </>
  );
}
