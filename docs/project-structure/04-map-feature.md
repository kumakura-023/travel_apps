# 地図機能とGoogle Maps統合

## 概要

地図機能はVoyageSketchの中核機能であり、Google Maps JavaScript APIと統合されています。単一責任原則に基づいて、複数のコンポーネントに機能が分離されています。

## 主要コンポーネント

### 1. MapContainer（エントリーポイント）

**場所**: `src/components/MapContainer.tsx`

**責任**:

- Google Mapsインスタンスの初期化
- MapStateManager / MapEventHandler / MapOverlayManager など管理コンポーネントの統合
- TravelTimeControls や RouteDisplay など地図周辺UIのラップ

**依存関係**:

- `useGoogleMaps` フック
- `MapStateManager`
- `MapEventHandler`
- `MapOverlayManager`
- `TravelTimeControls`

### 2. MapStateManager（状態管理）

**場所**: `src/components/MapStateManager.tsx`

- **責任**:

  - 地図コンテナのレイアウト制御
  - 中心位置/ズームなど基本オプション管理
  - routeStore / travelTimeStore からの情報を集約しMapContainerへ渡す

**管理する状態**:

- コンテナスタイル
- 地図オプション
- 中心位置

### 3. MapEventHandler（イベント処理）

**場所**: `src/components/MapEventHandler.tsx`

- **責任**:

  - クリック/ダブルクリックでの場所追加やルート選択
  - ストアやサービスを呼び出して状態を更新
  - ビジネスロジックが内包されており肥大化

**問題点**: UIを持たないコンポーネントとして設計されているが、ビジネスロジックを含む

### 4. MapOverlayManager（オーバーレイ管理）

**場所**: `src/components/MapOverlayManager.tsx`

- **責任**:

  - SavedPlace/Label/Notification/TravelTime/Routeなど多数のオーバーレイをまとめて描画
  - ズームレベルやフィルタに応じた表示切り替え

## 関連コンポーネント

### マーカーと場所表示

#### PlaceMarkerCluster

**場所**: `src/components/PlaceMarkerCluster.tsx`

**責任**: マーカーのクラスタリング表示

#### PlaceSimpleOverlay

**場所**: `src/components/PlaceSimpleOverlay.tsx`

**責任**: シンプルなオーバーレイ表示

#### PlaceNotificationOverlay

**場所**: `src/components/PlaceNotificationOverlay.tsx`

**責任**: 通知や警告を地図上にピン留め

### ルート表示

#### RouteDisplay

**場所**: `src/components/RouteDisplay.tsx`

**責任**: ルートのポリライン表示

#### RouteMarkers

**場所**: `src/components/RouteMarkers.tsx`

**責任**: ルート上のマーカー管理

#### RouteDisplay

**場所**: `src/components/RouteDisplay.tsx`

**責任**: ルートのポリライン表示とズーム調整

#### RouteMarkers

**場所**: `src/components/RouteMarkers.tsx`

**責任**: ルート上のマーカー管理

### 移動時間表示

#### TravelTimeOverlay

**場所**: `src/components/TravelTimeOverlay.tsx`

**責任**: 移動時間の可視化

#### TravelTimeCircle

**場所**: `src/components/TravelTimeCircle.tsx`

**責任**: 移動時間範囲の円表示

#### TravelTimeControls

**場所**: `src/components/TravelTimeControls.tsx`

**責任**: TravelTimeモードの切り替えと中心地点管理（エラーハンドリングもここで実施）

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

### 1. MapEventHandlerへのロジック集中

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

### 2. オーバーレイ描画の分散

- MapOverlayManager配下でさらに細分化したコンポーネントへ責務が拡散

### 3. 状態管理の分散

- MapStateManagerと複数のZustandストアが重複した状態を持ち、中心やズームのソースが不明確

## 推奨される改善

### 1. 地図状態の一元管理

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

### 2. イベントハンドリングの分離

```typescript
// MapEventHandlerからビジネスロジックを分離
class MapInteractionService {
  handleDoubleClick(position: LatLng): void {
    // ビジネスロジックはサービス層で処理
  }
}
```

### 3. オーバーレイの抽象化

```typescript
// 共通のオーバーレイインターフェース
interface MapOverlay {
  render(): React.ReactNode;
  shouldDisplay(zoom: number): boolean;
  priority: number;
}
```

## リファクタリング優先順位

1. **高**: MapEventHandlerの責務分離（サービス層へ移動）
2. **高**: MapStateManagerとZustandストアの役割整理（中心/ズーム/フィルタの統一）
3. **中**: MapOverlayManagerの描画パイプラインを抽象化し、Route/TravelTime/Notificationをプラグイン化
4. **低**: Overlayコンポーネントの命名/構成整理
