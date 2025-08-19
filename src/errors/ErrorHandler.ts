import { AppError } from "./AppError";
import { ErrorCode, ErrorSeverity } from "./ErrorCodes";
import { toast } from "react-hot-toast";
import React from "react";

/**
 * エラーハンドリングのオプション
 */
interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  sendToAnalytics?: boolean;
  silent?: boolean;
}

/**
 * エラーリトライのオプション
 */
interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

/**
 * 統一エラーハンドラー
 */
export class ErrorHandler {
  private static retryCount = new Map<string, number>();

  /**
   * エラーを処理
   */
  static handle(
    error: Error | unknown,
    options: ErrorHandlerOptions = {},
  ): void {
    const {
      showToast = true,
      logToConsole = true,
      sendToAnalytics = true,
      silent = false,
    } = options;

    // AppErrorに変換
    const appError =
      error instanceof AppError ? error : AppError.fromError(error);

    // サイレントモードの場合は何もしない
    if (silent) return;

    // コンソールログ
    if (logToConsole) {
      this.logError(appError);
    }

    // トースト表示
    if (showToast) {
      this.showErrorToast(appError);
    }

    // アナリティクスに送信
    if (sendToAnalytics) {
      this.sendToAnalytics(appError);
    }
  }

  /**
   * 非同期エラーを処理
   */
  static async handleAsync<T>(
    promise: Promise<T>,
    options?: ErrorHandlerOptions,
  ): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      this.handle(error, options);
      return null;
    }
  }

  /**
   * リトライ付きでエラーを処理
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    retryOptions: RetryOptions = {},
    errorOptions?: ErrorHandlerOptions,
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000, backoff = true } = retryOptions;

    const operationId = operation.toString();
    let retries = this.retryCount.get(operationId) || 0;

    try {
      const result = await operation();
      this.retryCount.delete(operationId); // 成功したらリトライカウントをリセット
      return result;
    } catch (error) {
      const appError =
        error instanceof AppError ? error : AppError.fromError(error);

      if (retries < maxRetries && appError.isRetryable) {
        retries++;
        this.retryCount.set(operationId, retries);

        const waitTime = backoff ? delay * Math.pow(2, retries - 1) : delay;

        console.log(
          `Retrying operation (${retries}/${maxRetries}) after ${waitTime}ms...`,
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));

        return this.handleWithRetry(operation, retryOptions, errorOptions);
      }

      this.retryCount.delete(operationId);
      this.handle(appError, errorOptions);
      throw appError;
    }
  }

  /**
   * エラーをコンソールに出力
   */
  private static logError(error: AppError): void {
    const logMethod = this.getLogMethod(error.severity);

    console.group(`🚨 ${error.name} [${error.code}]`);
    logMethod("Message:", error.message);
    logMethod("Severity:", error.severity);
    logMethod("Timestamp:", error.timestamp);

    if (error.details) {
      logMethod("Details:", error.details);
    }

    if (error.context) {
      logMethod("Context:", error.context);
    }

    if (error.stack) {
      logMethod("Stack:", error.stack);
    }

    if (error.cause) {
      logMethod("Cause:", error.cause);
    }

    console.groupEnd();
  }

  /**
   * エラーの重要度に応じたログメソッドを取得
   */
  private static getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        return console.error;
      case ErrorSeverity.WARNING:
        return console.warn;
      case ErrorSeverity.INFO:
      default:
        return console.log;
    }
  }

  /**
   * エラートーストを表示
   */
  private static showErrorToast(error: AppError): void {
    const message = error.getUserMessage();

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        toast.error(message, {
          duration: 5000,
          position: "top-center",
        });
        break;

      case ErrorSeverity.WARNING:
        toast(message, {
          icon: "⚠️",
          duration: 4000,
          position: "top-center",
        });
        break;

      case ErrorSeverity.INFO:
        toast(message, {
          icon: "ℹ️",
          duration: 3000,
          position: "top-center",
        });
        break;
    }

    // リトライ可能な場合はリトライボタンを表示
    if (error.isRetryable && error.retry) {
      setTimeout(() => {
        toast.custom(
          (t: any) =>
            React.createElement(
              "div",
              { className: "bg-white p-4 rounded shadow-lg" },
              React.createElement(
                "p",
                { className: "mb-2" },
                "操作を再試行しますか？",
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    toast.dismiss(t.id);
                    error.retry!();
                  },
                  className:
                    "mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600",
                },
                "再試行",
              ),
            ),
          {
            duration: 10000,
            position: "top-center",
          },
        );
      }, 100);
    }
  }

  /**
   * アナリティクスにエラーを送信
   */
  private static sendToAnalytics(error: AppError): void {
    // TODO: Google Analytics、Sentry、LogRocketなどに送信
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: error.severity === ErrorSeverity.CRITICAL,
        error_code: error.code,
      });
    }
  }

  /**
   * グローバルエラーハンドラーを設定
   */
  static setupGlobalHandlers(): void {
    // 未処理のPromiseエラーをキャッチ
    window.addEventListener("unhandledrejection", (event) => {
      event.preventDefault();
      this.handle(event.reason, {
        showToast: true,
        logToConsole: true,
      });
    });

    // 通常のエラーをキャッチ
    window.addEventListener("error", (event) => {
      event.preventDefault();
      this.handle(event.error || event.message, {
        showToast: true,
        logToConsole: true,
      });
    });
  }
}

// TypeScript用のグローバル型定義
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
