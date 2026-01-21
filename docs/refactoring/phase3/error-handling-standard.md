# Phase 3 設計メモ: エラーハンドリング規約

## 1. 背景と目的

### 背景

Phase 0-2 でサービス境界とインターフェースが整理されたが、エラーハンドリングについては以下の課題が残存している：

1. **エラー型の不統一**: 各サービスが独自の Error クラスや文字列メッセージを使用しており、エラーの分類・追跡が困難。
2. **エラー伝播の不明確さ**: Service → Coordinator → UI 間でエラーがどう変換・伝播されるかのルールがない。
3. **ユーザー向けメッセージの散在**: エラーメッセージが各コンポーネントに分散しており、一貫性がない。
4. **リカバリー戦略の欠如**: エラー発生時のリトライ・フォールバック・ユーザー通知の方針が未定義。

### 目的

- `AppError` / `ErrorCode` による統一エラー型を導入し、全サービスに適用する。
- エラーの分類・重大度・リカバリー可能性を体系化する。
- ユーザー向けエラー表示のガイドラインを策定する。
- Phase 4 の監視・アラート設計の基盤を整備する。

## 2. 対象スコープ

| サービス                 | 現状                                   | Phase 3 での変更                        |
| ------------------------ | -------------------------------------- | --------------------------------------- |
| `UnifiedPlanService`     | 独自 Error + console.error             | `AppError` 変換、`PlanErrorCode` 使用   |
| `PlanCoordinator`        | try-catch で Error を setErrorState    | `AppError` 型ガード、ErrorBoundary 連携 |
| `SyncManager`            | Promise rejection + ログ               | `SyncErrorCode`、リトライ戦略適用       |
| `MapInteractionService`  | Google Maps API エラーをそのまま throw | `MapErrorCode` 変換、フォールバック処理 |
| `PlaceManagementService` | 文字列エラー                           | `PlaceErrorCode` 使用                   |

## 3. エラー型定義

### 3.1 AppError クラス

```typescript
// src/errors/AppError.ts

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly severity: ErrorSeverity,
    public readonly context?: ErrorContext,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AppError";
  }

  get isRecoverable(): boolean {
    return this.severity !== "fatal";
  }

  get shouldNotifyUser(): boolean {
    return this.severity !== "debug" && this.severity !== "info";
  }

  toJSON(): ErrorDTO {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 3.2 ErrorCode 定義

```typescript
// src/errors/ErrorCode.ts

// ドメイン別プレフィックス
export type ErrorCode =
  | PlanErrorCode
  | PlaceErrorCode
  | RouteErrorCode
  | SyncErrorCode
  | MapErrorCode
  | AuthErrorCode
  | NetworkErrorCode;

// Plan ドメイン (P1xxx)
export enum PlanErrorCode {
  PLAN_NOT_FOUND = "P1001",
  PLAN_LOAD_FAILED = "P1002",
  PLAN_SAVE_FAILED = "P1003",
  PLAN_DELETE_FAILED = "P1004",
  PLAN_SWITCH_FAILED = "P1005",
  PLAN_PERMISSION_DENIED = "P1006",
  PLAN_QUOTA_EXCEEDED = "P1007",
  PLAN_VALIDATION_FAILED = "P1008",
}

// Place ドメイン (P2xxx)
export enum PlaceErrorCode {
  PLACE_NOT_FOUND = "P2001",
  PLACE_ADD_FAILED = "P2002",
  PLACE_UPDATE_FAILED = "P2003",
  PLACE_DELETE_FAILED = "P2004",
  PLACE_DUPLICATE = "P2005",
  PLACE_LIMIT_EXCEEDED = "P2006",
  PLACE_INVALID_COORDINATES = "P2007",
}

// Route ドメイン (R1xxx)
export enum RouteErrorCode {
  ROUTE_CALCULATION_FAILED = "R1001",
  ROUTE_NO_RESULT = "R1002",
  ROUTE_QUOTA_EXCEEDED = "R1003",
  ROUTE_INVALID_REQUEST = "R1004",
  ROUTE_ZERO_RESULTS = "R1005",
}

// Sync ドメイン (S1xxx)
export enum SyncErrorCode {
  SYNC_CONNECTION_LOST = "S1001",
  SYNC_CONFLICT = "S1002",
  SYNC_TIMEOUT = "S1003",
  SYNC_VERSION_MISMATCH = "S1004",
  SYNC_PERMISSION_DENIED = "S1005",
  SYNC_QUOTA_EXCEEDED = "S1006",
}

