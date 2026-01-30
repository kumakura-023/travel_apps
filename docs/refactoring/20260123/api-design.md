# Google Places API 利用設計書

## 1. 概要

本ドキュメントでは、検索機能強化で使用するGoogle Places APIの利用設計を定義する。

### 1.1 使用するAPI

| API                  | 用途               | 課金           |
| -------------------- | ------------------ | -------------- |
| Autocomplete Service | サジェスト候補取得 | セッション単位 |
| Place Details        | 場所の詳細情報取得 | リクエスト単位 |
| Nearby Search        | 地域内スポット検索 | リクエスト単位 |
| Text Search          | テキストベース検索 | リクエスト単位 |

### 1.2 課金最適化方針

| 方針                   | 詳細                                            |
| ---------------------- | ----------------------------------------------- |
| セッショントークン活用 | Autocomplete → Details の流れでセッション課金に |
| Details取得制限        | サジェスト上位3件のみ                           |
| フィールド指定         | 必要なフィールドのみ取得                        |
| キャッシュ活用         | 同一place_idの再取得を防止                      |
| debounce               | 入力から300ms待機                               |

---

## 2. AutocompleteService

### 2.1 用途

検索入力に対するサジェスト候補の取得。

### 2.2 実装

```typescript
// src/services/placesApiService.ts

class PlacesApiService {
  private autocompleteService: google.maps.places.AutocompleteService;
  private sessionToken: google.maps.places.AutocompleteSessionToken | null =
    null;

  constructor() {
    this.autocompleteService = new google.maps.places.AutocompleteService();
  }

  /**
   * 新しいセッションを開始
   * - ユーザーが検索を開始するたびに呼び出す
   */
  startNewSession(): void {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  /**
   * サジェスト候補を取得
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

  /**
   * セッションを終了（Details取得時に自動終了）
   */
  endSession(): void {
    this.sessionToken = null;
  }
}
```

### 2.3 リクエストパラメータ

| パラメータ              | 値                       | 説明                         |
| ----------------------- | ------------------------ | ---------------------------- |
| `input`                 | ユーザー入力             | 検索クエリ                   |
| `sessionToken`          | AutocompleteSessionToken | 課金最適化用                 |
| `componentRestrictions` | `{ country: 'jp' }`      | 日本に限定（オプション）     |
| `locationBias`          | 現在の地図表示範囲       | 表示エリア優先（オプション） |

### 2.4 レスポンス

```typescript
interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string; // "東京タワー"
    main_text_matched_substrings: Array<{ offset: number; length: number }>;
    secondary_text: string; // "東京都港区芝公園4丁目2−8"
  };
  types: string[];
  // ...
}
```

### 2.5 エラーハンドリング

| ステータス         | 対応                   |
| ------------------ | ---------------------- |
| `OK`               | 正常処理               |
| `ZERO_RESULTS`     | 空配列を返す           |
| `OVER_QUERY_LIMIT` | リトライ後、エラー通知 |
| `REQUEST_DENIED`   | APIキー確認を促す      |
| `INVALID_REQUEST`  | 入力検証エラー         |

---

## 3. Place Details

### 3.1 用途

1. サジェスト上位3件のリッチ情報取得（写真・評価）
2. 候補選択時の完全情報取得

### 3.2 実装

```typescript
// src/services/placesApiService.ts

class PlacesApiService {
  private placesService: google.maps.places.PlacesService;
  private detailsCache: Map<string, google.maps.places.PlaceResult> = new Map();

  constructor(map: google.maps.Map) {
    this.placesService = new google.maps.places.PlacesService(map);
  }

  /**
   * サジェスト用の簡易詳細取得（上位3件向け）
   * - 写真・評価のみ取得
   * - キャッシュを活用
   */
  async getDetailsForSuggestion(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    // キャッシュチェック
    if (this.detailsCache.has(placeId)) {
      return this.detailsCache.get(placeId)!;
    }

    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: SUGGESTION_DETAIL_FIELDS,
          sessionToken: this.sessionToken ?? undefined,
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            this.detailsCache.set(placeId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  /**
   * 選択時の完全詳細取得
   * - セッショントークンを消費して終了
   */
  async getFullDetails(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: FULL_DETAIL_FIELDS,
          sessionToken: this.sessionToken ?? undefined,
        },
        (result, status) => {
          // セッション終了
          this.endSession();

          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            this.detailsCache.set(placeId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        },
      );
    });
  }
}
```

### 3.3 フィールド定義

```typescript
// src/services/placesApiService.ts

/**
 * サジェスト表示用（課金を最小化）
 */
const SUGGESTION_DETAIL_FIELDS = [
  "place_id",
  "name",
  "photos", // サムネイル用
  "rating", // 星評価
  "user_ratings_total", // レビュー件数
] as const;

/**
 * 選択時の完全情報
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
 * 地域スポット用
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
```

### 3.4 課金への影響

