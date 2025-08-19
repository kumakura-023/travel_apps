import { TravelMode } from "../store/travelTimeStore";
import {
  IDirectionsService,
  RouteRequest,
  RouteResult,
} from "../interfaces/IDirectionsService";
import { AppError, ErrorCode } from "../errors";

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface TravelTimeResponse {
  durationMinutes: number;
  path: google.maps.LatLngLiteral[];
}

interface DirectionsRequest {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  travelMode: google.maps.TravelMode;
}

interface DirectionsResult {
  duration: number; // seconds
  distance: number; // meters
  route: google.maps.DirectionsResult;
  durationText: string;
  distanceText: string;
}

interface CacheEntry {
  result: DirectionsResult;
  timestamp: number;
}

class DirectionsService implements IDirectionsService {
  private directionsService: google.maps.DirectionsService | null = null;
  private cache = new Map<string, CacheEntry>();
  private requestQueue: Array<{
    request: DirectionsRequest;
    resolve: (result: DirectionsResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分
  private readonly BATCH_SIZE = 25;
  private readonly REQUEST_DELAY = 100; // ms between requests

  constructor() {
    // Google Maps APIが読み込まれてから初期化
  }

  /**
   * DirectionsServiceの遅延初期化
   */
  private getDirectionsService(): google.maps.DirectionsService {
    if (!this.directionsService) {
      if (
        typeof google === "undefined" ||
        !google.maps ||
        !google.maps.DirectionsService
      ) {
        throw new Error("Google Maps API is not loaded yet");
      }
      this.directionsService = new google.maps.DirectionsService();
    }
    return this.directionsService;
  }

  /**
   * 2地点間のルートを取得
   */
  async getRoute(
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<DirectionsResult> {
    const request: DirectionsRequest = { origin, destination, travelMode };
    const cacheKey = this.getCacheKey(request);

    // キャッシュチェック
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // リクエストをキューに追加
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 複数地点のバッチ処理
   */
  async getBatchRoutes(
    requests: DirectionsRequest[],
  ): Promise<(DirectionsResult | Error)[]> {
    const results: (DirectionsResult | Error)[] = [];

    // バッチサイズごとに分割
    for (let i = 0; i < requests.length; i += this.BATCH_SIZE) {
      const batch = requests.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(async (request) => {
        try {
          return await this.getRoute(
            request.origin,
            request.destination,
            request.travelMode,
          );
        } catch (error) {
          return error as Error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push(new Error(result.reason));
        }
      });

      // バッチ間の遅延
      if (i + this.BATCH_SIZE < requests.length) {
        await this.delay(this.REQUEST_DELAY * 10);
      }
    }

    return results;
  }

  /**
   * 地点から他のすべての地点への移動時間を取得
   */
  async getRoutesToAllPlaces(
    origin: google.maps.LatLngLiteral,
    destinations: google.maps.LatLngLiteral[],
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<(DirectionsResult | Error)[]> {
    const requests: DirectionsRequest[] = destinations.map((destination) => ({
      origin,
      destination,
      travelMode,
    }));

    return this.getBatchRoutes(requests);
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift()!;

      try {
        const result = await this.makeDirectionsRequest(request);
        resolve(result);
      } catch (error) {
        reject(error as Error);
      }

      // リクエスト間の遅延
      if (this.requestQueue.length > 0) {
        await this.delay(this.REQUEST_DELAY);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 実際のDirections APIリクエスト
   */
  private async makeDirectionsRequest(
    request: DirectionsRequest,
  ): Promise<DirectionsResult> {
    // 開発用モックレスポンス（API設定完了後は削除）
    if (false && import.meta.env.DEV) {
      const mockDirectionsResult = {
        request: {
          origin: new google.maps.LatLng(
            request.origin.lat,
            request.origin.lng,
          ),
          destination: new google.maps.LatLng(
            request.destination.lat,
            request.destination.lng,
          ),
          travelMode: request.travelMode,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        routes: [
          {
            legs: [
              {
                duration: { value: 1800, text: "30分" },
                distance: { value: 5000, text: "5.0 km" },
                start_location: new google.maps.LatLng(
                  request.origin.lat,
                  request.origin.lng,
                ),
                end_location: new google.maps.LatLng(
                  request.destination.lat,
                  request.destination.lng,
                ),
                steps: [],
              },
            ],
            overview_path: [
              new google.maps.LatLng(request.origin.lat, request.origin.lng),
              new google.maps.LatLng(
                request.destination.lat,
                request.destination.lng,
              ),
            ],
            bounds: new google.maps.LatLngBounds(
              new google.maps.LatLng(
                Math.min(request.origin.lat, request.destination.lat),
                Math.min(request.origin.lng, request.destination.lng),
              ),
              new google.maps.LatLng(
                Math.max(request.origin.lat, request.destination.lat),
                Math.max(request.origin.lng, request.destination.lng),
              ),
            ),
          },
        ],
      } as unknown as google.maps.DirectionsResult;

      const mockResult: DirectionsResult = {
        duration: 1800, // 30分
        distance: 5000, // 5km
        durationText: "30分",
        distanceText: "5.0 km",
        route: mockDirectionsResult,
      };

      // キャッシュに保存
      const cacheKey = this.getCacheKey(request);
      this.cache.set(cacheKey, {
        result: mockResult,
        timestamp: Date.now(),
      });

      return Promise.resolve(mockResult);
    }

    return new Promise((resolve, reject) => {
      try {
        const service = this.getDirectionsService();

        // Directionsリクエストの設定（TRANSIT最適化）
        const requestOptions: google.maps.DirectionsRequest = {
          origin: request.origin,
          destination: request.destination,
          travelMode: request.travelMode,
          unitSystem: google.maps.UnitSystem.METRIC,
          region: "JP", // 日本地域を明示的に指定（LoadScriptと統一）
          language: "ja", // 日本語を明示的に指定
        };

        service.route(requestOptions, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const leg = route.legs[0];

            const directionsResult: DirectionsResult = {
              duration: leg.duration?.value || 0,
              distance: leg.distance?.value || 0,
              route: result,
              durationText: leg.duration?.text || "",
              distanceText: leg.distance?.text || "",
            };

            // キャッシュに保存
            const cacheKey = this.getCacheKey(request);
            this.cache.set(cacheKey, {
              result: directionsResult,
              timestamp: Date.now(),
            });

            resolve(directionsResult);
          } else {
            const appError = this.createDirectionsError(
              status,
              request.travelMode,
            );
            reject(appError);
          }
        });
      } catch (error) {
        reject(AppError.fromError(error, ErrorCode.DIRECTIONS_API_ERROR));
      }
    });
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(request: DirectionsRequest): string {
    const originKey = `${request.origin.lat.toFixed(6)},${request.origin.lng.toFixed(6)}`;
    const destKey = `${request.destination.lat.toFixed(6)},${request.destination.lng.toFixed(6)}`;
    return `${originKey}-${destKey}-${request.travelMode}`;
  }

  /**
   * キャッシュから結果を取得
   */
  private getCachedResult(cacheKey: string): DirectionsResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * Directions APIのエラーをAppErrorに変換
   */
  private createDirectionsError(
    status: google.maps.DirectionsStatus,
    travelMode?: google.maps.TravelMode,
  ): AppError {
    // 日本での公共交通機関専用エラー
    if (
      status === google.maps.DirectionsStatus.ZERO_RESULTS &&
      travelMode === google.maps.TravelMode.TRANSIT
    ) {
      return new AppError(
        ErrorCode.DIRECTIONS_API_ERROR,
        "日本の公共交通機関データは現在利用できません。自動的に徒歩ルートで検索します。",
        {
          details: {
            status,
            travelMode,
            reason:
              "Google Directions APIは日本の詳細な電車・地下鉄データを提供していません",
          },
        },
      );
    }

    // ステータスコードに応じたエラーを作成
    const { code, message } = this.getErrorCodeAndMessage(status);
    return new AppError(code, message, {
      details: { status, travelMode },
    });
  }

  /**
   * DirectionsStatusからエラーコードとメッセージを取得
   */
  private getErrorCodeAndMessage(status: google.maps.DirectionsStatus): {
    code: ErrorCode;
    message: string;
  } {
    switch (status) {
      case google.maps.DirectionsStatus.NOT_FOUND:
        return {
          code: ErrorCode.NOT_FOUND,
          message:
            "ルートが見つかりませんでした。異なる移動手段でお試しください。",
        };
      case google.maps.DirectionsStatus.ZERO_RESULTS:
        return {
          code: ErrorCode.NOT_FOUND,
          message:
            "指定された地点間にルートがありません。別の移動手段を試してください。",
        };
      case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
        return {
          code: ErrorCode.VALIDATION_ERROR,
          message: "経由地点が多すぎます",
        };
      case google.maps.DirectionsStatus.INVALID_REQUEST:
        return {
          code: ErrorCode.INVALID_INPUT,
          message: "無効なリクエストです。地点を再設定してください。",
        };
      case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        return {
          code: ErrorCode.SYNC_RATE_LIMIT,
          message: "クエリ制限を超過しました。しばらく待ってからお試しください",
        };
      case google.maps.DirectionsStatus.REQUEST_DENIED:
        return {
          code: ErrorCode.PERMISSION_DENIED,
          message: "リクエストが拒否されました。API設定を確認してください。",
        };
      case google.maps.DirectionsStatus.UNKNOWN_ERROR:
        return {
          code: ErrorCode.UNKNOWN_ERROR,
          message: "サーバーエラーが発生しました。再度お試しください",
        };
      default:
        return {
          code: ErrorCode.DIRECTIONS_API_ERROR,
          message: `Directionsリクエストエラー: ${status}`,
        };
    }
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // IDirectionsService インターフェースの実装
  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    const directionsResult = await this.getRoute(
      request.origin,
      request.destination,
      request.travelMode,
    );

    return {
      duration: directionsResult.duration,
      distance: directionsResult.distance,
      durationText: directionsResult.durationText,
      distanceText: directionsResult.distanceText,
      route: directionsResult.route,
      path:
        directionsResult.route.routes[0]?.overview_path.map((p) => ({
          lat: p.lat(),
          lng: p.lng(),
        })) || [],
    };
  }

  async calculateBatchRoutes(requests: RouteRequest[]): Promise<RouteResult[]> {
    const results: RouteResult[] = [];

    // バッチ処理
    for (let i = 0; i < requests.length; i += this.BATCH_SIZE) {
      const batch = requests.slice(i, i + this.BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((request) => this.calculateRoute(request)),
      );
      results.push(...batchResults);

      // 次のバッチの前に遅延
      if (i + this.BATCH_SIZE < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, this.REQUEST_DELAY));
      }
    }

    return results;
  }

  /**
   * キャッシュをクリア（clearCache重複定義の修正）
   */
  clearDirectionsCache(): void {
    this.cache.clear();
  }

  async calculateTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: google.maps.TravelMode,
  ): Promise<number> {
    const result = await this.getRoute(origin, destination, travelMode);
    return Math.round(result.duration / 60); // 分単位で返す
  }

  async calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: google.maps.TravelMode,
  ): Promise<number> {
    const result = await this.getRoute(origin, destination, travelMode);
    return result.distance;
  }

  async calculateOptimizedRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: Array<{ lat: number; lng: number }>,
    travelMode: google.maps.TravelMode,
  ): Promise<RouteResult> {
    const service = this.getDirectionsService();

    return new Promise((resolve, reject) => {
      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        waypoints: waypoints.map((point) => ({
          location: point,
          stopover: true,
        })),
        optimizeWaypoints: true,
        travelMode,
        unitSystem: google.maps.UnitSystem.METRIC,
        region: "JP",
        language: "ja",
      };

      service.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          let totalDuration = 0;
          let totalDistance = 0;

          route.legs.forEach((leg) => {
            totalDuration += leg.duration?.value || 0;
            totalDistance += leg.distance?.value || 0;
          });

          resolve({
            duration: totalDuration,
            distance: totalDistance,
            durationText: `${Math.round(totalDuration / 60)}分`,
            distanceText: `${(totalDistance / 1000).toFixed(1)} km`,
            route: result,
            path: route.overview_path.map((p) => ({
              lat: p.lat(),
              lng: p.lng(),
            })),
          });
        } else {
          reject(this.createDirectionsError(status, travelMode));
        }
      });
    });
  }
}

