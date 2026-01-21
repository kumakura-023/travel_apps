/**
 * Phase 3: リトライ戦略定義
 */

import { SyncErrorCode, NetworkErrorCode, type ErrorCode } from "./ErrorCode";

export interface RetryPolicy {
  maxRetries: number;
  shouldRetry: boolean;
  backoffMs?: number[];
  fallback?: string;
}

/**
 * デフォルトのリトライポリシー
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 0,
  shouldRetry: false,
};

/**
 * エラーコード別リトライポリシー
 */
export const RETRY_POLICIES: Partial<Record<ErrorCode, RetryPolicy>> = {
  // ========== Sync エラー ==========
  [SyncErrorCode.SYNC_CONNECTION_LOST]: {
    maxRetries: 5,
    backoffMs: [1000, 2000, 4000, 8000, 16000],
    shouldRetry: true,
  },
  [SyncErrorCode.SYNC_TIMEOUT]: {
    maxRetries: 3,
    backoffMs: [2000, 4000, 8000],
    shouldRetry: true,
  },
  [SyncErrorCode.SYNC_CONFLICT]: {
    maxRetries: 0,
    shouldRetry: false,
    fallback: "showConflictResolver",
  },
  [SyncErrorCode.SYNC_PERMISSION_DENIED]: {
    maxRetries: 0,
    shouldRetry: false,
    fallback: "showAuthPrompt",
  },
  [SyncErrorCode.SYNC_VERSION_MISMATCH]: {
    maxRetries: 1,
    backoffMs: [1000],
    shouldRetry: true,
    fallback: "reloadPage",
  },
  [SyncErrorCode.SYNC_QUOTA_EXCEEDED]: {
    maxRetries: 0,
    shouldRetry: false,
  },

  // ========== Network エラー ==========
  [NetworkErrorCode.NETWORK_OFFLINE]: {
    maxRetries: 10,
    backoffMs: [
      2000, 3000, 5000, 5000, 5000, 10000, 10000, 10000, 20000, 30000,
    ],
    shouldRetry: true,
  },
  [NetworkErrorCode.NETWORK_TIMEOUT]: {
    maxRetries: 3,
    backoffMs: [2000, 5000, 10000],
    shouldRetry: true,
  },
  [NetworkErrorCode.NETWORK_SERVER_ERROR]: {
    maxRetries: 2,
    backoffMs: [5000, 15000],
    shouldRetry: true,
  },
  [NetworkErrorCode.NETWORK_RATE_LIMITED]: {
    maxRetries: 1,
    backoffMs: [60000], // 1分待機
    shouldRetry: true,
  },
};

/**
 * エラーコードに対応するリトライポリシーを取得
 */
export function getRetryPolicy(code: ErrorCode): RetryPolicy {
  return RETRY_POLICIES[code] || DEFAULT_RETRY_POLICY;
}

/**
 * 指数バックオフ計算
 */
export function calculateBackoff(
  retryCount: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
): number {
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, retryCount),
    maxDelayMs,
  );
  // ジッター追加（±20%のランダム性）
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * リトライ実行ヘルパー
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  onRetry?: (retryCount: number, delay: number) => void,
): Promise<T> {
  if (!policy.shouldRetry) {
    return operation();
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < policy.maxRetries) {
        const delay = policy.backoffMs?.[attempt] || calculateBackoff(attempt);
        onRetry?.(attempt, delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
