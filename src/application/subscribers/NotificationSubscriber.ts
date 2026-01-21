/**
 * Phase 3: 通知 Subscriber
 * リモートで追加された place を検出し、ユーザーに通知を作成する
 */

import { EventBus, Unsubscribe, EventNames } from "../../events/EventBus";
import type { Place } from "../../types";

export interface NotificationConfig {
  enabled: boolean;
  currentUserId?: string;
}

export interface PlaceNotification {
  id: string;
  placeId: string;
  placeName: string;
  placeCategory?: string;
  addedBy: {
    uid: string;
    displayName: string;
  };
  planId: string;
  position?: { lat: number; lng: number };
  createdAt: Date;
  read: boolean;
}

export interface NotificationStore {
  addNotification(
    notification: Omit<PlaceNotification, "id" | "createdAt" | "read">,
  ): void;
}

/**
 * 通知 Subscriber
 * PLACE_ADDED イベントを購読し、他ユーザーが追加した場所の通知を作成
 */
export class NotificationSubscriber {
  private unsubscribers: Unsubscribe[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly notificationStore: NotificationStore,
    private readonly config: NotificationConfig = { enabled: true },
  ) {}

  /**
   * 購読開始
   */
  subscribe(): void {
    if (!this.config.enabled) {
      console.log("[NotificationSubscriber] Disabled, skipping subscribe");
      return;
    }

    // place:added イベント - 他ユーザーが追加した場合のみ通知
    const unsubAdd = this.eventBus.on(
      EventNames.PLACE_ADDED,
      (data: { placeId: string; place: Place; planId?: string }) => {
        this.handlePlaceAdded(data.placeId, data.place, data.planId);
      },
    );
    this.unsubscribers.push(unsubAdd);

    console.log("[NotificationSubscriber] Subscribed to place events");
  }

  /**
   * 購読解除
   */
  unsubscribe(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    console.log("[NotificationSubscriber] Unsubscribed from place events");
  }

  /**
   * 現在のユーザーIDを更新
   */
  updateCurrentUserId(userId: string | undefined): void {
    this.config.currentUserId = userId;
  }

  /**
   * Place 追加ハンドラ
   */
  private handlePlaceAdded(
    placeId: string,
    place: Place,
    planId?: string,
  ): void {
    // 現在のユーザーIDが設定されていない場合はスキップ
    if (!this.config.currentUserId) {
      console.log(
        "[NotificationSubscriber] No current user, skipping notification",
      );
      return;
    }

    // addedBy情報がない場合はスキップ
    if (!place.addedBy?.uid) {
      console.log(
        "[NotificationSubscriber] No addedBy info, skipping notification",
      );
      return;
    }

    // 自分が追加した場所は通知しない
    if (place.addedBy.uid === this.config.currentUserId) {
      console.log("[NotificationSubscriber] Own place, skipping notification");
      return;
    }

    console.log(
      "[NotificationSubscriber] Creating notification for place added by other user:",
      {
        placeId,
        placeName: place.name,
        addedBy: place.addedBy.displayName,
      },
    );

    // 通知を作成
    this.notificationStore.addNotification({
      placeId: place.id,
      placeName: place.name,
      placeCategory: place.category,
      addedBy: {
        uid: place.addedBy.uid,
        displayName: place.addedBy.displayName || "ユーザー",
      },
      planId: planId || "",
      position: place.coordinates,
    });
  }
}
