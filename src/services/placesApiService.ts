/**
 * PlacesApiService
 * Google Places API を一元管理するサービスクラス
 *
 * 機能:
 * - AutocompleteService ラッパー（検索候補取得）
 * - PlacesService ラッパー（詳細情報取得、Nearby Search）
 * - セッション管理（課金最適化）
 * - キャッシュ機能（重複取得防止）
 */

// シングルトンインスタンス
let instance: PlacesApiService | null = null;

/**
 * PlacesApiService のインスタンスを取得
 * @param map 初回は google.maps.Map が必要
 * @returns PlacesApiService インスタンス
 * @throws Error 初期化されていない場合
 */
export function getPlacesApiService(map?: google.maps.Map): PlacesApiService {
  if (!instance && map) {
    instance = new PlacesApiService(map);
  }
  if (!instance) {
    throw new Error("PlacesApiService not initialized");
  }
  return instance;
}

/**
 * PlacesApiService の初期化（アプリ起動時に一度呼び出す）
 * @param map google.maps.Map インスタンス
 */
export function initializePlacesApiService(map: google.maps.Map): void {
  if (!instance) {
    instance = new PlacesApiService(map);
  }
}

// === フィールド定数 ===

/**
 * 検索候補表示用の詳細フィールド
 * 軽量な情報のみ取得してパフォーマンスを最適化
 */
const SUGGESTION_DETAIL_FIELDS = [
  "place_id",
  "name",
  "photos",
  "rating",
  "user_ratings_total",
] as const;

/**
 * 完全な詳細情報取得用のフィールド
 * 場所詳細ページで使用
 */
const FULL_DETAIL_FIELDS = [
  "place_id",
  "name",
  "geometry",
  "formatted_address",
  "rating",
  "user_ratings_total",
  "photos",
  "website",
  "types",
  "opening_hours",
  "price_level",
] as const;

/**
 * スポット一覧表示用のフィールド
 * Nearby Search 結果の詳細取得に使用
 */
const SPOT_DETAIL_FIELDS = [
  "place_id",
  "name",
  "geometry",
  "formatted_address",
  "rating",
  "user_ratings_total",
  "photos",
  "types",
] as const;

/**
 * キャッシュエントリの型
 */
interface CacheEntry {
  data: google.maps.places.PlaceResult;
  timestamp: number;
}

/**
 * Google Places API を一元管理するサービスクラス
 */
class PlacesApiService {
  private autocompleteService: google.maps.places.AutocompleteService;
  private placesService: google.maps.places.PlacesService;
  private sessionToken: google.maps.places.AutocompleteSessionToken | null =
    null;
  private detailsCache: Map<string, CacheEntry> = new Map();
  private lastPagination: google.maps.places.PlaceSearchPagination | null =
    null;

  /** キャッシュの有効期間（5分） */
  private readonly CACHE_TTL = 5 * 60 * 1000;
  /** キャッシュの最大エントリ数 */
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * PlacesApiService コンストラクタ
   * @param map google.maps.Map インスタンス
   */
  constructor(map: google.maps.Map) {
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.placesService = new google.maps.places.PlacesService(map);
  }

  // === セッション管理 ===

  /**
   * 新しい Autocomplete セッションを開始
   * 同一セッション内の Autocomplete リクエストと getDetails は
   * 1つのセッションとして課金される
   */
  startNewSession(): void {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  /**
   * 現在のセッションを終了
   */
  endSession(): void {
    this.sessionToken = null;
  }

  // === Autocomplete ===

  /**
   * 入力文字列に基づく場所の予測候補を取得
   * @param input 検索文字列
   * @param options オプション（types, componentRestrictions, locationBias）
   * @returns 予測候補の配列
   */
  async getPredictions(
    input: string,
    options?: {
      types?: string[];
      componentRestrictions?: { country: string };
      locationBias?: google.maps.LatLngBoundsLiteral;
    },
  ): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!input.trim()) return [];

