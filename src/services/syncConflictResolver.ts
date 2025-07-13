import { TravelPlan, Place, MapLabel } from '../types';

/**
 * 削除されたアイテムの情報を追跡するインターフェース
 */
interface DeletedItem {
  id: string;
  deletedAt: Date;
  type: 'place' | 'label';
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
    remoteTimestamp: Date
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
  applyPartialUpdate(basePlan: TravelPlan, update: Partial<TravelPlan>): TravelPlan;

  /**
   * 地点レベルの競合解決
   * @param localPlaces ローカル地点リスト
   * @param remotePlaces リモート地点リスト
   * @param deletedPlaces 削除された地点の情報
   * @returns 解決された地点リスト
   */
  resolvePlacesConflict(localPlaces: Place[], remotePlaces: Place[], deletedPlaces?: DeletedItem[]): Place[];

  /**
   * ラベルレベルの競合解決
   * @param localLabels ローカルラベルリスト
   * @param remoteLabels リモートラベルリスト
   * @param deletedLabels 削除されたラベルの情報
   * @returns 解決されたラベルリスト
   */
  resolveLabelsConflict(localLabels: MapLabel[], remoteLabels: MapLabel[], deletedLabels?: DeletedItem[]): MapLabel[];

  /**
   * 削除されたアイテムの情報を取得
   * @param localPlan ローカルプラン
   * @param remotePlan リモートプラン
   * @returns 削除されたアイテムの情報
   */
  getDeletedItems(localPlan: TravelPlan, remotePlan: TravelPlan): {
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
    remoteTimestamp: Date
  ): TravelPlan {
    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log('🔄 競合解決開始:', {
        localPlaces: localPlan.places.length,
        remotePlaces: remotePlan.places.length,
        localLabels: localPlan.labels.length,
        remoteLabels: remotePlan.labels.length,
        localTimestamp: localTimestamp.toISOString(),
        remoteTimestamp: remoteTimestamp.toISOString()
      });
    }

    // 削除されたアイテムの情報を取得
    const { deletedPlaces, deletedLabels } = this.getDeletedItems(localPlan, remotePlan);

    // プランレベルの基本情報は新しい方を採用
    const basePlan = this.isNewer(localTimestamp, remoteTimestamp) ? localPlan : remotePlan;
    
    // 地点とラベルは個別に競合解決（削除情報を含む）
    const resolvedPlaces = this.resolvePlacesConflict(localPlan.places, remotePlan.places, deletedPlaces);
    const resolvedLabels = this.resolveLabelsConflict(localPlan.labels, remotePlan.labels, deletedLabels);
    