// Map ドメイン (M1xxx)
export enum MapErrorCode {
  MAP_LOAD_FAILED = "M1001",
  MAP_API_ERROR = "M1002",
  MAP_GEOCODE_FAILED = "M1003",
  MAP_OVERLAY_RENDER_FAILED = "M1004",
  MAP_INTERACTION_BLOCKED = "M1005",
}

// Auth ドメイン (A1xxx)
export enum AuthErrorCode {
  AUTH_UNAUTHENTICATED = "A1001",
  AUTH_SESSION_EXPIRED = "A1002",
  AUTH_PERMISSION_DENIED = "A1003",
}

// Network (N1xxx)
export enum NetworkErrorCode {
  NETWORK_OFFLINE = "N1001",
  NETWORK_TIMEOUT = "N1002",
  NETWORK_SERVER_ERROR = "N1003",
  NETWORK_RATE_LIMITED = "N1004",
}
```

### 3.3 ErrorSeverity

```typescript
// src/errors/ErrorSeverity.ts

export type ErrorSeverity =
  | "debug" // 開発者向け情報
  | "info" // 情報レベル（ユーザー通知不要）
  | "warning" // 警告（操作継続可能）
  | "error" // エラー（操作失敗、リカバリー可能）
  | "fatal"; // 致命的（アプリ再起動が必要）
```

### 3.4 ErrorContext

```typescript
// src/errors/ErrorContext.ts

export interface ErrorContext {
  // 発生コンテキスト
  service: string;
  operation: string;
  entityId?: string;
  entityType?: "plan" | "place" | "route" | "label";

  // ユーザー情報（個人情報除外）
  userId?: string;
  sessionId?: string;

  // 追加データ
  metadata?: Record<string, unknown>;

  // リトライ情報
  retryCount?: number;
  maxRetries?: number;
}
```

## 4. サービス別適用方針

### 4.1 UnifiedPlanService

```typescript
// Before
async load(planId: string): Promise<PlanSnapshot> {
  try {
    const doc = await this.repository.get(planId);
    if (!doc) throw new Error('Plan not found');
    return doc;
  } catch (error) {
    console.error('Failed to load plan:', error);
    throw error;
  }
}

// After
async load(planId: string): Promise<PlanSnapshot> {
  try {
    const doc = await this.repository.get(planId);
    if (!doc) {
      throw new AppError(
        PlanErrorCode.PLAN_NOT_FOUND,
        `Plan with ID ${planId} was not found`,
        'error',
        { service: 'UnifiedPlanService', operation: 'load', entityId: planId }
      );
    }
    return doc;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      PlanErrorCode.PLAN_LOAD_FAILED,
      'Failed to load plan',
      'error',
      { service: 'UnifiedPlanService', operation: 'load', entityId: planId },
      error as Error
    );
  }
}
```

### 4.2 SyncManager - リトライ戦略

```typescript
// src/services/SyncManager.ts

const RETRY_CONFIG: Record<SyncErrorCode, RetryPolicy> = {
  [SyncErrorCode.SYNC_CONNECTION_LOST]: {
    maxRetries: 5,
    backoffMs: [1000, 2000, 4000, 8000, 16000],
    shouldRetry: true,
  },
  [SyncErrorCode.SYNC_TIMEOUT]: {
    maxRetries: 3,
    backoffMs: [2000, 4000, 8000],
    shouldRetry: true,
  },
  [SyncErrorCode.SYNC_CONFLICT]: {
    maxRetries: 0,
    shouldRetry: false,
    fallback: "showConflictResolver",
  },
  [SyncErrorCode.SYNC_PERMISSION_DENIED]: {
    maxRetries: 0,
    shouldRetry: false,
    fallback: "showAuthPrompt",
  },
};
```

### 4.3 MapInteractionService - API エラー変換

```typescript
// Google Maps API エラーを AppError に変換
function convertGoogleMapsError(
  status: google.maps.DirectionsStatus,
): AppError {
  const errorMap: Record<string, { code: RouteErrorCode; message: string }> = {
    ZERO_RESULTS: {
      code: RouteErrorCode.ROUTE_ZERO_RESULTS,
      message: "指定された経路が見つかりませんでした",
    },
    OVER_QUERY_LIMIT: {
      code: RouteErrorCode.ROUTE_QUOTA_EXCEEDED,
      message: "API 利用制限に達しました。しばらくしてから再試行してください",
    },
    REQUEST_DENIED: {
      code: RouteErrorCode.ROUTE_INVALID_REQUEST,
      message: "ルート検索リクエストが拒否されました",
    },
    // ...
  };

  const info = errorMap[status] || {
    code: RouteErrorCode.ROUTE_CALCULATION_FAILED,
    message: "ルート計算に失敗しました",
  };

  return new AppError(info.code, info.message, "error", {
    service: "MapInteractionService",
    operation: "calculateRoute",
    metadata: { googleStatus: status },
  });
}
```

## 5. ユーザー向けエラー表示ガイドライン

### 5.1 表示レベル別ガイド

| Severity  | 表示方法                         | 表示時間     | アクション         |
| --------- | -------------------------------- | ------------ | ------------------ |
| `debug`   | 表示しない（コンソールログのみ） | -            | -                  |
| `info`    | 控えめなトースト（青）           | 3秒          | 自動消去           |
| `warning` | 警告トースト（黄）               | 5秒          | 手動消去可         |
| `error`   | エラートースト（赤）             | 手動消去まで | リトライボタン表示 |
| `fatal`   | フルスクリーンモーダル           | 手動消去不可 | 再読み込みボタン   |

### 5.2 エラーメッセージ規約

**DO**:

- ユーザーが理解できる平易な日本語を使用
- 何が起きたか + 次に何をすべきかを含める
- 技術用語を避ける

**DON'T**:

- スタックトレースやエラーコードをそのまま表示
- 責任の所在を曖昧にする表現（「問題が発生しました」）
- ユーザーを責める表現

**例**:

```
❌ "Error: P1002 - PLAN_LOAD_FAILED"
❌ "エラーが発生しました"
❌ "あなたの操作に問題があります"

