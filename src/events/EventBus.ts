/**
 * イベントハンドラーの型定義
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * イベントの購読解除関数
 */
export type Unsubscribe = () => void;

/**
 * イベント購読オプション
 */
interface SubscriptionOptions {
  once?: boolean;
  priority?: number;
}

/**
 * イベント購読情報
 */
interface Subscription {
  handler: EventHandler;
  options: SubscriptionOptions;
}

/**
 * イベントバスクラス
 * 疎結合なコンポーネント間通信を実現
 */
export class EventBus {
  private listeners = new Map<string, Set<Subscription>>();
  private wildcardListeners = new Set<{
    pattern: RegExp;
    subscription: Subscription;
  }>();

  /**
   * イベントを購読
   */
  on<T = any>(
    event: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {},
  ): Unsubscribe {
    const subscription: Subscription = {
      handler,
      options: {
        once: false,
        priority: 0,
        ...options,
      },
    };

    // ワイルドカードパターンの処理
    if (event.includes("*")) {
      const pattern = new RegExp(
        "^" + event.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$",
      );
      this.wildcardListeners.add({ pattern, subscription });
    } else {
      // 通常のイベント購読
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(subscription);
    }

    // 購読解除関数を返す
    return () => this.off(event, handler);
  }

  /**
   * 一度だけ実行されるイベントを購読
   */
  once<T = any>(
    event: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {},
  ): Unsubscribe {
    return this.on(event, handler, { ...options, once: true });
  }

  /**
   * イベントの購読を解除
   */
  off(event: string, handler: EventHandler): void {
    // ワイルドカードリスナーから削除
    if (event.includes("*")) {
      this.wildcardListeners.forEach((listener, key) => {
        if (listener.subscription.handler === handler) {
          this.wildcardListeners.delete(listener);
        }
      });
      return;
    }

    // 通常のリスナーから削除
    const subscriptions = this.listeners.get(event);
    if (subscriptions) {
      subscriptions.forEach((sub) => {
        if (sub.handler === handler) {
          subscriptions.delete(sub);
        }
      });

      if (subscriptions.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * イベントを発火
   */
  async emit<T = any>(event: string, data?: T): Promise<void> {
    const promises: Promise<void>[] = [];

    // 通常のリスナーを取得
    const directSubscriptions = this.listeners.get(event) || new Set();

    // ワイルドカードリスナーを取得
    const wildcardSubscriptions = new Set<Subscription>();
    this.wildcardListeners.forEach(({ pattern, subscription }) => {
      if (pattern.test(event)) {
        wildcardSubscriptions.add(subscription);
      }
    });

    // 全てのサブスクリプションを結合してプライオリティでソート
    const allSubscriptions = [
      ...Array.from(directSubscriptions),
      ...Array.from(wildcardSubscriptions),
    ].sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    // ハンドラーを実行
    for (const subscription of allSubscriptions) {
      try {
        const result = subscription.handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }

        // onceオプションの場合は削除
        if (subscription.options.once) {
          if (directSubscriptions.has(subscription)) {
            directSubscriptions.delete(subscription);
          }
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }

    // 全ての非同期ハンドラーの完了を待つ
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  /**
   * 特定のイベントのリスナー数を取得
   */
  listenerCount(event: string): number {
    const directCount = this.listeners.get(event)?.size || 0;

    let wildcardCount = 0;
    this.wildcardListeners.forEach(({ pattern }) => {
      if (pattern.test(event)) {
        wildcardCount++;
      }
    });

    return directCount + wildcardCount;
  }

  /**
   * 全てのリスナーをクリア
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      // ワイルドカードリスナーは個別に削除できないため、パターンマッチするものを探す必要がある
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  /**
   * イベント名の一覧を取得
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// シングルトンインスタンス
export const eventBus = new EventBus();

// イベント名の定数（型安全性のため）
export const EventNames = {
  // プラン関連
  PLAN_CREATED: "plan:created",
  PLAN_UPDATED: "plan:updated",
  PLAN_DELETED: "plan:deleted",
  PLAN_SELECTED: "plan:selected",

  // 場所関連
  PLACE_ADDED: "place:added",
  PLACE_UPDATED: "place:updated",
  PLACE_REMOVED: "place:removed",
  PLACE_SELECTED: "place:selected",

  // ルート関連
  ROUTE_CALCULATED: "route:calculated",
  ROUTE_ERROR: "route:error",
  ROUTE_CLEARED: "route:cleared",

  // 同期関連
  SYNC_STARTED: "sync:started",
  SYNC_COMPLETED: "sync:completed",
  SYNC_FAILED: "sync:failed",
  SYNC_CONFLICT: "sync:conflict",

  // UI関連
  MODAL_OPENED: "ui:modal:opened",
  MODAL_CLOSED: "ui:modal:closed",
  TOAST_SHOWN: "ui:toast:shown",

  // エラー関連
  ERROR_OCCURRED: "error:occurred",
  ERROR_HANDLED: "error:handled",
} as const;

// イベントペイロードの型定義
export interface EventPayloads {
  [EventNames.PLAN_CREATED]: { planId: string; plan: any };
  [EventNames.PLAN_UPDATED]: { planId: string; changes: any };
  [EventNames.PLAN_DELETED]: { planId: string };
  [EventNames.PLAN_SELECTED]: { planId: string };

  [EventNames.PLACE_ADDED]: { placeId: string; place: any };
  [EventNames.PLACE_UPDATED]: { placeId: string; changes: any };
  [EventNames.PLACE_REMOVED]: { placeId: string };
  [EventNames.PLACE_SELECTED]: { placeId: string | null };

  [EventNames.ROUTE_CALCULATED]: { route: any; duration: number };
  [EventNames.ROUTE_ERROR]: { error: Error; request: any };
  [EventNames.ROUTE_CLEARED]: void;

  [EventNames.SYNC_STARTED]: { planId: string };
  [EventNames.SYNC_COMPLETED]: { planId: string; result: any };
  [EventNames.SYNC_FAILED]: { planId: string; error: Error };
  [EventNames.SYNC_CONFLICT]: { planId: string; conflict: any };

  [EventNames.MODAL_OPENED]: { modalId: string };
  [EventNames.MODAL_CLOSED]: { modalId: string };
  [EventNames.TOAST_SHOWN]: {
    message: string;
    type: "success" | "error" | "info";
  };

  [EventNames.ERROR_OCCURRED]: { error: Error; context?: any };
  [EventNames.ERROR_HANDLED]: { error: Error; handled: boolean };
}

// 型安全なイベントバスラッパー
export class TypedEventBus {
  constructor(private bus: EventBus) {}

  on<K extends keyof EventPayloads>(
    event: K,
    handler: EventHandler<EventPayloads[K]>,
    options?: SubscriptionOptions,
  ): Unsubscribe {
    return this.bus.on(event, handler, options);
  }

  once<K extends keyof EventPayloads>(
    event: K,
    handler: EventHandler<EventPayloads[K]>,
    options?: SubscriptionOptions,
  ): Unsubscribe {
    return this.bus.once(event, handler, options);
  }

  off<K extends keyof EventPayloads>(
    event: K,
    handler: EventHandler<EventPayloads[K]>,
  ): void {
    this.bus.off(event, handler);
  }

  emit<K extends keyof EventPayloads>(
    event: K,
    data: EventPayloads[K],
  ): Promise<void> {
    return this.bus.emit(event, data);
  }
}

// 型安全なイベントバスのエクスポート
export const typedEventBus = new TypedEventBus(eventBus);
