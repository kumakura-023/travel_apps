import {
  ErrorCode,
  ErrorSeverity,
  getErrorSeverity,
  getErrorMessage,
} from "./ErrorCodes";

/**
 * アプリケーション全体で使用する統一エラークラス
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly details?: any;
  public readonly retry?: () => Promise<void>;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  declare public cause?: Error;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: any;
      retry?: () => Promise<void>;
      context?: Record<string, any>;
      cause?: Error;
    },
  ) {
    // メッセージが指定されていない場合はエラーコードから取得
    const errorMessage = message || getErrorMessage(code);
    super(errorMessage);

    this.name = "AppError";
    this.code = code;
    this.severity = getErrorSeverity(code);
    this.details = options?.details;
    this.retry = options?.retry;
    this.context = options?.context;
    this.timestamp = new Date();

    // 元のエラーがある場合は原因として保持
    if (options?.cause) {
      (this as any).cause = options.cause;
    }

    // スタックトレースを正しく設定
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * エラーが再試行可能かどうか
   */
  get isRetryable(): boolean {
    return !!this.retry;
  }

  /**
   * エラーの詳細情報を含むオブジェクトを返す
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      details: this.details,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }

  /**
   * ユーザーに表示するメッセージを取得
   */
  getUserMessage(): string {
    // 重要度に応じてメッセージを調整
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
        return `重大なエラー: ${this.message}`;
      case ErrorSeverity.ERROR:
        return this.message;
      case ErrorSeverity.WARNING:
        return `警告: ${this.message}`;
      case ErrorSeverity.INFO:
        return this.message;
      default:
        return this.message;
    }
  }

  /**
   * 標準エラーからAppErrorを作成
   */
  static fromError(error: Error | unknown, code?: ErrorCode): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const errorCode = code || ErrorCode.UNKNOWN_ERROR;
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;

    return new AppError(errorCode, message, { cause });
  }

  /**
   * ネットワークエラーを作成
   */
  static networkError(message?: string, retry?: () => Promise<void>): AppError {
    return new AppError(ErrorCode.NETWORK_ERROR, message, { retry });
  }

  /**
   * バリデーションエラーを作成
   */
  static validationError(message: string, details?: any): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, { details });
  }

  /**
   * 認証エラーを作成
   */
  static unauthorized(message?: string): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  /**
   * データが見つからないエラーを作成
   */
  static notFound(resource: string, id?: string): AppError {
    const message = id
      ? `${resource}が見つかりません (ID: ${id})`
      : `${resource}が見つかりません`;
    return new AppError(ErrorCode.NOT_FOUND, message, {
      context: { resource, id },
    });
  }

  /**
   * 同期エラーを作成
   */
  static syncError(message?: string, details?: any): AppError {
    return new AppError(ErrorCode.SYNC_FAILED, message, { details });
  }

  /**
   * 地図APIエラーを作成
   */
  static mapsApiError(message?: string, details?: any): AppError {
    return new AppError(ErrorCode.MAPS_API_ERROR, message, { details });
  }
}
