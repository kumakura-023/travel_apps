import { VersionedPlan, ConflictInfo, ConflictResolutionStrategy, ChangeMetadata } from '../../types/ConflictResolution';

export class ConflictResolver {
  constructor(
    private strategy: ConflictResolutionStrategy = 'last-write-wins'
  ) {}

  resolve(conflicts: ConflictInfo[], local: VersionedPlan, remote: VersionedPlan): VersionedPlan {
    console.log(`[ConflictResolver] Resolving ${conflicts.length} conflicts with strategy: ${this.strategy}`);
    
    switch (this.strategy) {
      case 'last-write-wins':
        return this.resolveWithLastWriteWins(conflicts, local, remote);
      case 'merge-non-conflicting':
        return this.resolveWithMerge(conflicts, local, remote);
      case 'user-choice':
        return this.resolveWithUserChoice(conflicts, local, remote);
      default:
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  private resolveWithLastWriteWins(
    conflicts: ConflictInfo[], 
    local: VersionedPlan, 
    remote: VersionedPlan
  ): VersionedPlan {
    // 最後の変更時刻で判定
    const shouldUseRemote = remote.lastChange.timestamp > local.lastChange.timestamp;
    const winner = shouldUseRemote ? remote : local;
    
    console.log(`[ConflictResolver] Last-write-wins: Using ${shouldUseRemote ? 'remote' : 'local'} (${winner.lastChange.timestamp})`);
    
    return this.createNewVersion(winner, local, remote);
  }

  private resolveWithMerge(
    conflicts: ConflictInfo[], 
    local: VersionedPlan, 
    remote: VersionedPlan
  ): VersionedPlan {
    console.log(`[ConflictResolver] Merging conflicts...`);
    
    // ローカルをベースとして開始
    const resolved: VersionedPlan = { ...local };

    // 競合を分析して自動マージ可能かどうか判定
    for (const conflict of conflicts) {
      this.applyConflictResolution(resolved, conflict, remote);
    }

    // リモートの新しい要素（追加された場所/ラベル）を統合
    this.mergeNewItems(resolved, local, remote);

    return this.createNewVersion(resolved, local, remote);
  }

  private resolveWithUserChoice(
    conflicts: ConflictInfo[], 
    local: VersionedPlan, 
    remote: VersionedPlan
  ): VersionedPlan {
    // 実際の実装では、ユーザーインターフェースで選択を促す
    // ここでは簡易的に重要度ベースの自動選択を行う
    console.log(`[ConflictResolver] Auto-resolving user choices based on severity...`);
    
    const resolved: VersionedPlan = { ...local };

    for (const conflict of conflicts) {
      // 重要度の高い競合はリモートを優先
      if (conflict.severity === 'high') {
        this.applyRemoteChange(resolved, conflict, remote);
      } else if (conflict.severity === 'medium') {
        // 中程度の競合は新しい方を優先
        if (conflict.remoteChange.timestamp > conflict.localChange.timestamp) {
          this.applyRemoteChange(resolved, conflict, remote);
        }
      }
      // 低重要度の競合はローカルを維持
    }

    return this.createNewVersion(resolved, local, remote);
  }

  private applyConflictResolution(resolved: VersionedPlan, conflict: ConflictInfo, remote: VersionedPlan): void {
    // 自動解決可能な競合のロジック
    switch (conflict.type) {
      case 'metadata':
        this.resolveMetadataConflict(resolved, conflict, remote);
        break;
      case 'place':
        this.resolvePlaceConflict(resolved, conflict, remote);
        break;
      case 'label':
        this.resolveLabelConflict(resolved, conflict, remote);
        break;
    }
  }

  private resolveMetadataConflict(resolved: VersionedPlan, conflict: ConflictInfo, remote: VersionedPlan): void {
    // メタデータの競合解決
    if (conflict.field === 'name' || conflict.field === 'description') {
      // 長い方の説明を採用（より詳細な情報を優先）
      if (String(conflict.remoteValue || '').length > String(conflict.localValue || '').length) {
        (resolved as any)[conflict.field] = conflict.remoteValue;
      }
    } else if (conflict.field === 'startDate' || conflict.field === 'endDate') {
      // 日付の競合は新しい変更を優先
      if (conflict.remoteChange.timestamp > conflict.localChange.timestamp) {
        (resolved as any)[conflict.field] = conflict.remoteValue;
      }
    }
  }

  private resolvePlaceConflict(resolved: VersionedPlan, conflict: ConflictInfo, remote: VersionedPlan): void {
    if (conflict.field === 'existence') {
      // 存在・削除の競合
      if (conflict.remoteValue && !conflict.localValue) {
        // リモートで新しく追加された場所を追加
        if (!resolved.places) resolved.places = [];
        resolved.places.push(conflict.remoteValue);
      } else if (!conflict.remoteValue && conflict.localValue) {
        // リモートで削除された場所をローカルからも削除
        if (resolved.places) {
          resolved.places = resolved.places.filter(p => p.id !== conflict.itemId);
        }
      }
    } else {
      // フィールドの競合
      this.updatePlaceField(resolved, conflict);
    }
  }

  private resolveLabelConflict(resolved: VersionedPlan, conflict: ConflictInfo, remote: VersionedPlan): void {
    if (conflict.field === 'existence') {
      // 存在・削除の競合
      if (conflict.remoteValue && !conflict.localValue) {
        // リモートで新しく追加されたラベルを追加
        if (!resolved.labels) resolved.labels = [];
        resolved.labels.push(conflict.remoteValue);
      } else if (!conflict.remoteValue && conflict.localValue) {
        // リモートで削除されたラベルをローカルからも削除
        if (resolved.labels) {
          resolved.labels = resolved.labels.filter(l => l.id !== conflict.itemId);
        }
      }
    } else {
      // フィールドの競合
      this.updateLabelField(resolved, conflict);
    }
  }

  private updatePlaceField(resolved: VersionedPlan, conflict: ConflictInfo): void {
    if (!resolved.places) return;
    
    const placeIndex = resolved.places.findIndex(p => p.id === conflict.itemId);
    if (placeIndex >= 0) {
      // より新しい変更を採用
      if (conflict.remoteChange.timestamp > conflict.localChange.timestamp) {
        (resolved.places[placeIndex] as any)[conflict.field] = conflict.remoteValue;
      }
    }
  }

  private updateLabelField(resolved: VersionedPlan, conflict: ConflictInfo): void {
    if (!resolved.labels) return;
    
    const labelIndex = resolved.labels.findIndex(l => l.id === conflict.itemId);
    if (labelIndex >= 0) {
      // より新しい変更を採用
      if (conflict.remoteChange.timestamp > conflict.localChange.timestamp) {
        (resolved.labels[labelIndex] as any)[conflict.field] = conflict.remoteValue;
      }
    }
  }

  private applyRemoteChange(resolved: VersionedPlan, conflict: ConflictInfo, remote: VersionedPlan): void {
    switch (conflict.type) {
      case 'metadata':
        (resolved as any)[conflict.field] = conflict.remoteValue;
        break;
      case 'place':
        this.updatePlaceField(resolved, conflict);
        break;
      case 'label':
        this.updateLabelField(resolved, conflict);
        break;
    }
  }

  private mergeNewItems(resolved: VersionedPlan, local: VersionedPlan, remote: VersionedPlan): void {
    // リモートの新しい場所を追加
    const localPlaceIds = new Set((local.places || []).map(p => p.id));
    const newRemotePlaces = (remote.places || []).filter(p => !localPlaceIds.has(p.id));
    
    if (newRemotePlaces.length > 0) {
      if (!resolved.places) resolved.places = [];
      resolved.places.push(...newRemotePlaces);
      console.log(`[ConflictResolver] Added ${newRemotePlaces.length} new places from remote`);
    }

    // リモートの新しいラベルを追加
    const localLabelIds = new Set((local.labels || []).map(l => l.id));
    const newRemoteLabels = (remote.labels || []).filter(l => !localLabelIds.has(l.id));
    
    if (newRemoteLabels.length > 0) {
      if (!resolved.labels) resolved.labels = [];
      resolved.labels.push(...newRemoteLabels);
      console.log(`[ConflictResolver] Added ${newRemoteLabels.length} new labels from remote`);
    }
  }

  private createNewVersion(resolved: VersionedPlan, local: VersionedPlan, remote: VersionedPlan): VersionedPlan {
    const newVersion = Math.max(local.version, remote.version) + 1;
    const newChange: ChangeMetadata = {
      timestamp: Date.now(),
      userId: local.lastChange.userId, // 現在のユーザー
      sessionId: local.lastChange.sessionId,
      operationType: 'update',
      changeId: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return {
      ...resolved,
      version: newVersion,
      lastChange: newChange,
      changeHistory: [
        ...(local.changeHistory || []),
        ...(remote.changeHistory || []).filter(
          h => !(local.changeHistory || []).some(lh => lh.changeId === h.changeId)
        ),
        newChange
      ],
      updatedAt: new Date()
    };
  }

  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  getStrategy(): ConflictResolutionStrategy {
    return this.strategy;
  }
}