import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { PlaceCategory } from '../types';

export interface PlaceNotification {
  id: string;
  placeId: string;
  placeName: string;
  placeCategory: PlaceCategory;
  addedBy: {
    uid: string;
    displayName: string;
  };
  planId: string;
  timestamp: number;
  readBy: string[];
  position: { lat: number; lng: number };
}

interface NotificationStore {
  notifications: PlaceNotification[];
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  getUnreadCount: (userId: string) => number;
  addNotification: (notification: Omit<PlaceNotification, 'id' | 'timestamp' | 'readBy'>) => void;
  markAsRead: (notificationId: string, userId: string) => void;
  markAllAsRead: (userId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getNotificationsByPlan: (planId: string, userId: string) => PlaceNotification[];
  isReadByUser: (notification: PlaceNotification, userId: string) => boolean;
  clearExpiredNotifications: () => void;
}

const NOTIFICATION_EXPIRY_HOURS = 72;
const NOTIFICATION_EXPIRY_MS = NOTIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      currentUserId: null,

      setCurrentUserId: (userId) => set({ currentUserId: userId }),

      getUnreadCount: (userId: string) => {
        const { notifications } = get();
        return notifications.filter(notification => 
          !notification.readBy.includes(userId)
        ).length;
      },

      addNotification: (notification) => {
        const newNotification: PlaceNotification = {
          ...notification,
          id: uuidv4(),
          timestamp: Date.now(),
          readBy: []
        };

        console.log('[通知ストア] 新しい通知を作成:', {
          notificationId: newNotification.id,
          placeId: newNotification.placeId,
          placeName: newNotification.placeName,
          addedByUid: newNotification.addedBy.uid,
          addedByName: newNotification.addedBy.displayName,
          planId: newNotification.planId,
          timestamp: new Date(newNotification.timestamp).toISOString()
        });

        set((state) => {
          const updatedNotifications = [...state.notifications, newNotification];
          console.log('[通知ストア] 通知総数:', updatedNotifications.length);
          console.log('[通知ストア] 現在のユーザーID:', state.currentUserId);
          return {
            notifications: updatedNotifications
          };
        });

        get().clearExpiredNotifications();
      },

      markAsRead: (notificationId: string, userId: string) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === notificationId && !notification.readBy.includes(userId)
              ? { ...notification, readBy: [...notification.readBy, userId] }
              : notification
          )
        }));
      },

      markAllAsRead: (userId: string) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            !notification.readBy.includes(userId)
              ? { ...notification, readBy: [...notification.readBy, userId] }
              : notification
          )
        }));
      },

      removeNotification: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== notificationId)
        }));
      },

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      getNotificationsByPlan: (planId: string, userId: string) => {
        const { notifications } = get();
        return notifications.filter(notification => 
          notification.planId === planId
        );
      },

      isReadByUser: (notification: PlaceNotification, userId: string) => {
        return notification.readBy.includes(userId);
      },

      clearExpiredNotifications: () => {
        const now = Date.now();
        set((state) => ({
          notifications: state.notifications.filter(notification =>
            now - notification.timestamp < NOTIFICATION_EXPIRY_MS
          )
        }));
      }
    }),
    {
      name: 'travel-app-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications
      })
    }
  )
);

export default useNotificationStore;