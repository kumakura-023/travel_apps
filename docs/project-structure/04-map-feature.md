# 地図機能とGoogle Maps統合

## 概要

地図機能はVoyageSketchの中核機能であり、Google Maps JavaScript APIと統合されています。単一責任原則に基づいて、複数のコンポーネントに機能が分離されています。

## 主要コンポーネント

### 1. Map（エントリーポイント）

**場所**: `src/components/Map.tsx`

**責任**: MapContainerへの後方互換性エイリアス

**問題点**: 実質的に不要なラッパー

### 2. MapContainer（メインコンテナ）

**場所**: `src/components/MapContainer.tsx`

**責任**:

- Google Mapsインスタンスの初期化
- 子コンポーネントの統合
- 地図の基本設定

**依存関係**:

- `useGoogleMaps` フック
- `MapStateManager`
- `MapEventHandler`
- `MapOverlayManager`

### 3. MapStateManager（状態管理）

**場所**: `src/components/MapStateManager.tsx`

**責任**:

- 地図の表示状態管理
- センター位置の管理
- マップオプションの提供

**管理する状態**:

- コンテナスタイル
- 地図オプション
- 中心位置

### 4. MapEventHandler（イベント処理）

**場所**: `src/components/MapEventHandler.tsx`

**責任**:

- 地図上のクリックイベント処理
- ダブルクリックでの場所追加
- イベントの伝播制御

**問題点**: UIを持たないコンポーネントとして設計されているが、ビジネスロジックを含む

### 5. MapOverlayManager（オーバーレイ管理）

**場所**: `src/components/MapOverlayManager.tsx`

**責任**:

- 地図上のオーバーレイ要素の管理
- ラベル、マーカー、ルートの表示制御
- ズームレベルに応じた表示切り替え

## 関連コンポーネント

### マーカーと場所表示

#### PlaceMarkerCluster

**場所**: `src/components/PlaceMarkerCluster.tsx`

**責任**: マーカーのクラスタリング表示

#### PlaceCircle

**場所**: `src/components/PlaceCircle.tsx`

**責任**: 場所を示す円形マーカー

#### PlaceLabel

**場所**: `src/components/PlaceLabel.tsx`

**責任**: 場所のラベル表示

#### PlaceSimpleOverlay

**場所**: `src/components/PlaceSimpleOverlay.tsx`

**責任**: シンプルなオーバーレイ表示

### ルート表示

#### RouteDisplay

**場所**: `src/components/RouteDisplay.tsx`

**責任**: ルートのポリライン表示

#### RouteMarkers

**場所**: `src/components/RouteMarkers.tsx`

**責任**: ルート上のマーカー管理

#### SafeRouteOverlay

**場所**: `src/components/SafeRouteOverlay.tsx`

**責任**: 安全なルート表示（エラーハンドリング付き）

### 移動時間表示

#### TravelTimeOverlay

**場所**: `src/components/TravelTimeOverlay.tsx`

**責任**: 移動時間の可視化

#### TravelTimeCircle

**場所**: `src/components/TravelTimeCircle.tsx`

**責任**: 移動時間範囲の円表示

#### SafeTravelTimeOverlay

**場所**: `src/components/SafeTravelTimeOverlay.tsx`

**責任**: 安全な移動時間表示（エラーハンドリング付き）

### その他の地図機能

#### MapTypeSwitcher

**場所**: `src/components/MapTypeSwitcher.tsx`

**責任**: 地図タイプの切り替え（地図/衛星）

#### LabelOverlay

**場所**: `src/components/LabelOverlay.tsx`

**責任**: カスタムラベルのオーバーレイ

## Google Maps統合

### GoogleMapsServiceAdapter

**場所**: `src/adapters/GoogleMapsServiceAdapter.ts`

**責任**: Google Maps APIのラッパー

**実装するインターフェース**: `MapService`

### useGoogleMaps フック

**場所**: `src/hooks/useGoogleMaps.ts`

**責任**:

- Google Maps APIの読み込み
- マップインスタンスの管理
- APIキーの管理

## 問題点と改善案

### 1. コンポーネントの過剰な分割

- `Map.tsx`は単なるエイリアスで不要
- 一部のコンポーネントが小さすぎる

### 2. 重複する安全性ラッパー

- `SafeRouteOverlay`と`RouteDisplay`
- `SafeTravelTimeOverlay`と`TravelTimeOverlay`
- エラーハンドリングを統一すべき

### 3. ビジネスロジックの混在

```typescript
// MapEventHandlerにビジネスロジックが含まれている
const handleMapDblClick = (e: google.maps.MapMouseEvent) => {
  // 場所追加のロジック
  addPlace({
    name: "新しい場所",
    coordinates: { lat, lng },
  });
};
```

### 4. 状態管理の分散

- 地図の状態が複数の場所で管理されている
- 統一された地図状態ストアが必要

## 推奨される改善

### 1. コンポーネントの統合

```typescript
// Map.tsxを削除し、MapContainerを直接使用
// Safe*Overlayを統合してエラーハンドリングを共通化
```

### 2. 地図状態の一元管理

```typescript
// 専用の地図ストアを作成
const useMapStore = create((set) => ({
  mapInstance: null,
  center: { lat: 35.681236, lng: 139.767125 },
  zoom: 14,
  mapType: "roadmap",
  // ... その他の地図状態
}));
```

### 3. イベントハンドリングの分離

```typescript
// MapEventHandlerからビジネスロジックを分離
class MapInteractionService {
  handleDoubleClick(position: LatLng): void {
    // ビジネスロジックはサービス層で処理
  }
}
```

### 4. オーバーレイの抽象化

```typescript
// 共通のオーバーレイインターフェース
interface MapOverlay {
  render(): React.ReactNode;
  shouldDisplay(zoom: number): boolean;
  priority: number;
}
```

## リファクタリング優先順位

1. **高**: Map.tsxの削除とMapContainerへの統一
2. **高**: Safe\*Overlayの統合
3. **中**: 地図状態の一元管理
4. **低**: オーバーレイシステムの抽象化
