/**
 * Phase 3 & Legacy: エラー関連エクスポート
 * 新規Phase3エラー基盤と既存コードの後方互換性を両立
 */

// Phase 3 新規エラー基盤
export { AppError, isAppError, toAppError } from "./AppError";
export type { ErrorContext, ErrorDTO } from "./AppError";
// ErrorSeverityは型のみエクスポート（ErrorCodes.tsのenumと競合回避）
export type { ErrorSeverity } from "./AppError";
export {
  PlanErrorCode,
  PlaceErrorCode,
  RouteErrorCode,
  SyncErrorCode,
  MapErrorCode,
  AuthErrorCode,
  NetworkErrorCode,
  isErrorCode,
} from "./ErrorCode";
// ErrorCodeは型のみエクスポート（ErrorCodes.tsのenumと競合回避）
export type { ErrorCode } from "./ErrorCode";
export { ERROR_MESSAGES } from "./ErrorMessages";
export {
  RETRY_POLICIES,
  DEFAULT_RETRY_POLICY,
  getRetryPolicy,
  calculateBackoff,
  withRetry,
} from "./RetryPolicy";
export type { RetryPolicy } from "./RetryPolicy";

// 後方互換性のため既存のエクスポート（enum）
export { ErrorHandler } from "./ErrorHandler";
export {
  ErrorCode,
  ErrorSeverity,
  getErrorMessage,
  getErrorSeverity,
} from "./ErrorCodes";
