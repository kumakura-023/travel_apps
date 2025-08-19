/**
 * エラー関連のエクスポート
 */
export { AppError } from "./AppError";
export { ErrorHandler } from "./ErrorHandler";
export {
  ErrorCode,
  ErrorSeverity,
  getErrorMessage,
  getErrorSeverity,
} from "./ErrorCodes";

import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

// 便利なエラー作成関数のエクスポート
export const createNetworkError = (
  message?: string,
  retry?: () => Promise<void>,
) => {
  return new AppError(ErrorCode.NETWORK_ERROR, message, { retry });
};

export const createValidationError = (message: string, details?: any) => {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, { details });
};

export const createNotFoundError = (resource: string, id?: string) => {
  const msg = id
    ? `${resource}が見つかりません (ID: ${id})`
    : `${resource}が見つかりません`;
  return new AppError(ErrorCode.NOT_FOUND, msg, { context: { resource, id } });
};

export const createSyncError = (message?: string, details?: any) => {
  return new AppError(ErrorCode.SYNC_FAILED, message, { details });
};

export const createMapsApiError = (message?: string, details?: any) => {
  return new AppError(ErrorCode.MAPS_API_ERROR, message, { details });
};