// シングルトンインスタンス
export const directionsService = new DirectionsService();

// 型エクスポート
export type { DirectionsRequest, DirectionsResult };

// 後方互換性のための関数（既存コードで使用されている場合）
export async function fetchTravelTime(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  mode: TravelMode = "WALKING",
): Promise<TravelTimeResponse> {
  try {
    const result = await directionsService.getRoute(
      origin,
      destination,
      mode as google.maps.TravelMode,
    );

    return {
      durationMinutes: result.duration / 60,
      path: result.route.routes[0].overview_path.map((p) => ({
        lat: p.lat(),
        lng: p.lng(),
      })),
    };
  } catch (error) {
    throw new Error(`Failed to calculate travel time: ${error}`);
  }
}

/**
 * Fetch travel times for up to 25 destinations in parallel (browser limit).
 */
export async function fetchTravelTimesBatch(
  origin: LatLngLiteral,
  destinations: LatLngLiteral[],
  mode: TravelMode,
): Promise<TravelTimeResponse[]> {
  try {
    const results = await directionsService.getRoutesToAllPlaces(
      origin,
      destinations,
      mode as google.maps.TravelMode,
    );

    return results.map((result) => {
      if (result instanceof Error) {
        throw result;
      }
      return {
        durationMinutes: result.duration / 60,
        path: result.route.routes[0].overview_path.map((p) => ({
          lat: p.lat(),
          lng: p.lng(),
        })),
      };
    });
  } catch (error) {
    throw new Error(`Failed to calculate travel times: ${error}`);
  }
}
