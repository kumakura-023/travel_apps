/**
 * ルート関連のイベント定義
 */
import { RouteConnection } from "../types";
import { EventBus, EventHandler, Unsubscribe } from "./EventBus";

/**
 * ルート関連のイベント名
 */
export const RouteEventNames = {
  ROUTE_ADDED: "route:added",
  ROUTE_REMOVED: "route:removed",
  ROUTE_CLEARED: "route:cleared",
  CONNECTION_ADDED: "connection:added",
  CONNECTION_REMOVED: "connection:removed",
  CONNECTIONS_CLEARED: "connections:cleared",
} as const;

/**
 * ルート結果の簡易型（EventBus用）
 */
export interface RouteEventResult {
  id: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  duration: number;
  distance: number;
  travelMode: string;
}

/**
 * ルート関連のイベントペイロード
 */
export interface RouteEventPayloads {
  [RouteEventNames.ROUTE_ADDED]: {
    route: RouteEventResult;
    source?: "user" | "sync" | "import";
  };
  [RouteEventNames.ROUTE_REMOVED]: {
    routeId: string;
    removedBy: "user" | "system";
  };
  [RouteEventNames.ROUTE_CLEARED]: {
    count: number;
    clearedBy: "user" | "plan-switch" | "system";
  };
  [RouteEventNames.CONNECTION_ADDED]: {
    connection: RouteConnection;
    source?: "user" | "sync" | "import";
  };
  [RouteEventNames.CONNECTION_REMOVED]: {
    connectionId: string;
    removedBy: "user" | "system";
  };
  [RouteEventNames.CONNECTIONS_CLEARED]: {
    count: number;
    clearedBy: "user" | "plan-switch" | "system";
  };
}

/**
 * ルート関連のイベントを管理するクラス
 */
export class RouteEventBus {
  constructor(private eventBus: EventBus) {}

  /**
   * ルート追加イベントを発火
   */
  emitRouteAdded(
    route: RouteEventResult,
    source?: "user" | "sync" | "import",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.ROUTE_ADDED, {
      route,
      source: source || "user",
    });
  }

  /**
   * ルート削除イベントを発火
   */
  emitRouteRemoved(
    routeId: string,
    removedBy: "user" | "system" = "user",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.ROUTE_REMOVED, {
      routeId,
      removedBy,
    });
  }

  /**
   * ルートクリアイベントを発火
   */
  emitRouteCleared(
    count: number,
    clearedBy: "user" | "plan-switch" | "system" = "user",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.ROUTE_CLEARED, {
      count,
      clearedBy,
    });
  }

  /**
   * 接続追加イベントを発火
   */
  emitConnectionAdded(
    connection: RouteConnection,
    source?: "user" | "sync" | "import",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.CONNECTION_ADDED, {
      connection,
      source: source || "user",
    });
  }

  /**
   * 接続削除イベントを発火
   */
  emitConnectionRemoved(
    connectionId: string,
    removedBy: "user" | "system" = "user",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.CONNECTION_REMOVED, {
      connectionId,
      removedBy,
    });
  }

  /**
   * 接続クリアイベントを発火
   */
  emitConnectionsCleared(
    count: number,
    clearedBy: "user" | "plan-switch" | "system" = "user",
  ): Promise<void> {
    return this.eventBus.emit(RouteEventNames.CONNECTIONS_CLEARED, {
      count,
      clearedBy,
    });
  }

  // ========== Subscription Methods ==========

  /**
   * ルート追加イベントを購読
   */
  onRouteAdded(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.ROUTE_ADDED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.ROUTE_ADDED, handler);
  }

  /**
   * ルート削除イベントを購読
   */
  onRouteRemoved(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.ROUTE_REMOVED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.ROUTE_REMOVED, handler);
  }

  /**
   * ルートクリアイベントを購読
   */
  onRouteCleared(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.ROUTE_CLEARED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.ROUTE_CLEARED, handler);
  }

  /**
   * 接続追加イベントを購読
   */
  onConnectionAdded(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.CONNECTION_ADDED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.CONNECTION_ADDED, handler);
  }

  /**
   * 接続削除イベントを購読
   */
  onConnectionRemoved(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.CONNECTION_REMOVED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.CONNECTION_REMOVED, handler);
  }

  /**
   * 接続クリアイベントを購読
   */
  onConnectionsCleared(
    handler: EventHandler<
      RouteEventPayloads[typeof RouteEventNames.CONNECTIONS_CLEARED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(RouteEventNames.CONNECTIONS_CLEARED, handler);
  }
}
