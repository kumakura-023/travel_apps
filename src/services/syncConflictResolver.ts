import { TravelPlan, Place, MapLabel } from "../types";

/**
 * 削除されたアイテムの情報を追跡するインターフェース
 */
interface DeletedItem {
  id: string;
  deletedAt: Date;
  type: "place" | "label";
}

/**
 * 同期競合解決のためのインターフェース
 * 単一責任原則に従い、競合解決ロジックを抽象化
 */
export interface SyncConflictResolver {
  /**
   * ローカル更新とリモート更新の競合を解決
   * @param localPlan ローカルプラン
   * @param remotePlan リモートプラン
   * @param localTimestamp ローカル更新タイムスタンプ
   * @param remoteTimestamp リモート更新タイムスタンプ
   * @returns 解決されたプラン
   */
  resolveConflict(
    localPlan: TravelPlan,
    remotePlan: TravelPlan,
    localTimestamp: Date,
    remoteTimestamp: Date,
  ): TravelPlan;

  /**
   * 更新タイムスタンプの比較
   * @param local ローカルタイムスタンプ
   * @param remote リモートタイムスタンプ
   * @returns ローカルが新しい場合true
   */
  isNewer(local: Date, remote: Date): boolean;

  /**
   * 部分更新の適用
   * @param basePlan ベースプラン
   * @param update 更新内容
   * @returns 更新されたプラン
   */
  applyPartialUpdate(
    basePlan: TravelPlan,
    update: Partial<TravelPlan>,
  ): TravelPlan;

  /**
   * 地点レベルの競合解決
   * @param localPlaces ローカル地点リスト
   * @param remotePlaces リモート地点リスト
   * @param deletedPlaces 削除された地点の情報
   * @returns 解決された地点リスト
   */
  resolvePlacesConflict(
    localPlaces: Place[],
    remotePlaces: Place[],
    deletedPlaces?: DeletedItem[],
  ): Place[];

  /**
   * ラベルレベルの競合解決
   * @param localLabels ローカルラベルリスト
   * @param remoteLabels リモートラベルリスト
   * @param deletedLabels 削除されたラベルの情報
   * @returns 解決されたラベルリスト
   */
  resolveLabelsConflict(
    localLabels: MapLabel[],
    remoteLabels: MapLabel[],
    deletedLabels?: DeletedItem[],
  ): MapLabel[];

  /**
   * 削除されたアイテムの情報を取得
   * @param localPlan ローカルプラン
   * @param remotePlan リモートプラン
   * @returns 削除されたアイテムの情報
   */
  getDeletedItems(
    localPlan: TravelPlan,
    remotePlan: TravelPlan,
  ): {
    deletedPlaces: DeletedItem[];
    deletedLabels: DeletedItem[];
  };
}

/**
 * 同期競合解決の実装クラス
 * 変わりにくいもの（インターフェース）に依存し、具体的な実装を提供
 */
export class DefaultSyncConflictResolver implements SyncConflictResolver {
  /**
   * 競合解決のメインロジック
   * プランレベルとアイテムレベル（地点・ラベル）の両方で競合を解決
   */
  resolveConflict(
    localPlan: TravelPlan,
    remotePlan: TravelPlan,
    localTimestamp: Date,
    remoteTimestamp: Date,
  ): TravelPlan {
    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log("%c🔄 競合解決開始", "color: #2e95ea; font-weight: bold;", {
        localTimestamp: localTimestamp.toISOString(),
        remoteTimestamp: remoteTimestamp.toISOString(),
        timeDiff: Math.abs(
          localTimestamp.getTime() - remoteTimestamp.getTime(),
        ),
        localPlan: {
          places: localPlan.places.length,
          labels: localPlan.labels.length,
          deletedPlaces: localPlan.places.filter((p) => p.deleted).length,
        },
        remotePlan: {
          places: remotePlan.places.length,
          labels: remotePlan.labels.length,
          deletedPlaces: remotePlan.places.filter((p) => p.deleted).length,
        },
      });
    }

    // 削除されたアイテムの情報を取得
    const { deletedPlaces, deletedLabels } = this.getDeletedItems(
      localPlan,
      remotePlan,
    );

    // プランレベルの基本情報は新しい方を採用
    const basePlan = this.isNewer(localTimestamp, remoteTimestamp)
      ? localPlan
      : remotePlan;

    // 地点とラベルは個別に競合解決（削除情報を含む）
    const resolvedPlaces = this.resolvePlacesConflict(
      localPlan.places,
      remotePlan.places,
      deletedPlaces,
    );
    const resolvedLabels = this.resolveLabelsConflict(
      localPlan.labels,
      remotePlan.labels,
      deletedLabels,
    );

