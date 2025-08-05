import React, { Component, ComponentType, ReactNode } from 'react';

/**
 * エラーバウンダリのプロパティ
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * フォールバックコンポーネントのプロパティ
 */
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

/**
 * デフォルトのエラーフォールバックコンポーネント
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <h3 className="text-red-800 font-semibold mb-2">エラーが発生しました</h3>
    <p className="text-red-600 text-sm">{error.message}</p>
  </div>
);

/**
 * エラーバウンダリ高階コンポーネント
 * コンポーネントをエラーバウンダリでラップし、エラー時にフォールバックUIを表示
 * 
 * @param Component ラップするコンポーネント
 * @param FallbackComponent エラー時に表示するフォールバックコンポーネント
 * @returns エラーバウンダリでラップされたコンポーネント
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  FallbackComponent: ComponentType<ErrorFallbackProps> = DefaultErrorFallback
) {
  return class ErrorBoundaryWrapper extends React.Component<P, ErrorBoundaryState> {
    constructor(props: P) {
      super(props);
      this.state = {
        hasError: false,
        error: null
      };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return {
        hasError: true,
        error
      };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    resetErrorBoundary = (): void => {
      this.setState({
        hasError: false,
        error: null
      });
    };

    render(): ReactNode {
      if (this.state.hasError && this.state.error) {
        return (
          <FallbackComponent 
            error={this.state.error} 
            resetErrorBoundary={this.resetErrorBoundary}
          />
        );
      }

      return <Component {...this.props} />;
    }
  };
}

/**
 * エラーバウンダリコンポーネント（直接使用する場合）
 */
export class ErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback?: ComponentType<ErrorFallbackProps>;
  },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ComponentType<ErrorFallbackProps> }) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}