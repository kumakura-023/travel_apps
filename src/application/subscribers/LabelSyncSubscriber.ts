/**
 * Phase 3: Label 同期 Subscriber
 * plan:loaded / plan:switched イベントを購読し、labelsStore を更新する
 */

import { EventBus, Unsubscribe } from "../../events/EventBus";
import type { Label, TravelPlan } from "../../types";
import { storeEventBus, StoreEvent } from "../../events/StoreEvents";

export interface LabelSyncConfig {
  enabled: boolean;
}

export interface LabelsStore {
  setLabels(labels: Label[]): void;
  clearLabels(): void;
}

/**
 * Label 同期 Subscriber
 * PLAN_LOADED イベントを購読し、labelsStore を同期更新
 */
export class LabelSyncSubscriber {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly labelsStore: LabelsStore,
    private readonly config: LabelSyncConfig = { enabled: true },
  ) {}

  /**
   * 購読開始
   */
  subscribe(): void {
    if (!this.config.enabled) {
      console.log("[LabelSyncSubscriber] Disabled, skipping subscribe");
      return;
    }

    // StoreEventBus を使用（既存のアーキテクチャに合わせる）
    // PLAN_LOADED イベント
    const unsubLoaded = storeEventBus.on(
      "PLAN_LOADED",
      (event: Extract<StoreEvent, { type: "PLAN_LOADED" }>) => {
        this.handlePlanLoaded(event.plan);
      },
    );
    this.unsubscribers.push(unsubLoaded);

    // PLAN_DELETED イベント
    const unsubDeleted = storeEventBus.on("PLAN_DELETED", () => {
      this.handlePlanDeleted();
    });
    this.unsubscribers.push(unsubDeleted);

    // LABEL_ADDED イベント
    const unsubLabelAdded = storeEventBus.on(
      "LABEL_ADDED",
      (event: Extract<StoreEvent, { type: "LABEL_ADDED" }>) => {
        this.handleLabelAdded(event.label);
      },
    );
    this.unsubscribers.push(unsubLabelAdded);

    // LABEL_UPDATED イベント
    const unsubLabelUpdated = storeEventBus.on(
      "LABEL_UPDATED",
      (event: Extract<StoreEvent, { type: "LABEL_UPDATED" }>) => {
        this.handleLabelUpdated(event.labelId, event.changes);
      },
    );
    this.unsubscribers.push(unsubLabelUpdated);

    // LABEL_DELETED イベント
    const unsubLabelDeleted = storeEventBus.on(
      "LABEL_DELETED",
      (event: Extract<StoreEvent, { type: "LABEL_DELETED" }>) => {
        this.handleLabelDeleted(event.labelId);
      },
    );
    this.unsubscribers.push(unsubLabelDeleted);

    console.log("[LabelSyncSubscriber] Subscribed to plan/label events");
  }

  /**
   * 購読解除
   */
  unsubscribe(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    console.log("[LabelSyncSubscriber] Unsubscribed from plan/label events");
  }

  /**
   * Plan ロードハンドラ
   */
  private handlePlanLoaded(plan: TravelPlan): void {
    const labels = plan.labels || [];
    console.log("[LabelSyncSubscriber] Plan loaded, syncing labels:", {
      planId: plan.id,
      labelCount: labels.length,
    });

    this.labelsStore.setLabels(labels);
  }

  /**
   * Plan 削除ハンドラ
   */
  private handlePlanDeleted(): void {
    console.log("[LabelSyncSubscriber] Plan deleted, clearing labels");
    this.labelsStore.clearLabels();
  }

  /**
   * Label 追加ハンドラ
   * Note: 個別の追加は現在の実装では labelsStore が内部で処理
   * ここではログのみ
   */
  private handleLabelAdded(label: Label): void {
    console.log("[LabelSyncSubscriber] Label added:", label.id);
  }

  /**
   * Label 更新ハンドラ
   */
  private handleLabelUpdated(labelId: string, changes: Partial<Label>): void {
    console.log("[LabelSyncSubscriber] Label updated:", labelId, changes);
  }

  /**
   * Label 削除ハンドラ
   */
  private handleLabelDeleted(labelId: string): void {
    console.log("[LabelSyncSubscriber] Label deleted:", labelId);
  }
}
