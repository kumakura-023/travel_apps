import React from "react";
import { FiTrash2, FiX } from "react-icons/fi";
import { formatCurrency } from "../../utils/formatCurrency";
import { classifyCategory } from "../../utils/categoryClassifier";
import {
  getCategoryPath,
  getCategoryColor,
  getCategoryDisplayName,
} from "../../utils/categoryIcons";
import { BookingService } from "../../services/bookingService";

interface PlaceDetailInfoProps {
  place: google.maps.places.PlaceResult;
  saved: boolean;
  savedPlace: any;
  isMobile: boolean;
  onClosePanel: () => void;
  onDeleteClick: () => void;
}

export default function PlaceDetailInfo({
  place,
  saved,
  savedPlace,
  isMobile,
  onClosePanel,
  onDeleteClick,
}: PlaceDetailInfoProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-3">
        {/* タイトル行とアクションボタン */}
        <div className="flex items-start justify-between">
          <h2 className="title-2 text-system-label font-semibold flex-1 pr-3">
            {place.name}
          </h2>

          {/* 右側のアクションボタン */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {saved && (
              <button
                className="w-9 h-9 bg-red-50 hover:bg-red-100 border border-red-200
                           rounded-full shadow-elevation-1 
                           flex items-center justify-center
                           hover:shadow-elevation-2 hover:scale-105 
                           active:scale-95 transition-all duration-150 ease-ios-default"
                onClick={onDeleteClick}
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
                onClick={onClosePanel}
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
                style={{
                  backgroundColor: getCategoryColor(
                    classifyCategory(place.types),
                  ),
                }}
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
              <span className="subheadline font-medium text-system-label">
                {place.rating}
              </span>
            </div>
          )}
        </div>

        {/* 予想費用 */}
        {saved && savedPlace && (
          <div className="bg-coral-500/10 rounded-lg px-3 py-2 border border-coral-500/20">
            <span className="callout font-medium text-coral-600">
              予想費用: {formatCurrency(savedPlace.estimatedCost ?? 0)}
            </span>
          </div>
        )}

        {/* ウェブサイトリンク */}
        {place.website && (
          <button
            onClick={() =>
              window.open(place.website, "_blank", "noopener noreferrer")
            }
            className="flex items-center space-x-2 text-coral-500 hover:text-coral-600 
                       transition-colors duration-150"
          >
            <span className="callout">ウェブサイトを開く</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        )}

        {/* ホテル予約リンク */}
        {place.types?.includes("lodging") && (
          <BookingLinksSection place={place} />
        )}
      </div>
    </div>
  );
}

function BookingLinksSection({
  place,
}: {
  place: google.maps.places.PlaceResult;
}) {
  const links = React.useMemo(() => {
    return BookingService.generateHotelBookingLinks({
      name: place.name || "",
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
            onClick={() => window.open(url, "_blank", "noopener")}
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
