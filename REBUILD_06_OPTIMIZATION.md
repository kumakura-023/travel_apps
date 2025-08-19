# Phase 6: 最適化・仕上げ - 詳細実装指示

## 目標

VoyageSketchを本番環境で使用可能な高品質アプリケーションとして完成させるため、パフォーマンス最適化、PWA機能の実装、テスト、デバッグを行う。

## 実装期間

1週間

## 前提条件

- Phase 1-5が完了済み
- 全ての主要機能が実装済み
- 基本的な動作確認が完了

## タスクリスト

### 1. パフォーマンス最適化

#### A. 画像最適化サービス (`src/services/optimization/ImageOptimizer.ts`)

```typescript
class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  async optimizeImage(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: "jpeg" | "webp";
    } = {},
  ): Promise<Blob> {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 0.8,
      format = "jpeg",
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // アスペクト比を保持してリサイズ
        let { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
        );

        this.canvas.width = width;
        this.canvas.height = height;

        // 高品質な縮小処理
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";
        this.ctx.drawImage(img, 0, 0, width, height);

        // 最適化された画像をBlobとして出力
        this.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Image optimization failed"));
            }
          },
          `image/${format}`,
          quality,
        );
      };

      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  async createThumbnail(file: File, size: number = 150): Promise<Blob> {
    return this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: "jpeg",
    });
  }
}

export const imageOptimizer = new ImageOptimizer();
```

#### B. メモリ使用量監視フック (`src/hooks/optimization/useMemoryMonitor.ts`)

```typescript
import { useEffect, useRef } from "react";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function useMemoryMonitor(threshold: number = 50 * 1024 * 1024) {
  // 50MB
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!("memory" in performance)) {
      return; // メモリAPIが利用できない環境
    }

    const checkMemoryUsage = () => {
      const memory = (performance as any).memory as MemoryInfo;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

      console.log(
        `Memory usage: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (Limit: ${limitMB.toFixed(1)}MB)`,
      );

      // メモリ使用量が閾値を超えた場合の警告
      if (memory.usedJSHeapSize > threshold && !warningShownRef.current) {
        console.warn(
          "High memory usage detected. Consider optimizing the application.",
        );
        warningShownRef.current = true;

        // ガベージコレクションの提案
        if ("gc" in window) {
          console.log("Triggering garbage collection...");
          (window as any).gc();
        }
      }

      // メモリ使用量が正常に戻った場合
      if (memory.usedJSHeapSize < threshold * 0.8) {
        warningShownRef.current = false;
      }
    };

    // 定期的なメモリ監視
    const interval = setInterval(checkMemoryUsage, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [threshold]);
}
```

#### C. 仮想スクロール実装 (`src/components/optimization/VirtualizedList.tsx`)

```typescript
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
      });
    }
    return result;
  }, [items, visibleRange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2. PWA機能の完全実装

#### A. Service Worker強化 (`public/sw.js`)

```javascript
const CACHE_NAME = "voyage-sketch-v2.0.0";
const API_CACHE_NAME = "voyage-sketch-api-v2.0.0";

// キャッシュするリソース
const STATIC_RESOURCES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  // 重要なスタイルシートとJavaScript
  // Viteが生成するファイル名は動的なので、実際のビルド後に更新
];

// Google Maps API のキャッシュ戦略
const MAPS_API_PATTERNS = [
  /^https:\/\/maps\.googleapis\.com\//,
  /^https:\/\/maps\.gstatic\.com\//,
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
];

// Firebase API のキャッシュ戦略
const FIREBASE_API_PATTERNS = [
  /^https:\/\/.*\.firebaseio\.com\//,
  /^https:\/\/firestore\.googleapis\.com\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_RESOURCES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML requests - Network First with Cache Fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Google Maps API - Stale While Revalidate
  if (MAPS_API_PATTERNS.some((pattern) => pattern.test(request.url))) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });

          return cachedResponse || fetchPromise;
        });
      }),
    );
    return;
  }

  // Firebase API - Network First
  if (FIREBASE_API_PATTERNS.some((pattern) => pattern.test(request.url))) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Static Assets - Cache First
  event.respondWith(
    caches.match(request).then((response) => response || fetch(request)),
  );
});

// バックグラウンド同期（オフライン時の操作を同期）
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // オフライン時に蓄積された操作を同期
      syncOfflineOperations(),
    );
  }
});

