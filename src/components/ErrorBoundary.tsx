import React, { Component, ErrorInfo, ReactNode } from "react";
import { FiAlertTriangle, FiRefreshCw, FiHome, FiX } from "react-icons/fi";
import { isAppError, AppError, ErrorSeverity } from "../errors/AppError";
import { getErrorMessage } from "../errors/ErrorMessages";
import { ErrorCode } from "../errors/ErrorCode";

interface Props {
  children: ReactNode;
  /** エラー発生時にリカバリー可能な場合に呼ばれるコールバック */
  onError?: (error: AppError | Error) => void;
  /** カスタムフォールバックUI */
  fallback?:
    | ReactNode
    | ((error: Error | AppError, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error?: Error | AppError;
  errorInfo?: ErrorInfo;
}

/**
 * AppError 対応の React ErrorBoundary
 * Phase 3: エラーハンドリング規約に準拠
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // コールバックを呼び出し
    if (this.props.onError) {
      this.props.onError(error);
    }

    // 本番環境ではエラー監視サービス（Sentry等）にレポート
    if (import.meta.env.PROD) {
      // AppError の場合は追加情報をログ
      if (isAppError(error)) {
        console.error("[ErrorBoundary] AppError details:", error.toJSON());
      }
      // window.Sentry?.captureException(error, { extra: errorInfo });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /**
   * エラーの severity に基づいた背景色を取得
   */
  private getErrorStyles(): {
    bgColor: string;
    iconColor: string;
    borderColor: string;
  } {
    const error = this.state.error;
    if (!isAppError(error)) {
      return {
        bgColor: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-200",
      };
    }

    switch (error.severity) {
      case "fatal":
        return {
          bgColor: "bg-red-100",
          iconColor: "text-red-600",
          borderColor: "border-red-200",
        };
      case "error":
        return {
          bgColor: "bg-orange-100",
          iconColor: "text-orange-600",
          borderColor: "border-orange-200",
        };
      case "warning":
        return {
          bgColor: "bg-yellow-100",
          iconColor: "text-yellow-600",
          borderColor: "border-yellow-200",
        };
      default:
        return {
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
          borderColor: "border-blue-200",
        };
    }
  }

  /**
   * ユーザー向けエラーメッセージを取得
   */
  private getUserMessage(): string {
    const error = this.state.error;

    if (isAppError(error)) {
      // ErrorCode に対応するメッセージがあればそれを使用
      try {
        const message = getErrorMessage(error.code as ErrorCode);
        if (message) return message;
      } catch {
        // ErrorCode にない場合はエラーメッセージをそのまま使用
      }
      return error.message;
    }

    return error?.message || "予期しないエラーが発生しました。";
  }

  /**
   * エラーがリカバリー可能かどうか
   */
  private isRecoverable(): boolean {
    const error = this.state.error;
    if (isAppError(error)) {
      return error.isRecoverable;
    }
    return true; // 通常の Error はリカバリー可能とみなす
  }

  public render() {
    if (this.state.hasError) {
      // カスタムフォールバックが指定されている場合
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error!, this.handleReset);
        }
        return this.props.fallback;
      }

      const styles = this.getErrorStyles();
      const userMessage = this.getUserMessage();
      const recoverable = this.isRecoverable();
      const appError = isAppError(this.state.error) ? this.state.error : null;

      return (
        <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div
                  className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.bgColor}`}
                >
                  <FiAlertTriangle
                    className={`h-6 w-6 ${styles.iconColor}`}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  {appError?.severity === "fatal"
                    ? "重大なエラー"
                    : "エラーが発生しました"}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  {userMessage}
                </p>
                {appError && (
                  <p className="mt-1 text-center text-xs text-gray-400">
                    エラーコード: {appError.code}
                  </p>
                )}
              </div>

              <div className="mt-6">
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    ページを再読み込み
                  </button>

                  {recoverable && (
                    <button
                      onClick={this.handleReset}
                      className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiHome className="mr-2 h-4 w-4" />
                      続行を試行
                    </button>
                  )}
                </div>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    エラー詳細（開発者向け）
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 font-mono overflow-auto max-h-40">
                    {appError && (
                      <>
                        <div className="font-bold">AppError:</div>
                        <pre className="mb-2 whitespace-pre-wrap">
                          {JSON.stringify(appError.toJSON(), null, 2)}
                        </pre>
                      </>
                    )}
                    <div className="font-bold">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    <div className="font-bold">Stack:</div>
                    <div className="whitespace-pre-wrap">
                      {this.state.error.stack}
                    </div>
                    {this.state.errorInfo && (
                      <>
                        <div className="font-bold mt-2">Component Stack:</div>
                        <div className="whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