    return new Promise((resolve, reject) => {
      this.autocompleteService.getPlacePredictions(
        {
          input,
          sessionToken: this.sessionToken ?? undefined,
          types: options?.types,
          componentRestrictions: options?.componentRestrictions,
          locationBias: options?.locationBias,
        },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            resolve(predictions);
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            reject(new Error(`Autocomplete failed: ${status}`));
          }
        },
      );
    });
  }

  // === Place Details ===

  /**
   * 検索候補用の軽量な詳細情報を取得
   * キャッシュを使用して重複リクエストを防止
   * @param placeId 場所のID
   * @returns PlaceResult または null
   */
  async getDetailsForSuggestion(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    // キャッシュチェック
    const cached = this.detailsCache.get(placeId);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: [...SUGGESTION_DETAIL_FIELDS],
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            this.setCache(placeId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  /**
   * 完全な詳細情報を取得
   * セッショントークンを使用して課金を最適化
   * 取得後にセッションは自動的に終了
   * @param placeId 場所のID
   * @returns PlaceResult または null
   */
  async getFullDetails(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: [...FULL_DETAIL_FIELDS],
          sessionToken: this.sessionToken ?? undefined,
        },
        (result, status) => {
          // セッション終了
          this.endSession();

          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            this.setCache(placeId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  /**
   * スポット用の詳細情報を取得
   * @param placeId 場所のID
   * @returns PlaceResult または null
   */
  async getSpotDetails(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    // キャッシュチェック
    const cached = this.detailsCache.get(placeId);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: [...SPOT_DETAIL_FIELDS],
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            this.setCache(placeId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  // === Nearby Search ===

  /**
   * 指定位置周辺のスポットを検索
   * @param location 中心位置
   * @param options オプション（radius, type, keyword）
   * @returns PlaceResult の配列とページネーション情報
   */
  async searchNearbySpots(
    location: { lat: number; lng: number },
    options?: {
      radius?: number;
      type?: string;
      keyword?: string;
    },
  ): Promise<{
    results: google.maps.places.PlaceResult[];
    pagination: google.maps.places.PlaceSearchPagination | null;
  }> {
    const radius = options?.radius ?? 15000;
    const type = options?.type ?? "tourist_attraction";

    return new Promise((resolve, reject) => {
      this.placesService.nearbySearch(
        {
          location: new google.maps.LatLng(location.lat, location.lng),
          radius,
          type,
          keyword: options?.keyword,
        },
        (results, status, pagination) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // 結果をキャッシュ
            results.forEach((r) => {
              if (r.place_id) {
                this.setCache(r.place_id, r);
              }
            });

            this.lastPagination = pagination ?? null;
            resolve({ results, pagination: pagination ?? null });
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve({ results: [], pagination: null });
          } else {
            reject(new Error(`Nearby search failed: ${status}`));
          }
        },
      );
    });
  }

  /**
   * 追加のスポットを読み込む（ページネーション）
   * @param pagination ページネーションオブジェクト
   * @returns PlaceResult の配列とページネーション情報
   */
  async loadMoreSpots(
    pagination: google.maps.places.PlaceSearchPagination,
  ): Promise<{
    results: google.maps.places.PlaceResult[];
    pagination: google.maps.places.PlaceSearchPagination | null;
  }> {
    if (!pagination.hasNextPage) {
      return { results: [], pagination: null };
    }

    return new Promise((resolve, reject) => {
      // Google Places API の nextPage は元のコールバックを再利用するが、
      // Promise ベースのラッパーでは型アサーションが必要
      type NextPageCallback = (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus,
        pagination: google.maps.places.PlaceSearchPagination | null,
      ) => void;

      const nextPageWithCallback = pagination.nextPage as unknown as (
        callback: NextPageCallback,
      ) => void;

      nextPageWithCallback(
        (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatus,
          newPagination: google.maps.places.PlaceSearchPagination | null,
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // 結果をキャッシュ
            results.forEach((r) => {
              if (r.place_id) {
                this.setCache(r.place_id, r);
              }
            });

            this.lastPagination = newPagination ?? null;
            resolve({ results, pagination: newPagination ?? null });
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve({ results: [], pagination: null });
          } else {
            reject(new Error(`Load more failed: ${status}`));
          }
        },
      );
    });
  }

  /**
   * ページネーションが利用可能かどうか
   * @returns true: 次のページあり
   */
  hasMoreSpots(): boolean {
    return this.lastPagination?.hasNextPage ?? false;
  }

  // === Text Search（フォールバック用） ===

  /**
   * テキストベースの場所検索
   * Autocomplete で結果が得られない場合のフォールバック用
   * @param query 検索クエリ
   * @param options オプション（location, radius）
   * @returns PlaceResult の配列
   */
  async textSearch(
    query: string,
    options?: {
      location?: google.maps.LatLngLiteral;
      radius?: number;
    },
  ): Promise<google.maps.places.PlaceResult[]> {
    return new Promise((resolve, reject) => {
      this.placesService.textSearch(
        {
          query,
          location: options?.location,
          radius: options?.radius,
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            reject(new Error(`Text search failed: ${status}`));
          }
        },
      );
    });
  }

  // === キャッシュ管理 ===

  /**
   * キャッシュエントリが期限切れかどうかを判定
   * @param timestamp エントリのタイムスタンプ
   * @returns true: 期限切れ
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL;
  }

  /**
   * キャッシュにエントリを追加
   * @param placeId 場所のID
   * @param data PlaceResult データ
   */
  private setCache(
    placeId: string,
    data: google.maps.places.PlaceResult,
  ): void {
    this.pruneCache();
    this.detailsCache.set(placeId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * キャッシュサイズを制限内に保つ
   * 最大サイズに達した場合、古いエントリを半分削除
   */
  private pruneCache(): void {
    if (this.detailsCache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.detailsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 2));
      toRemove.forEach(([key]) => this.detailsCache.delete(key));
    }
  }

  // === ユーティリティ ===

  /**
   * 写真のURLを取得
   * @param photo PlacePhoto オブジェクト
   * @param maxWidth 最大幅（デフォルト: 100）
   * @returns 写真のURL
   */
  getPhotoUrl(
    photo: google.maps.places.PlacePhoto,
    maxWidth: number = 100,
  ): string {
    return photo.getUrl({ maxWidth });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.detailsCache.clear();
  }

  /**
   * キャッシュの統計情報を取得（デバッグ用）
   * @returns キャッシュサイズと有効エントリ数
   */
  getCacheStats(): { size: number; validEntries: number } {
    let validEntries = 0;
    this.detailsCache.forEach((entry) => {
      if (!this.isExpired(entry.timestamp)) {
        validEntries++;
      }
    });
    return {
      size: this.detailsCache.size,
      validEntries,
    };
  }
}

export { PlacesApiService };

// フィールド定数もエクスポート（テストやカスタマイズ用）
export { SUGGESTION_DETAIL_FIELDS, FULL_DETAIL_FIELDS, SPOT_DETAIL_FIELDS };
