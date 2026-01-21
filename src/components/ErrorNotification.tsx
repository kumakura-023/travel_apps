import React, { useEffect, useState, useCallback } from "react";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { isAppError, AppError, ErrorSeverity } from "../errors/AppError";
import { getErrorMessage } from "../errors/ErrorMessages";
import { ErrorCode } from "../errors/ErrorCode";

/**
 * 通知アイテムの型
 */
export interface ErrorNotificationItem {
  id: string;
  error: Error | AppError;
  timestamp: Date;
  dismissed?: boolean;
}

/**
 * ErrorNotification の Props
 */
interface ErrorNotificationProps {
  /** 表示するエラー */
  error?: Error | AppError | null;
  /** エラーリスト（複数表示対応） */
  errors?: ErrorNotificationItem[];
  /** 閉じるボタンクリック時のコールバック */
  onDismiss?: (id?: string) => void;
  /** リトライボタンクリック時のコールバック */
  onRetry?: () => void;
  /** 自動で閉じるまでの時間（ミリ秒）。0 で無効 */
  autoHideDuration?: number;
  /** 表示位置 */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center";
  /** 最大表示数 */
  maxNotifications?: number;
}

/**
 * severity に基づいたスタイルを取得
 */
function getStylesBySeverity(severity: ErrorSeverity): {
  bgColor: string;
  borderColor: string;
  iconColor: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (severity) {
    case "fatal":
    case "error":
      return {
        bgColor: "bg-red-50",
        borderColor: "border-red-400",
        iconColor: "text-red-400",
        Icon: FiAlertCircle,
      };
    case "warning":
      return {
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-400",
        iconColor: "text-yellow-400",
        Icon: FiAlertTriangle,
      };
    case "info":
    case "debug":
    default:
      return {
        bgColor: "bg-blue-50",
        borderColor: "border-blue-400",
        iconColor: "text-blue-400",
        Icon: FiInfo,
      };
  }
}

/**
 * 位置に基づいたスタイルを取得
 */
function getPositionStyles(
  position: ErrorNotificationProps["position"],
): string {
  switch (position) {
    case "top-left":
      return "top-4 left-4";
    case "bottom-right":
      return "bottom-4 right-4";
    case "bottom-left":
      return "bottom-4 left-4";
    case "top-center":
      return "top-4 left-1/2 -translate-x-1/2";
    case "top-right":
    default:
      return "top-4 right-4";
  }
}

/**
 * 単一のエラー通知コンポーネント
 */
const SingleNotification: React.FC<{
  error: Error | AppError;
  onDismiss?: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}> = ({ error, onDismiss, onRetry, autoHideDuration }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onDismiss]);

  if (!isVisible) return null;

  const appError = isAppError(error) ? error : null;
  const severity: ErrorSeverity = appError?.severity || "error";
  const styles = getStylesBySeverity(severity);
  const { Icon } = styles;

  // ユーザー向けメッセージを取得
  let userMessage = error.message;
  if (appError) {
    try {
      const codeMessage = getErrorMessage(appError.code as ErrorCode);
      if (codeMessage) userMessage = codeMessage;
    } catch {
      // ErrorCode にない場合はエラーメッセージをそのまま使用
    }
  }

  const canRetry = appError?.isRecoverable && onRetry;

  return (
    <div
      className={`${styles.bgColor} border-l-4 ${styles.borderColor} p-4 rounded-r-lg shadow-lg max-w-sm animate-slide-in`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-800">
            {severity === "fatal"
              ? "重大なエラー"
              : severity === "warning"
                ? "警告"
                : "エラー"}
          </p>
          <p className="mt-1 text-sm text-gray-600">{userMessage}</p>
          {appError && import.meta.env.DEV && (
            <p className="mt-1 text-xs text-gray-400">Code: {appError.code}</p>
          )}
          {canRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <FiRefreshCw className="mr-1 h-4 w-4" />
              再試行
            </button>
          )}
        </div>
        {onDismiss && (
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
            >
              <span className="sr-only">閉じる</span>
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ErrorNotification コンポーネント
 * トースト/モーダル形式でエラーを表示
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  errors,
  onDismiss,
  onRetry,
  autoHideDuration = 5000,
  position = "top-right",
  maxNotifications = 3,
}) => {
  const positionStyles = getPositionStyles(position);

  // 単一エラーの場合
  if (error && !errors) {
    return (
      <div className={`fixed ${positionStyles} z-50`}>
        <SingleNotification
          error={error}
          onDismiss={() => onDismiss?.()}
          onRetry={onRetry}
          autoHideDuration={autoHideDuration}
        />
      </div>
    );
  }

  // 複数エラーの場合
  if (errors && errors.length > 0) {
    const visibleErrors = errors
      .filter((e) => !e.dismissed)
      .slice(0, maxNotifications);

    return (
      <div className={`fixed ${positionStyles} z-50 space-y-2`}>
        {visibleErrors.map((item) => (
          <SingleNotification
            key={item.id}
            error={item.error}
            onDismiss={() => onDismiss?.(item.id)}
            onRetry={onRetry}
            autoHideDuration={autoHideDuration}
          />
        ))}
      </div>
    );
  }

  return null;
};

export default ErrorNotification;
