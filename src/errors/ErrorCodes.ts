/**
 * アプリケーション全体で使用するエラーコード
 */
export enum ErrorCode {
  // ネットワーク関連
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  TIMEOUT = "TIMEOUT",

  // 同期関連
  SYNC_CONFLICT = "SYNC_CONFLICT",
  SYNC_FAILED = "SYNC_FAILED",
  SYNC_RATE_LIMIT = "SYNC_RATE_LIMIT",

  // バリデーション関連
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",

  // 権限関連
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // データ関連
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  DATA_INTEGRITY_ERROR = "DATA_INTEGRITY_ERROR",

  // 地図・位置情報関連
  LOCATION_ERROR = "LOCATION_ERROR",
  GEOLOCATION_DENIED = "GEOLOCATION_DENIED",
  MAPS_API_ERROR = "MAPS_API_ERROR",
  DIRECTIONS_API_ERROR = "DIRECTIONS_API_ERROR",

  // ストレージ関連
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  LOCAL_STORAGE_ERROR = "LOCAL_STORAGE_ERROR",

  // その他
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  OPERATION_CANCELLED = "OPERATION_CANCELLED",
}

/**
 * エラーの重要度レベル
 */
export enum ErrorSeverity {
  CRITICAL = "critical", // アプリケーションの動作に致命的
  ERROR = "error", // 機能の実行に失敗
  WARNING = "warning", // 警告（処理は継続可能）
  INFO = "info", // 情報（エラーではないが通知が必要）
}

/**
 * エラーコードから重要度を取得
 */
export function getErrorSeverity(code: ErrorCode): ErrorSeverity {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
    case ErrorCode.DATA_INTEGRITY_ERROR:
      return ErrorSeverity.CRITICAL;

    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.API_ERROR:
    case ErrorCode.SYNC_FAILED:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.NOT_FOUND:
    case ErrorCode.MAPS_API_ERROR:
    case ErrorCode.DIRECTIONS_API_ERROR:
      return ErrorSeverity.ERROR;

    case ErrorCode.SYNC_CONFLICT:
    case ErrorCode.SYNC_RATE_LIMIT:
    case ErrorCode.LOCATION_ERROR:
    case ErrorCode.STORAGE_QUOTA_EXCEEDED:
      return ErrorSeverity.WARNING;

    default:
      return ErrorSeverity.INFO;
  }
}

/**
 * エラーコードから日本語メッセージを取得
 */
export function getErrorMessage(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.NETWORK_ERROR:
      return "ネットワークエラーが発生しました";
    case ErrorCode.API_ERROR:
      return "APIエラーが発生しました";
    case ErrorCode.TIMEOUT:
      return "タイムアウトしました";

    case ErrorCode.SYNC_CONFLICT:
      return "同期の競合が発生しました";
    case ErrorCode.SYNC_FAILED:
      return "同期に失敗しました";
    case ErrorCode.SYNC_RATE_LIMIT:
      return "同期の頻度制限に達しました";

    case ErrorCode.VALIDATION_ERROR:
      return "入力値が不正です";
    case ErrorCode.INVALID_INPUT:
      return "無効な入力です";
    case ErrorCode.REQUIRED_FIELD_MISSING:
      return "必須項目が入力されていません";

    case ErrorCode.PERMISSION_DENIED:
      return "アクセス権限がありません";
    case ErrorCode.UNAUTHORIZED:
      return "認証が必要です";
    case ErrorCode.FORBIDDEN:
      return "アクセスが拒否されました";

    case ErrorCode.NOT_FOUND:
      return "データが見つかりません";
    case ErrorCode.ALREADY_EXISTS:
      return "すでに存在します";
    case ErrorCode.DATA_INTEGRITY_ERROR:
      return "データの整合性エラーが発生しました";

    case ErrorCode.LOCATION_ERROR:
      return "位置情報の取得に失敗しました";
    case ErrorCode.GEOLOCATION_DENIED:
      return "位置情報へのアクセスが拒否されました";
    case ErrorCode.MAPS_API_ERROR:
      return "地図の読み込みに失敗しました";
    case ErrorCode.DIRECTIONS_API_ERROR:
      return "ルート検索に失敗しました";

    case ErrorCode.STORAGE_QUOTA_EXCEEDED:
      return "ストレージの容量が不足しています";
    case ErrorCode.LOCAL_STORAGE_ERROR:
      return "ローカルストレージエラーが発生しました";

    case ErrorCode.OPERATION_CANCELLED:
      return "操作がキャンセルされました";
    case ErrorCode.UNKNOWN_ERROR:
    default:
      return "予期しないエラーが発生しました";
  }
}
