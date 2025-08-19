# 競合解決の独立化

## 現状の問題点

### 分散した競合解決ロジック

- `useRealtimePlanListener` 内に埋め込まれた複雑な競合解決
- `syncConflictResolver` サービスは存在するが、使用が限定的
- 自己更新判定ロジックが複雑で理解困難

### 具体的な問題

```typescript
// useRealtimePlanListener 内の複雑な判定ロジック
const isSelfUpdate = onSelfUpdateFlag ? onSelfUpdateFlag() : false;
let fallbackSelfUpdate = false;
if (!onSelfUpdateFlag && lastCloudSaveTimestamp) {
  const timeDiff = Math.abs(remoteTimestamp - currentCloudSaveTimestamp);
  fallbackSelfUpdate = timeDiff < 3000; // マジックナンバー
}
const finalIsSelfUpdate = isSelfUpdate || fallbackSelfUpdate;
```

### 問題のある設計

1. **タイムスタンプ依存**: 3000msなどのマジックナンバー
2. **フラグ複合判定**: 複数のフラグを組み合わせた複雑な判定
3. **デバッグ困難**: どの条件で判定されたかの追跡が困難
4. **テスト困難**: 時間依存のロジックのテストが複雑

## 目標とする設計

### 独立した競合解決システム

```
競合解決 = 変更検知 + 競合判定 + 解決戦略 + 結果適用
```

#### 責任の分離

1. **変更検知**: 誰が、いつ、何を変更したかの追跡
2. **競合判定**: 競合が発生しているかの判定
3. **解決戦略**: どのように競合を解決するかの戦略
4. **結果適用**: 解決後のデータの適用

#### 設計原則

- **決定論的**: 同じ入力に対して常に同じ結果
- **追跡可能**: すべての判定過程を記録
- **テスト可能**: 時間に依存しない設計
- **拡張可能**: 新しい解決戦略を追加しやすい

## 実装手順

### Step 1: 変更メタデータの定義

```typescript
// src/types/ConflictResolution.ts
export interface ChangeMetadata {
  timestamp: number;
  userId: string;
  sessionId: string;
  operationType: "add" | "update" | "delete";
  changeId: string;
}

export interface VersionedPlan extends TravelPlan {
  version: number;
  lastChange: ChangeMetadata;
  changeHistory: ChangeMetadata[];
}
```

### Step 2: 競合検知サービス

```typescript
// src/services/conflict/ConflictDetector.ts
export class ConflictDetector {
  detectConflicts(local: VersionedPlan, remote: VersionedPlan): ConflictInfo[] {
    // バージョン番号ベースの競合検知
    if (local.version === remote.version) {
      return []; // 競合なし
    }

    return this.analyzeChanges(local, remote);
  }

  private analyzeChanges(
    local: VersionedPlan,
    remote: VersionedPlan,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Places の競合チェック
    conflicts.push(...this.detectPlaceConflicts(local.places, remote.places));

    // Labels の競合チェック
    conflicts.push(...this.detectLabelConflicts(local.labels, remote.labels));

    return conflicts;
  }

  isSelfChange(change: ChangeMetadata, currentSession: string): boolean {
    return change.sessionId === currentSession;
  }
}
```

### Step 3: 競合解決戦略

```typescript
// src/services/conflict/ConflictResolver.ts
export class ConflictResolver {
  constructor(
    private strategy: ConflictResolutionStrategy = "last-write-wins",
  ) {}

  resolve(
    conflicts: ConflictInfo[],
    local: VersionedPlan,
    remote: VersionedPlan,
  ): VersionedPlan {
    switch (this.strategy) {
      case "last-write-wins":
        return this.resolveWithLastWriteWins(conflicts, local, remote);
      case "merge-non-conflicting":
        return this.resolveWithMerge(conflicts, local, remote);
      case "user-choice":
        return this.resolveWithUserChoice(conflicts, local, remote);
      default:
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  private resolveWithLastWriteWins(
    conflicts: ConflictInfo[],
    local: VersionedPlan,
    remote: VersionedPlan,
  ): VersionedPlan {
    // 最後の変更時刻で判定
    return remote.lastChange.timestamp > local.lastChange.timestamp
      ? remote
      : local;
  }

  private resolveWithMerge(
    conflicts: ConflictInfo[],
    local: VersionedPlan,
    remote: VersionedPlan,
  ): VersionedPlan {
    // 競合しない部分をマージ
    const resolved = { ...local };

    // 競合しないリモートの変更を適用
    conflicts.forEach((conflict) => {
      if (conflict.resolutionStrategy === "accept-remote") {
        this.applyRemoteChange(resolved, conflict, remote);
      }
    });

    return this.createNewVersion(resolved, local, remote);
  }
}
```