✅ "プランの読み込みに失敗しました。ネットワーク接続を確認し、再度お試しください。"
✅ "保存できませんでした。編集内容は自動的にバックアップされています。接続が復旧したら再度保存してください。"
```

### 5.3 ErrorCode → メッセージマッピング

```typescript
// src/errors/ErrorMessages.ts

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Plan
  [PlanErrorCode.PLAN_NOT_FOUND]:
    "プランが見つかりませんでした。削除された可能性があります。",
  [PlanErrorCode.PLAN_LOAD_FAILED]:
    "プランの読み込みに失敗しました。ネットワーク接続を確認してください。",
  [PlanErrorCode.PLAN_SAVE_FAILED]:
    "保存に失敗しました。しばらく経ってから再度お試しください。",
  [PlanErrorCode.PLAN_PERMISSION_DENIED]:
    "このプランにアクセスする権限がありません。",

  // Place
  [PlaceErrorCode.PLACE_LIMIT_EXCEEDED]:
    "プランに追加できる場所の上限に達しました。",
  [PlaceErrorCode.PLACE_INVALID_COORDINATES]:
    "無効な位置情報です。地図上の別の場所を選択してください。",

  // Route
  [RouteErrorCode.ROUTE_ZERO_RESULTS]:
    "経路が見つかりませんでした。出発地または目的地を変更してください。",
  [RouteErrorCode.ROUTE_QUOTA_EXCEEDED]:
    "ルート検索の利用制限に達しました。しばらく経ってから再度お試しください。",

  // Sync
  [SyncErrorCode.SYNC_CONNECTION_LOST]:
    "接続が切断されました。自動的に再接続を試みています。",
  [SyncErrorCode.SYNC_CONFLICT]:
    "他のユーザーによる変更と競合しました。最新の状態を確認してください。",

  // Network
  [NetworkErrorCode.NETWORK_OFFLINE]:
    "インターネットに接続されていません。接続を確認してください。",
};
```

## 6. エラー処理フロー

### 6.1 レイヤー別責務

```
[Service Layer]
├── ビジネスロジックエラーを AppError でラップ
├── cause に元エラーを保持
└── context にサービス情報を付与

[Coordinator Layer]
├── AppError を型ガードで識別
├── リカバリー可能な場合はリトライ/フォールバック実行
├── リカバリー不可の場合は上位へ伝播
└── EventBus へエラーイベント発火

[UI Layer]
├── ErrorBoundary で未捕捉エラーをキャッチ
├── AppError.shouldNotifyUser に基づき表示判断
├── ERROR_MESSAGES からユーザー向けメッセージ取得
└── リトライボタン等のアクション提供
```

### 6.2 ErrorBoundary 実装

```typescript
// src/components/ErrorBoundary.tsx