| 取得パターン | フィールド数 | 課金カテゴリ                 |
| ------------ | ------------ | ---------------------------- |
| サジェスト用 | 5            | Basic + Contact              |
| 完全情報     | 10           | Basic + Contact + Atmosphere |
| スポット用   | 8            | Basic + Contact              |

**推奨**: フィールドは必要最小限に。`reviews` は課金が高いため除外。

---

## 4. Nearby Search

### 4.1 用途

選択した市区町村周辺の観光スポット検索。

### 4.2 実装

```typescript
// src/services/placesApiService.ts

class PlacesApiService {
  /**
   * 地域内スポット検索
   */
  async searchNearbySpots(
    location: google.maps.LatLngLiteral,
    options?: {
      radius?: number;
      type?: string;
      keyword?: string;
    },
  ): Promise<google.maps.places.PlaceResult[]> {
    const radius = options?.radius ?? 15000; // デフォルト15km
    const type = options?.type ?? "tourist_attraction";

    return new Promise((resolve, reject) => {
      this.placesService.nearbySearch(
        {
          location,
          radius,
          type,
          keyword: options?.keyword,
          rankBy: google.maps.places.RankBy.PROMINENCE,
        },
        (results, status, pagination) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // 結果をキャッシュ
            results.forEach((r) => {
              if (r.place_id) {
                this.detailsCache.set(r.place_id, r);
              }
            });

            // paginationは保持して後でLoad More用に使用可能
            this.lastPagination = pagination;

            resolve(results);
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            reject(new Error(`Nearby search failed: ${status}`));
          }
        },
      );
    });
  }

  /**
   * 追加結果取得（Load More）
   */
  async loadMoreSpots(): Promise<google.maps.places.PlaceResult[]> {
    if (!this.lastPagination?.hasNextPage) {
      return [];
    }

    return new Promise((resolve) => {
      this.lastPagination!.nextPage();
      // nextPage() は内部的にコールバックを再実行
      // 実際の実装ではイベントベースで結果を受け取る
    });
  }
}
```

### 4.3 リクエストパラメータ

| パラメータ | 値                   | 説明                 |
| ---------- | -------------------- | -------------------- |
| `location` | `{ lat, lng }`       | 市区町村の中心座標   |
| `radius`   | `15000`              | 検索半径（メートル） |
| `type`     | `tourist_attraction` | 場所タイプ           |
| `rankBy`   | `PROMINENCE`         | 重要度順             |

### 4.4 タイプ別検索

```typescript
// カテゴリとGoogle Places typeのマッピング
const CATEGORY_TYPE_MAP: Record<string, string> = {
  tourist_attraction: "tourist_attraction",
  restaurant: "restaurant",
  shopping: "shopping_mall",
  lodging: "lodging",
};
```

### 4.5 レスポンス

Nearby Search のレスポンスには以下が含まれる：

```typescript
interface PlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: LatLng;
  };
  photos?: PlacePhoto[];
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  vicinity?: string; // 簡易住所
  // ...
}
```

**注意**: Nearby Search の結果には `formatted_address` が含まれない。必要な場合は Details API で取得。

---

## 5. Text Search（代替手段）

### 5.1 用途

Nearby Search で適切な結果が得られない場合の代替。

### 5.2 実装

```typescript
// src/services/placesApiService.ts

class PlacesApiService {
  /**
   * テキストベース検索
   * - 「京都市 観光」のようなクエリで検索
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
}
```

### 5.3 Nearby Search との使い分け

| 条件             | 使用API                  |
| ---------------- | ------------------------ |
| 地域座標が明確   | Nearby Search            |
| 曖昧な地域名     | Text Search              |
| カテゴリ絞り込み | Nearby Search (type指定) |
| フリーワード検索 | Text Search              |

---

## 6. セッション管理

### 6.1 セッショントークンの流れ

```
[ユーザーが検索開始]
     ↓
[startNewSession() - トークン生成]
     ↓
[getPredictions() × N回 - 同一トークン使用]
     ↓
[ユーザーが候補選択]
     ↓
[getFullDetails() - トークン消費]
     ↓
[セッション終了]
```

### 6.2 セッション課金の仕組み

- Autocomplete + Details をセッションでまとめると、個別より安い
- セッション内で何回 Autocomplete を呼んでも追加課金なし
- Details 取得時にセッションが終了・課金

### 6.3 注意点

| 状況                         | 対応                           |
| ---------------------------- | ------------------------------ |
| ユーザーが候補を選択せず離脱 | セッション未消費（課金なし）   |
| 同一セッションで複数Details  | 最初のDetailsでセッション終了  |
| リッチサジェスト用Details    | セッション外で取得（個別課金） |

**設計判断**: リッチサジェスト用の上位3件 Details は、セッションとは別に取得する。これは課金が発生するが、UX向上のためのトレードオフ。

---

## 7. キャッシュ戦略

### 7.1 キャッシュ対象