    // 解決されたプランを構築
    const resolvedPlan: TravelPlan = {
      ...basePlan,
      places: resolvedPlaces,
      labels: resolvedLabels,
      totalCost: resolvedPlaces.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      updatedAt: new Date(), // 競合解決時刻
    };

    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log('🔄 競合解決完了:', {
        originalLocalPlaces: localPlan.places.length,
        originalRemotePlaces: remotePlan.places.length,
        resolvedPlaces: resolvedPlaces.length,
        originalLocalLabels: localPlan.labels.length,
        originalRemoteLabels: remotePlan.labels.length,
        resolvedLabels: resolvedLabels.length,
        deletedPlaces: deletedPlaces.length,
        deletedLabels: deletedLabels.length,
        changes: {
          placesAdded: resolvedPlaces.length - Math.max(localPlan.places.length, remotePlan.places.length),
          labelsAdded: resolvedLabels.length - Math.max(localPlan.labels.length, remotePlan.labels.length)
        }
      });
    }

    return resolvedPlan;
  }

  /**
   * 削除されたアイテムの情報を取得
   * ローカルとリモートの差分から削除されたアイテムを特定
   */
  getDeletedItems(localPlan: TravelPlan, remotePlan: TravelPlan): {
    deletedPlaces: DeletedItem[];
    deletedLabels: DeletedItem[];
  } {
    const deletedPlaces: DeletedItem[] = [];
    const deletedLabels: DeletedItem[] = [];

    // 地点の削除を検出
    const localPlaceIds = new Set(localPlan.places.map(p => p.id));
    const remotePlaceIds = new Set(remotePlan.places.map(p => p.id));

    // リモートにあってローカルにない地点は削除された可能性
    remotePlaceIds.forEach(id => {
      if (!localPlaceIds.has(id)) {
        const remotePlace = remotePlan.places.find(p => p.id === id);
        if (remotePlace) {
          deletedPlaces.push({
            id,
            deletedAt: remotePlace.updatedAt,
            type: 'place'
          });
        }
      }
    });

    // ローカルにあってリモートにない地点は削除された可能性
    localPlaceIds.forEach(id => {
      if (!remotePlaceIds.has(id)) {
        const localPlace = localPlan.places.find(p => p.id === id);
        if (localPlace) {
          deletedPlaces.push({
            id,
            deletedAt: localPlace.updatedAt,
            type: 'place'
          });
        }
      }
    });

    // ラベルの削除を検出
    const localLabelIds = new Set(localPlan.labels.map(l => l.id));
    const remoteLabelIds = new Set(remotePlan.labels.map(l => l.id));

    // リモートにあってローカルにないラベルは削除された可能性
    remoteLabelIds.forEach(id => {
      if (!localLabelIds.has(id)) {
        const remoteLabel = remotePlan.labels.find(l => l.id === id);
        if (remoteLabel) {
          deletedLabels.push({
            id,
            deletedAt: remoteLabel.updatedAt,
            type: 'label'
          });
        }
      }
    });

    // ローカルにあってリモートにないラベルは削除された可能性
    localLabelIds.forEach(id => {
      if (!remoteLabelIds.has(id)) {
        const localLabel = localPlan.labels.find(l => l.id === id);
        if (localLabel) {
          deletedLabels.push({
            id,
            deletedAt: localLabel.updatedAt,
            type: 'label'
          });
        }
      }
    });

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
  applyPartialUpdate(basePlan: TravelPlan, update: Partial<TravelPlan>): TravelPlan {
    return {
      ...basePlan,
      ...update,
      updatedAt: new Date(),
    };
  }

  /**
   * 地点レベルの競合解決
   * IDベースでマージし、新しい方を採用（削除情報を考慮）
   */
  resolvePlacesConflict(localPlaces: Place[], remotePlaces: Place[], deletedPlaces: DeletedItem[] = []): Place[] {
    const placeMap = new Map<string, Place>();
    let conflicts = 0;
    let additions = 0;
    let deletions = 0;
    
    // 削除された地点のIDセットを作成
    const deletedPlaceIds = new Set(deletedPlaces.map(d => d.id));
    
    // リモート地点を基準にマップを構築（削除された地点は除外）
    remotePlaces.forEach(place => {
      if (!deletedPlaceIds.has(place.id)) {
        placeMap.set(place.id, place);
      } else {
        deletions++;
      }
    });
    
    // ローカル地点で競合解決（削除された地点は除外）
    localPlaces.forEach(localPlace => {
      if (deletedPlaceIds.has(localPlace.id)) {
        deletions++;
        return;
      }

      const remotePlace = placeMap.get(localPlace.id);
      if (!remotePlace) {
        // リモートに存在しない場合はローカルを追加
        placeMap.set(localPlace.id, localPlace);
        additions++;
      } else {
        // 競合がある場合は新しい方を採用
        const resolvedPlace = this.isNewer(localPlace.updatedAt, remotePlace.updatedAt)
          ? localPlace
          : remotePlace;
        placeMap.set(localPlace.id, resolvedPlace);
        if (resolvedPlace !== remotePlace) {
          conflicts++;
        }
      }
    });
    
    const result = Array.from(placeMap.values());
    
    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log('🔄 地点競合解決:', {
        localCount: localPlaces.length,
        remoteCount: remotePlaces.length,
        resolvedCount: result.length,
        conflicts,
        additions,
        deletions
      });
    }
    
    return result;
  }

  /**
   * ラベルレベルの競合解決
   * IDベースでマージし、新しい方を採用（削除情報を考慮）
   */
  resolveLabelsConflict(localLabels: MapLabel[], remoteLabels: MapLabel[], deletedLabels: DeletedItem[] = []): MapLabel[] {
    const labelMap = new Map<string, MapLabel>();
    let conflicts = 0;
    let additions = 0;
    let deletions = 0;
    
    // 削除されたラベルのIDセットを作成
    const deletedLabelIds = new Set(deletedLabels.map(d => d.id));
    
    // リモートラベルを基準にマップを構築（削除されたラベルは除外）
    remoteLabels.forEach(label => {
      if (!deletedLabelIds.has(label.id)) {
        // 既存データの互換性確保
        const normalizedLabel = this.normalizeLabel(label);
        labelMap.set(normalizedLabel.id, normalizedLabel);
      } else {
        deletions++;
      }
    });
    
    // ローカルラベルで競合解決（削除されたラベルは除外）
    localLabels.forEach(localLabel => {
      if (deletedLabelIds.has(localLabel.id)) {
        deletions++;
        return;
      }

      // 既存データの互換性確保
      const normalizedLocalLabel = this.normalizeLabel(localLabel);
      const remoteLabel = labelMap.get(normalizedLocalLabel.id);
      
      if (!remoteLabel) {
        // リモートに存在しない場合はローカルを追加
        labelMap.set(normalizedLocalLabel.id, normalizedLocalLabel);
        additions++;
      } else {
        // 更新時刻で比較し、新しい方を採用
        const resolvedLabel = this.isNewer(normalizedLocalLabel.updatedAt, remoteLabel.updatedAt)
          ? normalizedLocalLabel
          : remoteLabel;
        labelMap.set(normalizedLocalLabel.id, resolvedLabel);
        if (resolvedLabel !== remoteLabel) {
          conflicts++;
        }
      }
    });
    
    const result = Array.from(labelMap.values());
    
    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log('🔄 ラベル競合解決:', {
        localCount: localLabels.length,
        remoteCount: remoteLabels.length,
        resolvedCount: result.length,
        conflicts,
        additions,
        deletions
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