interface ErrorBoundaryState {
  error: AppError | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = error instanceof AppError
      ? error
      : new AppError(
          NetworkErrorCode.NETWORK_SERVER_ERROR,
          'An unexpected error occurred',
          'fatal',
          { service: 'ErrorBoundary', operation: 'catch' },
          error
        );
    return { error: appError, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Telemetry へ送信
    this.props.telemetryService.reportError(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      if (this.state.error.severity === 'fatal') {
        return <FatalErrorScreen error={this.state.error} />;
      }
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

## 7. 監視・アラート連携

### 7.1 エラーメトリクス

| メトリクス               | 説明                 | アラート閾値               |
| ------------------------ | -------------------- | -------------------------- |
| `error_count_by_code`    | ErrorCode 別エラー数 | 5分間で10件以上            |
| `error_rate_by_severity` | Severity 別エラー率  | fatal: 0.1%超、error: 1%超 |
| `retry_exhausted_count`  | リトライ上限到達数   | 5分間で5件以上             |
| `recovery_success_rate`  | リカバリー成功率     | 90%未満                    |

### 7.2 ログフォーマット

```json
{
  "level": "error",
  "code": "P1002",
  "message": "Failed to load plan",
  "severity": "error",
  "context": {
    "service": "UnifiedPlanService",
    "operation": "load",
    "entityId": "plan-123",
    "userId": "user-456",
    "retryCount": 2,
    "maxRetries": 3
  },
  "cause": {
    "name": "FirebaseError",
    "message": "permission-denied"
  },
  "timestamp": "2026-01-21T10:30:00Z",
  "traceId": "abc-123-def"
}
```

## 8. タスク一覧

| ID     | タスク                     | 内容                             | 成果物                                 | 担当         | 期限   |
| ------ | -------------------------- | -------------------------------- | -------------------------------------- | ------------ | ------ |
| P3-H1  | AppError クラス実装        | 基本エラー型定義                 | `src/errors/AppError.ts`               | Architect    | Week 1 |
| P3-H2  | ErrorCode 定義             | 全ドメインのエラーコード         | `src/errors/ErrorCode.ts`              | Architect    | Week 1 |
| P3-H3  | ErrorMessages 定義         | ユーザー向けメッセージマッピング | `src/errors/ErrorMessages.ts`          | FE Lead      | Week 1 |
| P3-H4  | UnifiedPlanService 適用    | AppError への移行                | 既存ファイル改修                       | FE Lead      | Week 2 |
| P3-H5  | SyncManager 適用           | リトライ戦略実装                 | 既存ファイル改修                       | Backend Lead | Week 2 |
| P3-H6  | MapInteractionService 適用 | API エラー変換                   | 既存ファイル改修                       | FE Lead      | Week 2 |
| P3-H7  | ErrorBoundary 実装         | UI エラーハンドリング            | `src/components/ErrorBoundary.tsx`     | FE Lead      | Week 3 |
| P3-H8  | エラー表示コンポーネント   | トースト/モーダル実装            | `src/components/ErrorNotification.tsx` | FE Lead      | Week 3 |
| P3-H9  | Telemetry 連携             | エラーログ/メトリクス送信        | Telemetry adapter 拡張                 | SRE          | Week 3 |
| P3-H10 | ドキュメント整備           | エラーハンドリングガイド         | `docs/guides/error-handling.md`        | Tech Writer  | Week 4 |

## 9. リスクと緩和策

| リスク                           | 影響                      | 緩和策                                |
| -------------------------------- | ------------------------- | ------------------------------------- |
| ErrorCode の粒度が不適切         | 過剰/過少な分類で運用困難 | 初期は粗い粒度で開始し、運用で調整    |
| メッセージ翻訳が未対応           | 多言語展開時の手戻り      | i18n キーで管理、現時点は日本語のみ   |
| リトライ過多で負荷増大           | サーバー/API への負荷     | 指数バックオフ + 最大リトライ数制限   |
| cause チェーンが深くなりログ肥大 | ストレージコスト増        | cause は最大2階層まで、それ以上は要約 |

## 10. Review Checklist

- [ ] 全ドメインの ErrorCode が網羅されているか
- [ ] Severity の基準が明確で一貫しているか
- [ ] ユーザー向けメッセージが適切か（技術用語排除、アクション明示）
- [ ] リトライ戦略がサービス/エラー種別ごとに定義されているか
- [ ] 監視・アラートとの連携が Phase 4 要件を満たすか
- [ ] 後方互換性（既存 try-catch との共存）が確保されているか

**Approvers**: Architect, FE Lead, SRE, PM

**Due Date**: 2026-02-27

---

更新履歴

- 2026-01-21: 初版作成