### Step 4: セッション管理

```typescript
// src/services/conflict/SessionManager.ts
export class SessionManager {
  private sessionId: string;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
  }

  createChangeMetadata(operationType: OperationType): ChangeMetadata {
    return {
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      operationType,
      changeId: this.generateChangeId(),
    };
  }

  private generateSessionId(): string {
    return `${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Step 5: 統合コーディネーター

```typescript
// src/services/conflict/ConflictCoordinator.ts
export class ConflictCoordinator {
  constructor(
    private detector: ConflictDetector,
    private resolver: ConflictResolver,
    private sessionManager: SessionManager,
  ) {}

  handleRemoteChange(
    local: VersionedPlan,
    remote: VersionedPlan,
  ): {
    resolved: VersionedPlan;
    hadConflicts: boolean;
    resolutionLog: ResolutionLog;
  } {
    // 自己変更かチェック
    if (
      this.detector.isSelfChange(
        remote.lastChange,
        this.sessionManager.sessionId,
      )
    ) {
      return {
        resolved: local, // 変更なし
        hadConflicts: false,
        resolutionLog: { reason: "self-change", timestamp: Date.now() },
      };
    }

    // 競合検知
    const conflicts = this.detector.detectConflicts(local, remote);

    if (conflicts.length === 0) {
      return {
        resolved: remote, // 競合なし、リモートを採用
        hadConflicts: false,
        resolutionLog: { reason: "no-conflicts", timestamp: Date.now() },
      };
    }

    // 競合解決
    const resolved = this.resolver.resolve(conflicts, local, remote);

    return {
      resolved,
      hadConflicts: true,
      resolutionLog: {
        reason: "conflicts-resolved",
        conflicts: conflicts.length,
        strategy: this.resolver.strategy,
        timestamp: Date.now(),
      },
    };
  }
}
```

### Step 6: シンプルなフック

```typescript
// src/hooks/useConflictResolution.ts
export function useConflictResolution(userId: string) {
  const coordinatorRef = useRef<ConflictCoordinator>();

  useEffect(() => {
    const sessionManager = new SessionManager(userId);
    const detector = new ConflictDetector();
    const resolver = new ConflictResolver("merge-non-conflicting");

    coordinatorRef.current = new ConflictCoordinator(
      detector,
      resolver,
      sessionManager,
    );
  }, [userId]);

  const handleRemoteChange = useCallback(
    (local: TravelPlan, remote: TravelPlan) => {
      if (!coordinatorRef.current)
        return { resolved: remote, hadConflicts: false };

      // 既存プランをVersionedPlanに変換
      const versionedLocal = this.addVersionInfo(local);
      const versionedRemote = this.addVersionInfo(remote);

      return coordinatorRef.current.handleRemoteChange(
        versionedLocal,
        versionedRemote,
      );
    },
    [],
  );

  return { handleRemoteChange };
}
```

## 移行計画

### Phase 1: 新システム構築 (2-3日)

- ConflictDetector, ConflictResolver, SessionManager の実装
- 型定義とインターフェースの作成
- 単体テストの作成

### Phase 2: 統合テスト (1-2日)

- ConflictCoordinator の実装
- useConflictResolution フックの作成
- エンドツーエンドテスト

### Phase 3: 段階的移行 (2-3日)

- useRealtimePlanListener での新システム使用
- 既存の競合解決ロジックと並行稼働
- デバッグとパフォーマンステスト

### Phase 4: クリーンアップ (1日)

- 旧競合解決ロジックの削除
- syncConflictResolver の更新または削除
- ドキュメント更新

## 期待される効果

### コードの明確化

- **決定論的な競合解決**: テストが容易
- **追跡可能な判定過程**: デバッグが簡単
- **戦略の切り替え**: 要件変更への対応が容易

### 保守性の向上

- **単一責任の各クラス**: バグの特定が簡単
- **時間非依存**: テストが安定
- **拡張性**: 新しい解決戦略の追加が容易

### パフォーマンス改善

- **効率的な競合検知**: バージョン番号ベース
- **最小限の計算**: 必要な場合のみ解決実行
- **メモリ効率**: 不要な状態の削除

## リスク分析

### 高リスク

- 既存の競合解決動作の変更
- データの整合性への影響

### 中リスク

- パフォーマンスへの影響
- 複雑な競合パターンの見落とし

### 対策

- 段階的移行による影響最小化
- 十分なテストカバレッジ
- ロールバック計画の準備

### テストシナリオ

- 同時編集での競合発生
- ネットワーク遅延による順序問題
- 大量データでの性能テスト
