/**
 * 場所関連のイベント定義
 */
import { Place } from "../types";
import { EventBus, EventHandler, Unsubscribe } from "./EventBus";

/**
 * 場所関連のイベント名
 */
export const PlaceEventNames = {
  PLACE_ADDED: "place:added",
  PLACE_UPDATED: "place:updated",
  PLACE_DELETED: "place:deleted",
  PLACE_SELECTED: "place:selected",
  PLACE_DESELECTED: "place:deselected",
  PLACES_CLEARED: "places:cleared",
  PLACES_BATCH_UPDATED: "places:batchUpdated",
} as const;

/**
 * 場所関連のイベントペイロード
 */
export interface PlaceEventPayloads {
  [PlaceEventNames.PLACE_ADDED]: {
    place: Place;
    source?: "user" | "sync" | "import";
  };
  [PlaceEventNames.PLACE_UPDATED]: {
    placeId: string;
    place: Place;
    changes: Partial<Place>;
    previousPlace: Place;
  };
  [PlaceEventNames.PLACE_DELETED]: {
    placeId: string;
    place: Place;
    allPlaces: Place[];
  };
  [PlaceEventNames.PLACE_SELECTED]: {
    place: Place;
  };
  [PlaceEventNames.PLACE_DESELECTED]: {
    previousPlace: Place | null;
  };
  [PlaceEventNames.PLACES_CLEARED]: {
    count: number;
  };
  [PlaceEventNames.PLACES_BATCH_UPDATED]: {
    places: Place[];
    operation: "add" | "update" | "delete" | "mixed";
  };
}

/**
 * 場所関連のイベントを管理するクラス
 */
export class PlaceEventBus {
  constructor(private eventBus: EventBus) {}

  /**
   * 場所追加イベントを発火
   */
  emitPlaceAdded(
    place: Place,
    source?: "user" | "sync" | "import",
  ): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACE_ADDED, {
      place,
      source: source || "user",
    });
  }

  /**
   * 場所更新イベントを発火
   */
  emitPlaceUpdated(
    placeId: string,
    place: Place,
    changes: Partial<Place>,
    previousPlace: Place,
  ): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACE_UPDATED, {
      placeId,
      place,
      changes,
      previousPlace,
    });
  }

  /**
   * 場所削除イベントを発火
   */
  emitPlaceDeleted(
    placeId: string,
    place: Place,
    allPlaces: Place[],
  ): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACE_DELETED, {
      placeId,
      place,
      allPlaces,
    });
  }

  /**
   * 場所選択イベントを発火
   */
  emitPlaceSelected(place: Place): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACE_SELECTED, { place });
  }

  /**
   * 場所選択解除イベントを発火
   */
  emitPlaceDeselected(previousPlace: Place | null): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACE_DESELECTED, {
      previousPlace,
    });
  }

  /**
   * 場所クリアイベントを発火
   */
  emitPlacesCleared(count: number): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACES_CLEARED, { count });
  }

  /**
   * 場所バッチ更新イベントを発火
   */
  emitPlacesBatchUpdated(
    places: Place[],
    operation: "add" | "update" | "delete" | "mixed",
  ): Promise<void> {
    return this.eventBus.emit(PlaceEventNames.PLACES_BATCH_UPDATED, {
      places,
      operation,
    });
  }

  /**
   * 場所追加イベントを購読
   */
  onPlaceAdded(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACE_ADDED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACE_ADDED, handler);
  }

  /**
   * 場所更新イベントを購読
   */
  onPlaceUpdated(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACE_UPDATED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACE_UPDATED, handler);
  }

  /**
   * 場所削除イベントを購読
   */
  onPlaceDeleted(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACE_DELETED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACE_DELETED, handler);
  }

  /**
   * 場所選択イベントを購読
   */
  onPlaceSelected(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACE_SELECTED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACE_SELECTED, handler);
  }

  /**
   * 場所選択解除イベントを購読
   */
  onPlaceDeselected(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACE_DESELECTED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACE_DESELECTED, handler);
  }

  /**
   * 場所クリアイベントを購読
   */
  onPlacesCleared(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACES_CLEARED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACES_CLEARED, handler);
  }

  /**
   * 場所バッチ更新イベントを購読
   */
  onPlacesBatchUpdated(
    handler: EventHandler<
      PlaceEventPayloads[typeof PlaceEventNames.PLACES_BATCH_UPDATED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(PlaceEventNames.PLACES_BATCH_UPDATED, handler);
  }
}
