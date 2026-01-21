import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  isAppError,
  AppError,
  toAppError,
  ErrorSeverity,
} from "../errors/AppError";
import { getErrorMessage } from "../errors/ErrorMessages";
import { ErrorCode } from "../errors/ErrorCode";
import { ErrorNotificationItem } from "../components/ErrorNotification";

/**
 * useErrorHandler の戻り値
 */
export interface UseErrorHandlerReturn {
  /** 現在のエラー（単一） */
  error: AppError | null;
  /** エラーリスト（複数管理） */
  errors: ErrorNotificationItem[];
  /** エラーをセット */
  setError: (error: Error | AppError | unknown, fallbackCode?: string) => void;
  /** エラーをクリア */
  clearError: () => void;
  /** 特定のエラーを削除 */
  dismissError: (id: string) => void;
  /** すべてのエラーをクリア */
  clearAllErrors: () => void;
  /** エラーがあるかどうか */
  hasError: boolean;
  /** エラーメッセージ（ユーザー向け） */
  errorMessage: string | null;
  /** エラーハンドリングをラップする関数 */
  handleAsync: <T>(
    asyncFn: () => Promise<T>,
    options?: HandleAsyncOptions,
  ) => Promise<T | null>;
}

/**
 * handleAsync のオプション
 */
export interface HandleAsyncOptions {
  /** フォールバックエラーコード */
  fallbackCode?: string;
  /** エラー発生時のコールバック */
  onError?: (error: AppError) => void;
  /** 成功時のコールバック */
  onSuccess?: () => void;
  /** エラーを自動的に状態にセットするか */
  setErrorOnFail?: boolean;
  /** エラーの severity */
  severity?: ErrorSeverity;
}

/**
 * useErrorHandler の設定
 */
export interface UseErrorHandlerOptions {
  /** 最大エラー保持数 */
  maxErrors?: number;
  /** エラー発生時のグローバルコールバック */
  onError?: (error: AppError) => void;
  /** 自動クリア時間（ミリ秒）。0 で無効 */
  autoClearDuration?: number;
}

/**
 * コンポーネント用エラーハンドリング Hook
 * Phase 3: エラーハンドリング規約に準拠
 */
export function useErrorHandler(
  options: UseErrorHandlerOptions = {},
): UseErrorHandlerReturn {
  const { maxErrors = 5, onError, autoClearDuration = 0 } = options;

  const [error, setErrorState] = useState<AppError | null>(null);
  const [errors, setErrors] = useState<ErrorNotificationItem[]>([]);
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 自動クリアタイマーの設定
  useEffect(() => {
    if (autoClearDuration > 0 && error) {
      autoClearTimerRef.current = setTimeout(() => {
        setErrorState(null);
      }, autoClearDuration);

      return () => {
        if (autoClearTimerRef.current) {
          clearTimeout(autoClearTimerRef.current);
        }
      };
    }
  }, [error, autoClearDuration]);

  /**
   * エラーをセット
   */
  const setError = useCallback(
    (rawError: Error | AppError | unknown, fallbackCode = "UNKNOWN_ERROR") => {
      const appError = toAppError(rawError, fallbackCode);

      // 単一エラーを更新
      setErrorState(appError);

      // エラーリストに追加
      const newItem: ErrorNotificationItem = {
        id: uuidv4(),
        error: appError,
        timestamp: new Date(),
      };

      setErrors((prev) => {
        const updated = [newItem, ...prev].slice(0, maxErrors);
        return updated;
      });

      // グローバルコールバック
      if (onError) {
        onError(appError);
      }

      // 開発環境ではコンソールにログ
      if (import.meta.env.DEV) {
        console.error("[useErrorHandler]", appError.toJSON());
      }
    },
    [maxErrors, onError],
  );

  /**
   * 単一エラーをクリア
   */
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  /**
   * 特定のエラーを削除
   */
  const dismissError = useCallback((id: string) => {
    setErrors((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, dismissed: true } : item,
      ),
    );
  }, []);

  /**
   * すべてのエラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    setErrorState(null);
    setErrors([]);
  }, []);

  /**
   * ユーザー向けエラーメッセージを取得
   */
  const errorMessage = error
    ? (() => {
        try {
          const msg = getErrorMessage(error.code as ErrorCode);
          if (msg) return msg;
        } catch {
          // ErrorCode にない場合
        }
        return error.message;
      })()
    : null;

  /**
   * 非同期処理をエラーハンドリングでラップ
   */
  const handleAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      handlerOptions: HandleAsyncOptions = {},
    ): Promise<T | null> => {
      const {
        fallbackCode = "UNKNOWN_ERROR",
        onError: onErrorCallback,
        onSuccess,
        setErrorOnFail = true,
        severity = "error",
      } = handlerOptions;

      try {
        const result = await asyncFn();
        if (onSuccess) {
          onSuccess();
        }
        return result;
      } catch (err) {
        const appError = toAppError(err, fallbackCode, severity);

        if (setErrorOnFail) {
          setError(appError);
        }

        if (onErrorCallback) {
          onErrorCallback(appError);
        }

        return null;
      }
    },
    [setError],
  );

  return {
    error,
    errors,
    setError,
    clearError,
    dismissError,
    clearAllErrors,
    hasError: error !== null,
    errorMessage,
    handleAsync,
  };
}

export default useErrorHandler;