async function syncOfflineOperations() {
  try {
    // IndexedDBから未同期の操作を取得して処理
    const operations = await getOfflineOperations();

    for (const operation of operations) {
      try {
        await syncOperation(operation);
        await markOperationSynced(operation.id);
      } catch (error) {
        console.error("Failed to sync operation:", error);
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// プッシュ通知（将来の拡張用）
self.addEventListener("push", (event) => {
  const options = {
    body: event.data?.text() || "新しい更新があります",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: "voyage-sketch-notification",
    data: {
      url: "/",
    },
  };

  event.waitUntil(self.registration.showNotification("VoyageSketch", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});
```

#### B. PWA管理フック (`src/hooks/pwa/usePWA.ts`)

```typescript
import { useState, useEffect } from "react";

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOffline: boolean;
  needsUpdate: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isOffline: !navigator.onLine,
    needsUpdate: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // インストール状態の確認
    const checkInstallStatus = () => {
      const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      setState((prev) => ({ ...prev, isInstalled }));
    };

    // オンライン/オフライン状態の監視
    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOffline: true }));

    // インストール可能状態の監視
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    // Service Worker更新の監視
    const handleServiceWorkerUpdate = () => {
      setState((prev) => ({ ...prev, needsUpdate: true }));
    };

    // イベントリスナーの設定
    checkInstallStatus();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Service Worker の登録と更新監視
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleServiceWorkerUpdate,
      );
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleServiceWorkerUpdate,
        );
      }
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setState((prev) => ({ ...prev, canInstall: false, isInstalled: true }));
        setDeferredPrompt(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Installation failed:", error);
      return false;
    }
  };

  const updateApp = async (): Promise<void> => {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }
    }
  };

  return {
    ...state,
    installApp,
    updateApp,
  };
}
```

### 3. エラー監視とレポーティング

#### A. エラー境界コンポーネント (`src/components/error/ErrorBoundary.tsx`)

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    // エラーをレポーティングサービスに送信
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorId: this.state.errorId,
      };

      // ここで実際のエラーレポーティングサービス（Sentry等）に送信
      console.log('Error Report:', errorReport);

      // ローカルストレージにも保存（デバッグ用）
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);

      // 最新10件のみ保持
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }

      localStorage.setItem('errorReports', JSON.stringify(existingErrors));
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleRetry);
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  申し訳ございません
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  予期せぬエラーが発生しました。しばらく時間をおいて再度お試しください。
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                      エラー詳細（開発用）
                    </summary>
                    <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                      <div className="mb-2">
                        <strong>エラーID:</strong> {this.state.errorId}
                      </div>
                      <div className="mb-2">
                        <strong>メッセージ:</strong> {this.state.error.message}
                      </div>
                      <div>
                        <strong>スタック:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                    </div>
                  </details>
                )}

                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  再試行
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### B. パフォーマンス監視 (`src/services/monitoring/PerformanceMonitor.ts`)

```typescript
interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observer: PerformanceObserver | null = null;

  initialize() {
    if (!("PerformanceObserver" in window)) {
      console.warn("PerformanceObserver not supported");
      return;
    }

    this.observeWebVitals();
    this.observeNavigationTiming();
    this.setupPeriodicReporting();
  }

  private observeWebVitals() {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (error) {
      console.error("Failed to observe web vitals:", error);
    }
  }

  private observeNavigationTiming() {
    window.addEventListener("load", () => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        this.metrics.ttfb = navigation.responseStart - navigation.requestStart;

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType("paint");
        const fcpEntry = paintEntries.find(
          (entry) => entry.name === "first-contentful-paint",
        );
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
        }
      }
    });
  }

  private setupPeriodicReporting() {
    // 30秒ごとにメトリクスをレポート
    setInterval(() => {
      this.reportMetrics();
    }, 30000);

    // ページアンロード時にもレポート
    window.addEventListener("beforeunload", () => {
      this.reportMetrics();
    });
  }

  private reportMetrics() {
    const report = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      memoryUsage: (performance as any).memory
        ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null,
    };

    console.log("Performance Report:", report);

    // 実際の監視サービスに送信
    this.sendToMonitoringService(report);

    // ローカルストレージにも保存（デバッグ用）
    const existingReports = JSON.parse(
      localStorage.getItem("performanceReports") || "[]",
    );
    existingReports.push(report);

    if (existingReports.length > 50) {
      existingReports.splice(0, existingReports.length - 50);
    }

    localStorage.setItem("performanceReports", JSON.stringify(existingReports));
  }

  private async sendToMonitoringService(report: any) {
    try {
      // ここで実際の監視サービス（Google Analytics、DataDog等）に送信
      // 現在はコンソールログのみ

      // パフォーマンス警告の判定
      const warnings = [];

      if (report.fcp > 1800) warnings.push("FCP is slow (>1.8s)");
      if (report.lcp > 2500) warnings.push("LCP is slow (>2.5s)");
      if (report.fid > 100) warnings.push("FID is slow (>100ms)");
      if (report.cls > 0.1) warnings.push("CLS is poor (>0.1)");

      if (warnings.length > 0) {
        console.warn("Performance warnings:", warnings);
      }
    } catch (error) {
      console.error("Failed to send performance report:", error);
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

### 4. 最終テスト・品質保証

#### A. E2Eテスト用のヘルパー (`src/testing/e2e-helpers.ts`)

```typescript
// E2Eテスト用のヘルパー関数（Playwright/Cypress用）

export const testSelectors = {
  // 認証
  loginButton: '[data-testid="login-button"]',
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',

  // 地図
  map: '[data-testid="map"]',
  searchBar: '[data-testid="search-bar"]',
  placeMarker: '[data-testid="place-marker"]',

  // 計画
  planList: '[data-testid="plan-list"]',
  createPlanButton: '[data-testid="create-plan-button"]',
  planTitle: '[data-testid="plan-title"]',

  // メモ
  memoEditor: '[data-testid="memo-editor"]',
  memoSaveButton: '[data-testid="memo-save-button"]',

  // ルート
  routePanel: '[data-testid="route-panel"]',
  routeCalculateButton: '[data-testid="route-calculate-button"]',

  // 共有
  shareButton: '[data-testid="share-button"]',
  shareModal: '[data-testid="share-modal"]',
  generateLinkButton: '[data-testid="generate-link-button"]',
} as const;

export const testScenarios = {
  // 基本的なユーザーフロー
  async createAndEditPlan() {
    // 1. ログイン
    // 2. 新しい計画を作成
    // 3. 場所を追加
    // 4. メモを編集
    // 5. ルートを計算
    // 6. 計画を保存
  },

  async sharePlan() {
    // 1. 計画を開く
    // 2. 共有ボタンをクリック
    // 3. 招待リンクを生成
    // 4. 権限を設定
    // 5. リンクをコピー
  },

  async offlineUsage() {
    // 1. オンラインで計画を作成
    // 2. ネットワークを切断
    // 3. メモを編集（オフライン）
    // 4. ネットワークを復旧
    // 5. 同期を確認
  },
};

export const testUtils = {
  // メモ同期のテスト
  async testMemoSync() {
    // 複数のブラウザタブを開いて同期をテスト
    const tabs = await Promise.all([
      // Tab 1: メモを編集
      // Tab 2: 同期された内容を確認
    ]);
  },

  // パフォーマンステスト
  async measurePageLoadTime() {
    const startTime = performance.now();
    // ページ読み込み処理
    const endTime = performance.now();
    return endTime - startTime;
  },

  // アクセシビリティテスト
  async checkAccessibility() {
    // ARIA属性の確認
    // キーボードナビゲーションのテスト
    // スクリーンリーダー対応の確認
  },
};
```

#### B. 品質チェックリスト (`QUALITY_CHECKLIST.md`)

```markdown
# VoyageSketch 品質チェックリスト

## 機能テスト

### 認証・ユーザー管理

- [ ] ユーザー登録が正常に動作する
- [ ] ログイン・ログアウトが正常に動作する
- [ ] パスワードリセットが動作する
- [ ] ユーザープロフィール編集が動作する

### 地図・場所機能

- [ ] Google Mapsが正常に表示される
- [ ] 場所検索が動作する
- [ ] 場所追加・編集・削除が動作する
- [ ] マーカークラスタリングが動作する
- [ ] 現在地取得が動作する

### 計画管理

- [ ] 計画作成・編集・削除が動作する
- [ ] 計画一覧表示が正常
- [ ] メンバー管理が動作する
- [ ] 日付設定が動作する

### メモ機能

- [ ] メモ編集が即座にUIに反映される
- [ ] デバウンス機能が正常に動作する
- [ ] リアルタイム同期が動作する
- [ ] 無限ループが発生しない
- [ ] 複数ユーザー同時編集が可能

### ルート機能

- [ ] ルート計算が正常に動作する
- [ ] 移動手段の切り替えが動作する
- [ ] 所要時間・距離表示が正確
- [ ] ルート最適化が動作する

### 共有機能

- [ ] 招待リンク生成が動作する
- [ ] 権限設定が正常に機能する
- [ ] 有効期限・使用回数制限が動作する
- [ ] 招待リンクからの参加が動作する

### コスト管理

- [ ] コスト追加・編集・削除が動作する
- [ ] カテゴリ別集計が正確
- [ ] 円グラフが正しく表示される
- [ ] 通貨フォーマットが正しい

## パフォーマンステスト

### Core Web Vitals

- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

### ネットワーク

- [ ] 低速回線での動作確認
- [ ] オフライン機能の動作確認
- [ ] 同期エラー時の回復処理確認

### メモリ・CPU

- [ ] メモリリークがない
- [ ] CPU使用率が適切
- [ ] 長時間使用での安定性確認

## ユーザビリティテスト

### アクセシビリティ

- [ ] キーボードナビゲーションが可能
- [ ] スクリーンリーダー対応
- [ ] 色のコントラスト比が適切
- [ ] ARIA属性が適切に設定

### レスポンシブデザイン

- [ ] モバイル表示が適切
- [ ] タブレット表示が適切
- [ ] デスクトップ表示が適切
- [ ] 各画面サイズでの操作性確認

### ユーザーエクスペリエンス

- [ ] ローディング状態の表示が適切
- [ ] エラーメッセージが分かりやすい
- [ ] 成功メッセージが適切に表示
- [ ] ナビゲーションが直感的

## セキュリティテスト

### データ保護

- [ ] 認証トークンの適切な管理
- [ ] ユーザーデータの暗号化
- [ ] XSS攻撃対策
- [ ] CSRF攻撃対策

### API セキュリティ

- [ ] Firebase Security Rulesの適切な設定
- [ ] APIキーの適切な管理
- [ ] レート制限の実装

## ブラウザ互換性

### デスクトップ

- [ ] Chrome (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)
- [ ] Edge (最新版)

### モバイル

- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Samsung Internet

## PWA機能

### インストール

- [ ] PWAインストール機能が動作
- [ ] マニフェストファイルが適切
- [ ] アイコンが正しく表示

### オフライン機能

- [ ] Service Workerが正常に動作
- [ ] オフライン時の基本機能利用可能
- [ ] オンライン復旧時の同期動作

### プッシュ通知

- [ ] 通知の許可要求が適切
- [ ] 通知の表示が正常
- [ ] 通知からのアプリ起動が動作

## デプロイメント

### ビルド

- [ ] プロダクションビルドが成功
- [ ] バンドルサイズが適切
- [ ] ソースマップが生成される

### 環境設定

- [ ] 環境変数が適切に設定
- [ ] Firebase設定が正しい
- [ ] API設定が正しい

### 監視・ログ

- [ ] エラー監視が動作
- [ ] パフォーマンス監視が動作
- [ ] ログレベルが適切
```

## 完成チェックリスト

### パフォーマンス最適化

- [ ] Core Web Vitals が基準値内
- [ ] バンドルサイズが最適化されている
- [ ] 画像最適化が実装されている
- [ ] メモリ使用量が適切

### PWA機能

- [ ] Service Workerが正常に動作
- [ ] オフライン機能が実装されている
- [ ] アプリインストール機能が動作
- [ ] マニフェストファイルが適切

### 監視・エラー処理

- [ ] エラー境界が適切に実装されている
- [ ] パフォーマンス監視が動作している
- [ ] エラーレポーティングが実装されている

### 品質保証

- [ ] 全ての機能テストが完了
- [ ] パフォーマンステストが完了
- [ ] アクセシビリティテストが完了
- [ ] セキュリティテストが完了

### デプロイメント準備

- [ ] プロダクションビルドが正常
- [ ] 環境設定が完了
- [ ] CDN設定が適切
- [ ] ドメイン設定が完了

## デプロイメント

VoyageSketchの再構築が完了しました！主要な改善点：

### 1. メモ機能の同期問題解決

- **状態の完全分離**: UI状態とクラウド状態を明確に分離
- **操作ベースの同期**: タイムスタンプではなく操作IDで自己更新を判定
- **デバウンス最適化**: UI応答性を保ちながら効率的な同期を実現

### 2. アーキテクチャの改善

- **クリーンアーキテクチャ**: 責任の明確な分離
- **依存性注入**: テスタブルで拡張しやすい設計
- **型安全性**: TypeScriptによる堅牢な型定義

### 3. パフォーマンス最適化

- **バンドル分割**: 効率的なコード分割
- **画像最適化**: 自動的な画像圧縮・リサイズ
- **メモリ監視**: リアルタイムなメモリ使用量監視

### 4. 本番品質の機能

- **PWA対応**: オフライン機能とアプリインストール
- **エラー監視**: 包括的なエラー処理と報告
- **パフォーマンス監視**: Core Web Vitalsの継続監視

この再構築により、VoyageSketchは保守性が高く、スケーラブルで、ユーザーエクスペリエンスに優れたアプリケーションとして生まれ変わりました。特にメモ機能の同期問題は完全に解決され、安定したリアルタイム共同編集が実現できます。

---

**重要**: 段階的な実装とテストを行い、各フェーズで品質を確認してから次に進むことで、安定したアプリケーションを構築できます。
