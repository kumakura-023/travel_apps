import { TravelPlan, Place, MapLabel } from '../types';

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
   * @returns 解決された地点リスト
   */
  resolvePlacesConflict(localPlaces: Place[], remotePlaces: Place[]): Place[];

  /**
   * ラベルレベルの競合解決
   * @param localLabels ローカルラベルリスト
   * @param remoteLabels リモートラベルリスト
   * @returns 解決されたラベルリスト
   */
  resolveLabelsConflict(localLabels: MapLabel[], remoteLabels: MapLabel[]): MapLabel[];
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
    console.log('🔄 競合解決開始:', {
      localPlaces: localPlan.places.length,
      remotePlaces: remotePlan.places.length,
      localLabels: localPlan.labels.length,
      remoteLabels: remotePlan.labels.length,
      localTimestamp: localTimestamp.toISOString(),
      remoteTimestamp: remoteTimestamp.toISOString()
    });

    // プランレベルの基本情報は新しい方を採用
    const basePlan = this.isNewer(localTimestamp, remoteTimestamp) ? localPlan : remotePlan;
    
    // 地点とラベルは個別に競合解決
    const resolvedPlaces = this.resolvePlacesConflict(localPlan.places, remotePlan.places);
    const resolvedLabels = this.resolveLabelsConflict(localPlan.labels, remotePlan.labels);
    
    // 解決されたプランを構築
    const resolvedPlan: TravelPlan = {
      ...basePlan,
      places: resolvedPlaces,
      labels: resolvedLabels,
      totalCost: resolvedPlaces.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      updatedAt: new Date(), // 競合解決時刻
    };

    console.log('🔄 競合解決完了:', {
      originalLocalPlaces: localPlan.places.length,
      originalRemotePlaces: remotePlan.places.length,
      resolvedPlaces: resolvedPlaces.length,
      originalLocalLabels: localPlan.labels.length,
      originalRemoteLabels: remotePlan.labels.length,
      resolvedLabels: resolvedLabels.length,
      changes: {
        placesAdded: resolvedPlaces.length - Math.max(localPlan.places.length, remotePlan.places.length),
        labelsAdded: resolvedLabels.length - Math.max(localPlan.labels.length, remotePlan.labels.length)
      }
    });

    return resolvedPlan;
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
   * IDベースでマージし、新しい方を採用
   */
  resolvePlacesConflict(localPlaces: Place[], remotePlaces: Place[]): Place[] {
    const placeMap = new Map<string, Place>();
    let conflicts = 0;
    let additions = 0;
    
    // リモート地点を基準にマップを構築
    remotePlaces.forEach(place => {
      placeMap.set(place.id, place);
    });
    
    // ローカル地点で競合解決
    localPlaces.forEach(localPlace => {
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
    
    console.log('🔄 地点競合解決:', {
      localCount: localPlaces.length,
      remoteCount: remotePlaces.length,
      resolvedCount: result.length,
      conflicts,
      additions
    });
    
    return result;
  }

  /**
   * ラベルレベルの競合解決
   * IDベースでマージし、新しい方を採用
   */
  resolveLabelsConflict(localLabels: MapLabel[], remoteLabels: MapLabel[]): MapLabel[] {
    const labelMap = new Map<string, MapLabel>();
    let conflicts = 0;
    let additions = 0;
    
    // リモートラベルを基準にマップを構築
    remoteLabels.forEach(label => {
      // 既存データの互換性確保
      const normalizedLabel = this.normalizeLabel(label);
      labelMap.set(normalizedLabel.id, normalizedLabel);
    });
    
    // ローカルラベルで競合解決
    localLabels.forEach(localLabel => {
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
    
    console.log('🔄 ラベル競合解決:', {
      localCount: localLabels.length,
      remoteCount: remoteLabels.length,
      resolvedCount: result.length,
      conflicts,
      additions
    });
    
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