/**
 * Phase 3: Subscriber 登録関数
 * ServiceContainer 起動時に全 Subscriber を登録する
 */

import { eventBus } from "../../events/EventBus";
import { PlacePersistenceSubscriber } from "./PlacePersistenceSubscriber";
import {
  NotificationSubscriber,
  NotificationStore,
} from "./NotificationSubscriber";
import { LabelSyncSubscriber, LabelsStore } from "./LabelSyncSubscriber";
import { TelemetrySubscriber, TelemetryConfig } from "./TelemetrySubscriber";

export interface SubscriberDependencies {
  // PlacePersistenceSubscriber 用
  persistPlace: (placeId: string, place: any) => Promise<void>;
  deletePlace: (placeId: string) => Promise<void>;

  // NotificationSubscriber 用
  notificationStore: NotificationStore;

  // LabelSyncSubscriber 用
  labelsStore: LabelsStore;
}

export interface SubscriberConfig {
  placePersistence?: {
    enabled: boolean;
    debounceMs?: number;
  };
  notification?: {
    enabled: boolean;
    currentUserId?: string;
  };
  labelSync?: {
    enabled: boolean;
  };
  telemetry?: TelemetryConfig;
}

export interface RegisteredSubscribers {
  placePersistence: PlacePersistenceSubscriber | null;
  notification: NotificationSubscriber | null;
  labelSync: LabelSyncSubscriber | null;
  telemetry: TelemetrySubscriber | null;

  unsubscribeAll(): void;
}

/**
 * 全 Subscriber を登録
 */
export function registerEventSubscribers(
  dependencies: SubscriberDependencies,
  config: SubscriberConfig = {},
): RegisteredSubscribers {
  const subscribers: RegisteredSubscribers = {
    placePersistence: null,
    notification: null,
    labelSync: null,
    telemetry: null,
    unsubscribeAll: () => {
      subscribers.placePersistence?.unsubscribe();
      subscribers.notification?.unsubscribe();
      subscribers.labelSync?.unsubscribe();
      subscribers.telemetry?.unsubscribe();
      console.log("[registerEventSubscribers] All subscribers unsubscribed");
    },
  };

  // PlacePersistenceSubscriber
  if (config.placePersistence?.enabled !== false) {
    subscribers.placePersistence = new PlacePersistenceSubscriber(
      eventBus,
      dependencies.persistPlace,
      dependencies.deletePlace,
      config.placePersistence || { enabled: true },
    );
    subscribers.placePersistence.subscribe();
  }

  // NotificationSubscriber
  if (config.notification?.enabled !== false) {
    subscribers.notification = new NotificationSubscriber(
      eventBus,
      dependencies.notificationStore,
      config.notification || { enabled: true },
    );
    subscribers.notification.subscribe();
  }

  // LabelSyncSubscriber
  if (config.labelSync?.enabled !== false) {
    subscribers.labelSync = new LabelSyncSubscriber(
      dependencies.labelsStore,
      config.labelSync || { enabled: true },
    );
    subscribers.labelSync.subscribe();
  }

  // TelemetrySubscriber
  if (config.telemetry?.enabled !== false) {
    subscribers.telemetry = new TelemetrySubscriber(
      eventBus,
      config.telemetry || {
        enabled: true,
        logLevel: "info",
        metricsEnabled: true,
      },
    );
    subscribers.telemetry.subscribe();
  }

  console.log("[registerEventSubscribers] Subscribers registered:", {
    placePersistence: !!subscribers.placePersistence,
    notification: !!subscribers.notification,
    labelSync: !!subscribers.labelSync,
    telemetry: !!subscribers.telemetry,
  });

  return subscribers;
}

/**
 * デフォルト設定でのSubscriber登録（開発用）
 */
export function registerDefaultSubscribers(
  dependencies: Partial<SubscriberDependencies>,
): RegisteredSubscribers {
  // デフォルト実装を提供
  const defaultDeps: SubscriberDependencies = {
    persistPlace: dependencies.persistPlace || (async () => {}),
    deletePlace: dependencies.deletePlace || (async () => {}),
    notificationStore: dependencies.notificationStore || {
      addNotification: () => {},
    },
    labelsStore: dependencies.labelsStore || {
      setLabels: () => {},
      clearLabels: () => {},
    },
  };

  return registerEventSubscribers(defaultDeps, {
    placePersistence: { enabled: !!dependencies.persistPlace },
    notification: { enabled: !!dependencies.notificationStore },
    labelSync: { enabled: !!dependencies.labelsStore },
    telemetry: { enabled: true, logLevel: "info", metricsEnabled: true },
  });
}
