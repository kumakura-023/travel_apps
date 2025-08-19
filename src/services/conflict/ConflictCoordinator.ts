import { TravelPlan } from "../../types";
import {
  VersionedPlan,
  ConflictResolutionResult,
  ResolutionLog,
  ChangeMetadata,
} from "../../types/ConflictResolution";
import { ConflictDetector } from "./ConflictDetector";
import { ConflictResolver } from "./ConflictResolver";
import { SessionManager } from "./SessionManager";

export class ConflictCoordinator {
  constructor(
    private detector: ConflictDetector,
    private resolver: ConflictResolver,
    private sessionManager: SessionManager,
  ) {}

  handleRemoteChange(
    local: VersionedPlan,
    remote: VersionedPlan,
  ): ConflictResolutionResult {
    console.log(
      `[ConflictCoordinator] Handling remote change: local v${local.version}, remote v${remote.version}`,
    );

    // 自己変更かチェック
    if (
      this.detector.isSelfChange(
        remote.lastChange,
        this.sessionManager.getCurrentSessionId(),
      )
    ) {
      return {
        resolved: local, // 変更なし
        hadConflicts: false,
        resolutionLog: {
          reason: "self-change",
          timestamp: Date.now(),
          details: `Change from own session: ${remote.lastChange.changeId}`,
        },
        appliedChanges: [],
      };
    }

    // 競合検知
    const conflicts = this.detector.detectConflicts(local, remote);

    if (conflicts.length === 0) {
      console.log(
        `[ConflictCoordinator] No conflicts detected, accepting remote changes`,
      );
      return {
        resolved: remote, // 競合なし、リモートを採用
        hadConflicts: false,
        resolutionLog: {
          reason: "no-conflicts",
          timestamp: Date.now(),
          details: `Clean merge: remote v${remote.version} accepted`,
        },
        appliedChanges: [remote.lastChange],
      };
    }

    // 競合解決
    console.log(
      `[ConflictCoordinator] Resolving ${conflicts.length} conflicts...`,
    );
    const resolved = this.resolver.resolve(conflicts, local, remote);

    // 競合の詳細をログに記録
    const conflictItems = conflicts.map(
      (c) => `${c.type}:${c.itemId}:${c.field}`,
    );
    const highSeverityCount = conflicts.filter(
      (c) => c.severity === "high",
    ).length;
    const mediumSeverityCount = conflicts.filter(
      (c) => c.severity === "medium",
    ).length;
    const lowSeverityCount = conflicts.filter(
      (c) => c.severity === "low",
    ).length;

    return {
      resolved,
      hadConflicts: true,
      resolutionLog: {
        reason: "conflicts-resolved",
        conflicts: conflicts.length,
        strategy: this.resolver.getStrategy(),
        timestamp: Date.now(),
        details: `Conflicts: ${highSeverityCount}H/${mediumSeverityCount}M/${lowSeverityCount}L`,
        conflictItems,
      },
      appliedChanges: [resolved.lastChange],
    };
  }

  /**
   * 通常のTravelPlanをVersionedPlanに変換
   */
  convertToVersionedPlan(plan: TravelPlan, sessionId?: string): VersionedPlan {
    const currentSessionId =
      sessionId || this.sessionManager.getCurrentSessionId();

    return {
      ...plan,
      version: 1, // 新規作成時は常に1
      lastChange: {
        timestamp: plan.updatedAt.getTime(),
        userId: this.sessionManager.getUserId(),
        sessionId: currentSessionId,
        operationType: "update",
        changeId: `convert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      changeHistory: [],
    };
  }

  /**
   * VersionedPlanを通常のTravelPlanに変換
   */
  convertToTravelPlan(versionedPlan: VersionedPlan): TravelPlan {
    const { version, lastChange, changeHistory, ...travelPlan } = versionedPlan;
    return travelPlan;
  }

  /**
   * プランにバージョン情報を追加（既存プランの更新時）
   */
  addVersionInfo(plan: TravelPlan, currentVersion: number = 0): VersionedPlan {
    const changeMetadata = this.sessionManager.createChangeMetadata("update");

    return {
      ...plan,
      version: currentVersion + 1,
      lastChange: changeMetadata,
      changeHistory: [], // 実際の実装では既存の履歴を引き継ぐ
    };
  }

  /**
   * 競合解決の統計情報を取得
   */
  getConflictStats(conflicts: any[]) {
    return {
      total: conflicts.length,
      byType: {
        metadata: conflicts.filter((c) => c.type === "metadata").length,
        place: conflicts.filter((c) => c.type === "place").length,
        label: conflicts.filter((c) => c.type === "label").length,
      },
      bySeverity: {
        high: conflicts.filter((c) => c.severity === "high").length,
        medium: conflicts.filter((c) => c.severity === "medium").length,
        low: conflicts.filter((c) => c.severity === "low").length,
      },
    };
  }

  /**
   * セッション情報を取得（デバッグ用）
   */
  getSessionInfo() {
    return this.sessionManager.getSessionInfo();
  }

  /**
   * 解決戦略を変更
   */
  setResolutionStrategy(
    strategy: "last-write-wins" | "merge-non-conflicting" | "user-choice",
  ) {
    this.resolver.setStrategy(strategy);
  }

  /**
   * セッションの更新
   */
  refreshSession() {
    this.sessionManager.refreshSession();
  }
}
