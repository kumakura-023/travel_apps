import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 本番環境ではエラー監視サービス（Sentry等）にレポート
    if (import.meta.env.PROD) {
      // window.Sentry?.captureException(error, { extra: errorInfo });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  エラーが発生しました
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  申し訳ございませんが、予期しないエラーが発生しました。
                </p>
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
                  
                  <button
                    onClick={this.handleReset}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiHome className="mr-2 h-4 w-4" />
                    続行を試行
                  </button>
                </div>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    エラー詳細（開発者向け）
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 font-mono overflow-auto max-h-40">
                    <div className="font-bold">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    <div className="font-bold">Stack:</div>
                    <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                    {this.state.errorInfo && (
                      <>
                        <div className="font-bold mt-2">Component Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
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