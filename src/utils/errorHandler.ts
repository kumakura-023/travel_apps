import { config } from '../config/environment';

/**
 * エラーメッセージの型定義
 */
interface ErrorMessages {
  [key: string]: string;
}

/**
 * ユーザーフレンドリーなエラーメッセージ
 */
const USER_FRIENDLY_MESSAGES: ErrorMessages = {
  // ネットワークエラー
  'Failed to fetch': 'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。',
  'Network request failed': 'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。',
  
  // 認証エラー
  'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
  'auth/user-disabled': 'このアカウントは無効化されています。',
  'auth/user-not-found': 'ユーザーが見つかりません。',
  'auth/wrong-password': 'パスワードが正しくありません。',
  'auth/popup-closed-by-user': 'ログイン画面が閉じられました。もう一度お試しください。',
  'auth/network-request-failed': 'ネットワークエラーが発生しました。接続を確認してください。',
  
  // Firebaseエラー
  'permission-denied': 'アクセス権限がありません。ログインし直してください。',
  'unavailable': 'サービスが一時的に利用できません。しばらく経ってから再度お試しください。',
  'quota-exceeded': 'サービスの利用制限に達しました。しばらく経ってから再度お試しください。',
  
  // Google Maps API エラー
  'ZERO_RESULTS': 'ルートが見つかりませんでした。別の経路をお試しください。',
  'OVER_QUERY_LIMIT': 'APIの利用制限に達しました。しばらくお待ちください。',
  'REQUEST_DENIED': 'リクエストが拒否されました。管理者にお問い合わせください。',
  
  // デフォルト
  'default': 'エラーが発生しました。しばらく経ってから再度お試しください。',
};

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得
 */
const getUserFriendlyMessage = (error: unknown): string => {
  if (!error) return USER_FRIENDLY_MESSAGES.default;
  
  // エラーメッセージから適切なメッセージを探す
  const errorString = error instanceof Error ? error.message : String(error);
  
  // 完全一致を優先
  if (USER_FRIENDLY_MESSAGES[errorString]) {
    return USER_FRIENDLY_MESSAGES[errorString];
  }
  
  // 部分一致で検索
  for (const [key, message] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (errorString.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  return USER_FRIENDLY_MESSAGES.default;
};

/**
 * エラーの詳細情報を取得（開発環境のみ）
 */
const getErrorDetails = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
  }
  return String(error);
};

/**
 * エラーハンドリング関数
 * @param error - 発生したエラー
 * @param context - エラーが発生したコンテキスト（例: 'login', 'saveData'）
 * @returns ユーザーに表示するエラーメッセージ
 */
export const handleError = (error: unknown, context: string): string => {
  // エラーログ出力（開発環境では詳細、本番環境では簡潔に）
  if (config.isDevelopment) {
    console.error(`❌ Error in ${context}:`, error);
    console.error('Error details:', getErrorDetails(error));
  } else {
    console.error(`Error in ${context}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  // 本番環境ではユーザーフレンドリーなメッセージを返す
  if (config.isProduction) {
    return getUserFriendlyMessage(error);
  }
  
  // 開発環境では詳細なエラー情報を含める
  const friendlyMessage = getUserFriendlyMessage(error);
  const details = error instanceof Error ? error.message : String(error);
  return `${friendlyMessage}\n\n[開発環境] 詳細: ${details}`;
};

/**
 * 非同期エラーハンドリング用ラッパー
 * @param fn - 非同期関数
 * @param context - エラーコンテキスト
 * @returns ラップされた非同期関数
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = handleError(error, context);
      // エラーメッセージを含む新しいエラーを投げる
      throw new Error(message);
    }
  }) as T;
};

/**
 * Firebase エラーかどうかを判定
 */
export const isFirebaseError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  
  const errorObj = error as any;
  return (
    errorObj.code?.startsWith('auth/') ||
    errorObj.code?.includes('permission-denied') ||
    errorObj.code?.includes('unavailable') ||
    errorObj.code?.includes('quota-exceeded')
  );
};

/**
 * ネットワークエラーかどうかを判定
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;
  
  const errorString = error instanceof Error ? error.message : String(error);
  return (
    errorString.includes('Failed to fetch') ||
    errorString.includes('Network request failed') ||
    errorString.includes('ERR_NETWORK') ||
    errorString.includes('ERR_INTERNET_DISCONNECTED')
  );
};

/**
 * リトライ可能なエラーかどうかを判定
 */
export const isRetryableError = (error: unknown): boolean => {
  return isNetworkError(error) || 
         (error instanceof Error && error.message.includes('unavailable'));
};