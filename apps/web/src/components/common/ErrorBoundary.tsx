import { Component, type ErrorInfo, type ReactNode, useState } from 'react';
import { AlertTriangle, Home, RefreshCw, ChevronDown, ChevronUp, WifiOff, ShieldX } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Network request failed') ||
    (error.name === 'TypeError' && error.message.includes('fetch'))
  );
}

function isAuthError(error: Error): boolean {
  return (
    error.message.includes('401') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('認証')
  );
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const [showStack, setShowStack] = useState(false);
  const isDev = import.meta.env.DEV;
  const isNetwork = isNetworkError(error);
  const isAuth = isAuthError(error);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-lg w-full bg-surface rounded-2xl shadow-lg border border-outline-variant p-8 text-center">
        {isNetwork ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <WifiOff className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">ネットワークエラー</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              サーバーに接続できません。インターネット接続を確認してください。
            </p>
          </>
        ) : isAuth ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">認証エラー</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              セッションが無効です。再度ログインしてください。
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">エラーが発生しました</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              {error.message || '予期しないエラーが発生しました。'}
            </p>
          </>
        )}

        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-variant text-on-surface-variant text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            ホームに戻る
          </a>
        </div>

        <button
          onClick={onReset}
          className="text-primary-600 text-sm hover:underline"
        >
          再試行
        </button>

        {isDev && error.stack && (
          <div className="mt-6 text-left">
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {showStack ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              スタックトレース
            </button>
            {showStack && (
              <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-on-surface-variant overflow-x-auto max-h-48 overflow-y-auto">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