    // 解決されたプランを構築
    const resolvedPlan: TravelPlan = {
      ...basePlan,
      places: resolvedPlaces,
      labels: resolvedLabels,
      totalCost: resolvedPlaces.reduce(
        (sum, p) => sum + (p.estimatedCost || 0),
        0,
      ),
      updatedAt: new Date(), // 競合解決時刻
    };

    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log("🔄 競合解決完了:", {
        originalLocalPlaces: localPlan.places.length,
        originalRemotePlaces: remotePlan.places.length,
        resolvedPlaces: resolvedPlaces.length,
        originalLocalLabels: localPlan.labels.length,
        originalRemoteLabels: remotePlan.labels.length,
        resolvedLabels: resolvedLabels.length,
        deletedPlaces: deletedPlaces.length,
        deletedLabels: deletedLabels.length,
        changes: {
          placesAdded:
            resolvedPlaces.length -
            Math.max(localPlan.places.length, remotePlan.places.length),
          labelsAdded:
            resolvedLabels.length -
            Math.max(localPlan.labels.length, remotePlan.labels.length),
        },
        timestampComparison: {
          localNewer: this.isNewer(localTimestamp, remoteTimestamp),
          sameTimestamp: localTimestamp.getTime() === remoteTimestamp.getTime(),
          timeDiff: Math.abs(
            localTimestamp.getTime() - remoteTimestamp.getTime(),
          ),
        },
      });
    }

    return resolvedPlan;
  }

  /**
   * 削除されたアイテムの情報を取得
   * 明示的に削除フラグがある場合のみ削除として扱う
   */
  getDeletedItems(
    localPlan: TravelPlan,
    remotePlan: TravelPlan,
  ): {
    deletedPlaces: DeletedItem[];
    deletedLabels: DeletedItem[];
  } {
    const deletedPlaceIds = new Set<string>();
    const deletedLabelIds = new Set<string>();

    // ローカルプランとリモートプランから `deleted` フラグを持つアイテムを収集
    localPlan.places.forEach((p) => p.deleted && deletedPlaceIds.add(p.id));
    remotePlan.places.forEach((p) => p.deleted && deletedPlaceIds.add(p.id));

    // ToDo: ラベルの削除も同様に実装する
    // localPlan.labels.forEach(l => l.deleted && deletedLabelIds.add(l.id));
    // remotePlan.labels.forEach(l => l.deleted && deletedLabelIds.add(l.id));

    const deletedPlaces = Array.from(deletedPlaceIds).map((id) => ({
      id,
      deletedAt: new Date(), // 正確な削除時刻は不明なため現在時刻を設定
      type: "place" as const,
    }));

    const deletedLabels = Array.from(deletedLabelIds).map((id) => ({
      id,
      deletedAt: new Date(),
      type: "label" as const,
    }));

    if (import.meta.env.DEV) {
      if (deletedPlaces.length > 0 || deletedLabels.length > 0) {
        console.log("🗑️ 削除済みアイテムを検出:", {
          deletedPlaces: deletedPlaces.map((p) => p.id),
          deletedLabels: deletedLabels.map((l) => l.id),
        });
      }
    }

    return { deletedPlaces, deletedLabels };
  }

  /**
   * タイムスタンプ比較
   * ミリ秒精度で比較し、ローカルが新しい場合true
   */
  isNewer(local: Date, remote: Date): boolean {
    return local.getTime() > remote.getTime();
  }

  /**
   * 部分更新の適用
   * 深いマージではなく、浅いマージで更新
   */
  applyPartialUpdate(
    basePlan: TravelPlan,
    update: Partial<TravelPlan>,
  ): TravelPlan {
    return {
      ...basePlan,
      ...update,
      updatedAt: new Date(),
    };
  }

  /**
   * 地点レベルの競合解決
   * IDベースでマージし、新しい方を採用
   */
  resolvePlacesConflict(
    localPlaces: Place[],
    remotePlaces: Place[],
    deletedPlaces: DeletedItem[] = [],
  ): Place[] {
    const placeMap = new Map<string, Place>();
    let conflicts = 0;
    let additions = 0;
    let sameTimestampConflicts = 0;
    let positionUpdates = 0;

    // リモート地点を基準にマップを構築
    remotePlaces.forEach((place) => {
      placeMap.set(place.id, place);
    });

    // ローカル地点で競合解決
    localPlaces.forEach((localPlace) => {
      const remotePlace = placeMap.get(localPlace.id);
      if (!remotePlace) {
        // リモートに存在しない場合はローカルを追加
        placeMap.set(localPlace.id, localPlace);
        additions++;
      } else {
        // 競合がある場合は新しい方を採用
        const localTime = localPlace.updatedAt.getTime();
        const remoteTime = remotePlace.updatedAt.getTime();
        const timeDiff = Math.abs(localTime - remoteTime);

        // 位置情報の変更を検知
        const hasPositionChange =
          localPlace.coordinates.lat !== remotePlace.coordinates.lat ||
          localPlace.coordinates.lng !== remotePlace.coordinates.lng ||
          localPlace.labelPosition?.lat !== remotePlace.labelPosition?.lat ||
          localPlace.labelPosition?.lng !== remotePlace.labelPosition?.lng;

        let resolvedPlace: Place;
        if (timeDiff < 1000) {
          // 1秒以内の差は同じとみなす（厳格化）
          // タイムスタンプが同じ場合は位置情報の変更を考慮
          if (hasPositionChange) {
            // 位置情報が変更されている場合はローカルを優先
            resolvedPlace = localPlace;
            positionUpdates++;
          } else {
            // 位置情報が同じ場合はリモートを優先（変更）
            resolvedPlace = remotePlace;
          }
          sameTimestampConflicts++;
        } else {
          // タイムスタンプが異なる場合は新しい方を採用
          resolvedPlace = this.isNewer(
            localPlace.updatedAt,
            remotePlace.updatedAt,
          )
            ? localPlace
            : remotePlace;
          conflicts++;
        }

        placeMap.set(localPlace.id, resolvedPlace);
      }
    });

    // 削除された地点を除外
    const deletedPlaceIds = new Set(deletedPlaces.map((item) => item.id));
    const result = Array.from(placeMap.values()).filter(
      (place) => !deletedPlaceIds.has(place.id),
    );

    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log("%c🔄 地点競合解決結果", "color: #2e95ea;", {
        localPlaces: `${localPlaces.length} (deleted: ${localPlaces.filter((p) => p.deleted).length})`,
        remotePlaces: `${remotePlaces.length} (deleted: ${remotePlaces.filter((p) => p.deleted).length})`,
        resolvedPlaces: result.length,
        conflicts,
        additions,
        sameTimestampConflicts,
        positionUpdates,
        deletedItems: deletedPlaces.length,
      });
    }

    return result;
  }

  /**
   * ラベルレベルの競合解決
   * IDベースでマージし、新しい方を採用
   */
  resolveLabelsConflict(
    localLabels: MapLabel[],
    remoteLabels: MapLabel[],
    deletedLabels: DeletedItem[] = [],
  ): MapLabel[] {
    const labelMap = new Map<string, MapLabel>();
    let conflicts = 0;
    let additions = 0;
    let sameTimestampConflicts = 0;

    // リモートラベルを基準にマップを構築
    remoteLabels.forEach((label) => {
      // 既存データの互換性確保
      const normalizedLabel = this.normalizeLabel(label);
      labelMap.set(normalizedLabel.id, normalizedLabel);
    });

    // ローカルラベルで競合解決
    localLabels.forEach((localLabel) => {
      // 既存データの互換性確保
      const normalizedLocalLabel = this.normalizeLabel(localLabel);
      const remoteLabel = labelMap.get(normalizedLocalLabel.id);

      if (!remoteLabel) {
        // リモートに存在しない場合はローカルを追加
        labelMap.set(normalizedLocalLabel.id, normalizedLocalLabel);
        additions++;
      } else {
        // 更新時刻で比較し、新しい方を採用
        const localTime = normalizedLocalLabel.updatedAt.getTime();
        const remoteTime = remoteLabel.updatedAt.getTime();
        const timeDiff = Math.abs(localTime - remoteTime);

        let resolvedLabel: MapLabel;
        if (timeDiff < 1000) {
          // 1秒以内の差は同じとみなす（厳格化）
          // タイムスタンプが同じ場合はリモートを優先（変更）
          resolvedLabel = remoteLabel;
          sameTimestampConflicts++;
        } else {
          // タイムスタンプが異なる場合は新しい方を採用
          resolvedLabel = this.isNewer(
            normalizedLocalLabel.updatedAt,
            remoteLabel.updatedAt,
          )
            ? normalizedLocalLabel
            : remoteLabel;
          conflicts++;
        }

        labelMap.set(normalizedLocalLabel.id, resolvedLabel);
      }
    });

    // 削除されたラベルを除外
    const deletedLabelIds = new Set(deletedLabels.map((item) => item.id));
    const result = Array.from(labelMap.values()).filter(
      (label) => !deletedLabelIds.has(label.id),
    );

    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log("🔄 ラベル競合解決結果:", {
        localLabels: localLabels.length,
        remoteLabels: remoteLabels.length,
        resolvedLabels: result.length,
        conflicts,
        additions,
        sameTimestampConflicts,
        deletedLabels: deletedLabels.length,
      });
    }

    return result;
  }

  /**
   * ラベルデータの正規化（既存データの互換性確保）
   */
  private normalizeLabel(label: MapLabel): MapLabel {
    const now = new Date();
    return {
      ...label,
      createdAt: label.createdAt || now,
      updatedAt: label.updatedAt || now,
    };
  }
}

/**
 * 競合解決のファクトリー関数
 * インターフェースへの依存を実現
 */
export function createSyncConflictResolver(): SyncConflictResolver {
  return new DefaultSyncConflictResolver();
}