| 対象               | キー                    | TTL              |
| ------------------ | ----------------------- | ---------------- |
| Place Details      | place_id                | セッション中     |
| Nearby Search 結果 | `${lat}_${lng}_${type}` | 5分              |
| 地域マスタ         | -                       | 永続（静的JSON） |

### 7.2 実装

```typescript
// src/services/placesApiService.ts

class PlacesApiService {
  private detailsCache: Map<
    string,
    {
      data: google.maps.places.PlaceResult;
      timestamp: number;
    }
  > = new Map();

  private nearbyCache: Map<
    string,
    {
      data: google.maps.places.PlaceResult[];
      timestamp: number;
    }
  > = new Map();

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  private getCacheKey(
    location: google.maps.LatLngLiteral,
    type: string,
  ): string {
    return `${location.lat.toFixed(4)}_${location.lng.toFixed(4)}_${type}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL;
  }
}
```

---

## 8. エラーハンドリング

### 8.1 エラーコード対応

```typescript
// src/services/placesApiService.ts

const handlePlacesError = (
  status: google.maps.places.PlacesServiceStatus,
  operation: string,
): void => {
  switch (status) {
    case google.maps.places.PlacesServiceStatus.ZERO_RESULTS:
      // 正常系 - 結果なし
      console.log(`${operation}: No results found`);
      break;

    case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
      console.error(`${operation}: Query limit exceeded`);
      // ユーザーに通知
      toast.error("検索回数の上限に達しました。しばらくお待ちください。");
      break;

    case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
      console.error(`${operation}: Request denied - check API key`);
      // 開発者向けエラー
      break;

    case google.maps.places.PlacesServiceStatus.INVALID_REQUEST:
      console.error(`${operation}: Invalid request`);
      break;

    case google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR:
      console.error(`${operation}: Unknown error`);
      toast.error("検索中にエラーが発生しました。再試行してください。");
      break;

    default:
      console.error(`${operation}: Unexpected status: ${status}`);
  }
};
```

### 8.2 リトライ戦略

| エラー             | リトライ | 間隔            |
| ------------------ | -------- | --------------- |
| `OVER_QUERY_LIMIT` | 3回      | 1秒 → 2秒 → 4秒 |
| `UNKNOWN_ERROR`    | 2回      | 1秒             |
| その他             | なし     | -               |

---

## 9. パフォーマンス最適化

### 9.1 debounce

```typescript
// src/hooks/useAutocomplete.ts

import { useMemo } from "react";
import { debounce } from "lodash-es"; // または自前実装

export function useAutocomplete() {
  const debouncedFetch = useMemo(
    () =>
      debounce(
        (query: string) => {
          placesApiService.getPredictions(query);
        },
        300, // 300ms
      ),
    [],
  );

  // ...
}
```

### 9.2 並列 Details 取得

```typescript
// 上位3件の Details を並列取得
const fetchRichDetails = async (
  predictions: AutocompletePrediction[],
): Promise<void> => {
  const top3 = predictions.slice(0, 3);

  await Promise.all(
    top3.map(async (p) => {
      const detail = await placesApiService.getDetailsForSuggestion(p.place_id);
      if (detail) {
        suggestionStore.setRichDetail(p.place_id, detail);
      }
    }),
  );
};
```

### 9.3 写真URL最適化

```typescript
// 写真サイズを指定して取得（不必要に大きな画像を避ける）
const getPhotoUrl = (
  photo: google.maps.places.PlacePhoto,
  maxWidth: number = 100,
): string => {
  return photo.getUrl({ maxWidth });
};
```

---

## 10. 課金見積もり

### 10.1 想定利用シナリオ

| 操作             | API呼び出し   | 回数/セッション |
| ---------------- | ------------- | --------------- |
| 検索入力         | Autocomplete  | 5回             |
| リッチサジェスト | Place Details | 3回             |
| 候補選択         | Place Details | 1回             |
| 地域検索         | Nearby Search | 1回             |

### 10.2 月間コスト試算（1000セッション/月）

| API                       | 単価       | 回数 | コスト     |
| ------------------------- | ---------- | ---- | ---------- |
| Autocomplete (セッション) | $2.83/1000 | 1000 | $2.83      |
| Place Details (Basic)     | $5/1000    | 4000 | $20.00     |
| Nearby Search             | $32/1000   | 1000 | $32.00     |
| **合計**                  |            |      | **$54.83** |

**注意**: 実際の料金は Google Cloud Console で確認すること。

---

## 11. 将来の拡張

### 11.1 Places API (New) への移行

Google は Places API の新バージョンを提供開始。将来的な移行を考慮して、API呼び出しは `PlacesApiService` に集約。

### 11.2 追加可能な機能

| 機能         | 必要なAPI                       |
| ------------ | ------------------------------- |
| 営業時間表示 | Place Details (opening_hours)   |
| レビュー表示 | Place Details (reviews) ※高課金 |
| 経路表示     | Directions API                  |
| 混雑状況     | Place Details (現在非対応)      |
