# ルート計画と経路検索

## 概要

ルート計画機能は、保存した場所間の経路を計算し、移動時間や距離を表示します。Google Directions APIと統合され、複数の移動手段に対応しています。

## 主要コンポーネント

### 1. RouteSearchPanel

**場所**: `src/components/RouteSearchPanel.tsx`

**責任**:

- ルート検索UI
- 出発地と目的地の選択
- 検索結果の表示

**特徴**:

- ドラッグ可能なパネル
- 移動手段の選択（徒歩、車、公共交通機関）

### 2. RouteDisplay

**場所**: `src/components/RouteDisplay.tsx`

**責任**:

- ルートのポリライン表示
- 地図上への描画

### 3. RouteMarkers

**場所**: `src/components/RouteMarkers.tsx`

**責任**:

- ルート上のマーカー管理
- 始点・終点の表示

### 4. SafeRouteOverlay

**場所**: `src/components/SafeRouteOverlay.tsx`

**責任**:

- エラーハンドリング付きルート表示
- 安全な描画処理

**問題点**: RouteDisplayと機能が重複

## 移動時間機能

### 1. TravelTimeControls

**場所**: `src/components/TravelTimeControls.tsx`

**責任**:

- 移動時間モードの切り替えUI
- 基準場所の選択
- 移動手段の選択

### 2. TravelTimeOverlay

**場所**: `src/components/TravelTimeOverlay.tsx`

**責任**:

- 移動時間の可視化
- アイソクローン（等時間線）の表示

### 3. TravelTimeCircle

**場所**: `src/components/TravelTimeCircle.tsx`

**責任**:

- 移動可能範囲の円表示
- 時間ごとの色分け

### 4. SafeTravelTimeOverlay

**場所**: `src/components/SafeTravelTimeOverlay.tsx`

**責任**:

- エラーハンドリング付き移動時間表示

**問題点**: TravelTimeOverlayと機能が重複

## サービス層

### DirectionsService

**場所**: `src/services/directionsService.ts`

**責任**:

- Google Directions APIとの通信
- ルート計算
- 結果のキャッシュ

**主要メソッド**:

```typescript
calculateRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode
): Promise<DirectionsResult>
```

### TravelTimeCalculator（ユーティリティ）

**場所**: `src/utils/travelTimeCalculator.ts`

**責任**:

- 移動時間の計算
- 距離の計算
- 時間フォーマット

## ストア

### routeSearchStore

**場所**: `src/store/routeSearchStore.ts`

**管理する状態**:

- 検索パネルの開閉
- 選択中の出発地・目的地
- 検索結果
- ローディング状態

### routeConnectionsStore

**場所**: `src/store/routeConnectionsStore.ts`

**管理する状態**:

- 場所間の接続情報
- ルートの表示/非表示
- 接続の順序

### travelTimeStore

**場所**: `src/store/travelTimeStore.ts`

**管理する状態**:

- 移動時間モードのON/OFF
- 基準場所
- 移動手段
- 時間範囲

## フック

### useDirections

**場所**: `src/hooks/useDirections.ts`

**責任**:

- Directions APIの呼び出し
- 結果のキャッシュ管理
- エラーハンドリング

### useTravelTimeMode

**場所**: `src/hooks/useTravelTimeMode.ts`

**責任**:

- 移動時間モードの管理
- UIとの連携

## 問題点

### 1. コンポーネントの重複

```typescript
// 同じ機能の安全版と通常版が存在
-RouteDisplay / SafeRouteOverlay - TravelTimeOverlay / SafeTravelTimeOverlay;
```

### 2. 状態管理の分散

- ルート情報が複数のストアに分散
- 接続情報と検索結果が別々に管理

### 3. キャッシュ戦略の不明確さ

```typescript
// DirectionsServiceでのキャッシュ実装が不完全
const cache = new Map(); // グローバルキャッシュ
```

### 4. エラーハンドリングの不統一

- 一部はSafeコンポーネント
- 一部はtry-catchで処理

## 推奨される改善

### 1. コンポーネントの統合

```typescript
// エラーハンドリングを内包した単一コンポーネント
export const RouteOverlay = withErrorBoundary(({ route }) => {
  // 実装
});
```

### 2. ルート管理の一元化

```typescript
// 統合されたルートストア
const useRouteStore = create((set) => ({
  // 検索状態
  searchPanel: { open: false, origin: null, destination: null },

  // ルート結果
  routes: Map<string, Route>(),

  // 接続情報
  connections: [],

  // 統合されたアクション
  searchRoute: async (origin, destination) => {},
  addConnection: (placeA, placeB) => {},
}));
```

### 3. 適切なキャッシュ実装

```typescript
class DirectionsCache {
  private cache: LRUCache<string, DirectionsResult>;

  constructor(maxSize: number = 100) {
    this.cache = new LRUCache({ max: maxSize });
  }

  getCacheKey(origin: LatLng, dest: LatLng, mode: TravelMode): string {
    return `${origin.lat},${origin.lng}-${dest.lat},${dest.lng}-${mode}`;
  }
}
```

### 4. 移動時間計算の最適化

```typescript
interface TravelTimeService {
  // バッチ計算for効率化
  calculateMultiple(
    origin: LatLng,
    destinations: LatLng[],
    mode: TravelMode,
  ): Promise<TravelTimeResult[]>;

  // アイソクローン生成
  generateIsochrone(
    origin: LatLng,
    timeRanges: number[],
    mode: TravelMode,
  ): Promise<Isochrone[]>;
}
```

## タイプ定義

### 関連する型定義

**場所**: `src/types/travelTime.ts`

```typescript
interface TravelTimeMode {
  enabled: boolean;
  selectedPlace: Place | null;
  travelMode: google.maps.TravelMode;
  timeRanges: number[];
}
```

## リファクタリング優先順位

1. **高**: Safe\*コンポーネントの統合
2. **高**: ルート関連ストアの統合
3. **中**: キャッシュ機能の改善
4. **低**: バッチ処理の実装
