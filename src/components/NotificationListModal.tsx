import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../hooks/useAuth";
import { usePlanStore } from "../store/planStore";
import {
  getCategoryColor,
  getCategoryEmoji,
  getCategoryDisplayName,
} from "../utils/categoryIcons";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { getMapService } from "../services/ServiceContainer";

interface NotificationListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationListModal: React.FC<NotificationListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { plan } = usePlanStore();
  const {
    notifications,
    getNotificationsByPlan,
    isReadByUser,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearExpiredNotifications,
  } = useNotificationStore();
  const { setPlace } = useSelectedPlaceStore();

  const currentUserId = user?.uid || "";
  const planNotifications = plan
    ? getNotificationsByPlan(plan.id, currentUserId)
    : [];

  useEffect(() => {
    if (isOpen) {
      clearExpiredNotifications();
    }
  }, [isOpen, clearExpiredNotifications]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notification: any) => {
    const mapService = getMapService();
    if (!mapService) {
      return;
    }

    await mapService.panTo(
      notification.position.lat,
      notification.position.lng,
    );
    await mapService.setZoom(17);

    setPlace({
      place_id: notification.placeId,
      name: notification.placeName,
      geometry: {
        location: {
          lat: () => notification.position.lat,
          lng: () => notification.position.lng,
        } as google.maps.LatLng,
      },
      types: [notification.placeCategory],
    } as google.maps.places.PlaceResult);

    markAsRead(notification.id, currentUserId);
  };

  const handleConfirm = (notificationId: string) => {
    markAsRead(notificationId, currentUserId);
  };

  const handleDelete = (notificationId: string) => {
    removeNotification(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead(currentUserId);
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 3) return `${days}日前`;
    return new Date(timestamp).toLocaleDateString("ja-JP");
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4
                 animate-modal-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-effect rounded-2xl w-full max-w-md p-6 space-y-5 
                   shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] 
                   animate-modal-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-coral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h2 className="headline text-system-label">通知</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-system-secondary-background transition-colors duration-150 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 text-system-secondary-label"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* すべて既読にするボタン */}
        {planNotifications.some((n) => !isReadByUser(n, currentUserId)) && (
          <button
            onClick={handleMarkAllAsRead}
            className="w-full py-2 text-coral-500 hover:bg-coral-50 rounded-lg transition-colors duration-150 text-sm font-medium"
          >
            すべて既読にする
          </button>
        )}

        {/* 通知リスト */}
        <div className="max-h-[400px] overflow-y-auto space-y-2 scrollbar-hide">
          {planNotifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-system-secondary-label">通知はありません</p>
            </div>
          ) : (
            planNotifications.map((notification) => {
              const isRead = isReadByUser(notification, currentUserId);
              const categoryColor = getCategoryColor(
                notification.placeCategory,
              );
              const categoryEmoji = getCategoryEmoji(
                notification.placeCategory,
              );
              const categoryName = getCategoryDisplayName(
                notification.placeCategory,
              );

              return (
                <div
                  key={notification.id}
                  className={`list-item rounded-lg cursor-pointer transition-all duration-150 p-4 ${
                    !isRead
                      ? "bg-coral-50 border border-coral-200"
                      : "hover:bg-system-secondary-background"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {/* カテゴリアイコン */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          background: categoryColor,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "white",
                          boxShadow: `0 2px 8px ${categoryColor}33`,
                          flexShrink: 0,
                        }}
                      >
                        {categoryEmoji}
                      </div>

                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="caption-1"
                            style={{ color: categoryColor }}
                          >
                            {categoryName}
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 bg-coral-500 rounded-full"></span>
                          )}
                        </div>
                        <h4 className="subheadline font-medium text-system-label truncate">
                          {notification.placeName}
                        </h4>
                        <p className="caption-1 text-system-secondary-label mt-1">
                          <span className="font-medium">
                            {notification.addedBy.displayName}
                          </span>
                          <span>さんが追加</span>
                          <span className="text-system-tertiary-label">
                            {" "}
                            • {formatRelativeTime(notification.timestamp)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirm(notification.id);
                          }}
                          className="px-3 py-1 bg-coral-500 text-white text-sm font-medium rounded-md hover:bg-coral-600 transition-colors duration-150"
                        >
                          確認
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="w-8 h-8 rounded-full hover:bg-red-50 transition-colors duration-150 flex items-center justify-center group"
                      >
                        <TrashIcon className="w-4 h-4 text-system-tertiary-label group-hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 閉じるボタン */}
        <div className="flex justify-end pt-4 border-t border-white/20">
          <button
            className="btn-text text-system-secondary-label hover:text-system-label"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NotificationListModal;
