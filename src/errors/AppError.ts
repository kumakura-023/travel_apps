/**
 * Phase 3: 統一エラークラス
 * Phase 3のエラーハンドリング規約に準拠
 */

export type ErrorSeverity = "debug" | "info" | "warning" | "error" | "fatal";

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

export interface ErrorDTO {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: string;
}

/**
 * アプリケーション全体で使用する統一エラークラス
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  declare public cause?: Error;

  constructor(
    code: string,
    message: string,
    severity: ErrorSeverity,
    context?: ErrorContext,
    cause?: Error,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();

    // 元のエラーがある場合は原因として保持
    if (cause) {
      this.cause = cause;
    }

    // スタックトレースを正しく設定
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * エラーがリカバリー可能かどうか
   */
  get isRecoverable(): boolean {
    return this.severity !== "fatal";
  }

  /**
   * ユーザーに通知すべきかどうか
   */
  get shouldNotifyUser(): boolean {
    return this.severity !== "debug" && this.severity !== "info";
  }

  /**
   * JSON形式に変換
   */
  toJSON(): ErrorDTO {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * 標準エラーからAppErrorを作成
   */
  static fromError(
    error: Error | unknown,
    code: string,
    severity: ErrorSeverity = "error",
    context?: ErrorContext,
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;

    return new AppError(code, message, severity, context, cause);
  }
}

/**
 * AppError かどうかを判定する型ガード
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * エラーを AppError に変換するユーティリティ
 * 既に AppError の場合はそのまま返す
 */
export function toAppError(
  error: unknown,
  fallbackCode: string,
  fallbackSeverity: ErrorSeverity = "error",
  context?: ErrorContext,
): AppError {
  if (isAppError(error)) {
    return error;
  }
  return AppError.fromError(error, fallbackCode, fallbackSeverity, context);
}
