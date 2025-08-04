# 現在のコードの問題点と改善案

## 概要

このドキュメントは、VoyageSketchプロジェクトで発見された具体的なコードの問題点と、それぞれに対する改善案を記載します。

## 1. 重複コード

### 問題1: サービスの重複

**ファイル**:
- `src/services/planListService.ts`
- `src/services/planListServiceNoSort.ts`

**問題点**: ほぼ同じ機能を持つ2つのサービスが存在

**改善案**:
```typescript
// 統合されたサービス
export class PlanListService {
  constructor(private sortingEnabled: boolean = true) {}
  
  getPlans(): Plan[] {
    const plans = this.fetchPlans();
    return this.sortingEnabled ? this.sortPlans(plans) : plans;
  }
}
```

### 問題2: Safe*コンポーネントの重複

**ファイル**:
- `src/components/RouteDisplay.tsx` / `src/components/SafeRouteOverlay.tsx`
- `src/components/TravelTimeOverlay.tsx` / `src/components/SafeTravelTimeOverlay.tsx`

**問題点**: エラーハンドリングのためだけに別コンポーネントが存在

**改善案**: HOC（Higher-Order Component）パターンを使用

## 2. 単一責任原則違反

### 問題1: PlaceDetailPanel

**ファイル**: `src/components/PlaceDetailPanel.tsx`

**問題点**: 
- 1000行以上のコード
- 表示、編集、画像管理、メモ、コスト計算などすべての責任を持つ

**現状のコード構造**:
```typescript
export default function PlaceDetailPanel() {
  // 状態管理（50行）
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  // ... 他の多数の状態
  
  // ビジネスロジック（200行）
  const handleDelete = () => { /* ... */ };
  const handleUpdate = () => { /* ... */ };
  const calculateCost = () => { /* ... */ };
  
  // レンダリング（750行）
  return (
    <div>
      {/* ヘッダー */}
      {/* 基本情報 */}
      {/* 画像ギャラリー */}
      {/* メモセクション */}
      {/* コスト情報 */}
      {/* アクションボタン */}
    </div>
  );
}
```

**改善案**: コンポーネントを機能ごとに分割

### 問題2: uiStore

**ファイル**: `src/store/uiStore.ts`

**問題点**: あらゆるUI状態を1つのストアで管理

**改善案**:
```typescript
// ドメインごとにストアを分割
- navigationStore.ts  // ナビゲーション関連
- panelStore.ts      // パネルの開閉状態
- modalStore.ts      // モーダルの状態
```

## 3. ビジネスロジックの配置ミス

### 問題1: ストア内のビジネスロジック

**ファイル**: `src/store/placesStore.ts`

**問題のコード**:
```typescript
addPlace: (partial) => {
  // ビジネスロジックがストアに含まれている
  if (!partial.coordinates) {
    throw new Error('Coordinates are required');
  }
  
  const newPlace = {
    ...partial,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    labelHidden: true,
    labelPosition: {
      lat: partial.coordinates.lat,
      lng: partial.coordinates.lng,
    },
  } as Place;
  
  // 状態更新
  set({ places: [...state.places, newPlace] });
}
```

**改善案**: サービス層でビジネスロジックを処理

### 問題2: コンポーネント内の計算ロジック

**ファイル**: `src/components/CostSummary.tsx`

**問題のコード**:
```typescript
const CostSummary = () => {
  // コンポーネント内でコスト計算
  const totalCost = places.reduce((sum, place) => {
    const categoryMultiplier = getCategoryMultiplier(place.category);
    const baseCost = place.priceLevel * 1000;
    return sum + (baseCost * categoryMultiplier);
  }, 0);
};
```

**改善案**: 計算ロジックをサービスまたはユーティリティに移動

## 4. 型安全性の問題

### 問題1: any型の使用

**発見箇所**: 複数のファイル

**問題のコード**:
```typescript
// src/services/syncConflictResolver.ts
resolveConflict(local: any, remote: any): any {
  // 型情報が失われている
}
```

**改善案**: 適切な型定義を使用

### 問題2: 型アサーションの過度な使用

**問題のコード**:
```typescript
const place = response.data as Place; // 型の保証なし
```

**改善案**: 型ガードを使用
```typescript
function isPlace(data: unknown): data is Place {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'coordinates' in data
  );
}
```

## 5. 依存関係の問題

### 問題1: 循環依存の可能性

**問題のパターン**:
```
Store → Service → Store（循環）
```

**改善案**: 依存の方向を一方向に
```
Component → Hook → Service → Repository
         ↘        ↙
           Store
```

### 問題2: 直接依存

**問題のコード**:
```typescript
// サービスが特定の実装に直接依存
import { usePlacesStore } from '../store/placesStore';

class PlaceService {
  updatePlace() {
    // ストアに直接アクセス
    usePlacesStore.getState().updatePlace();
  }
}
```

**改善案**: 依存性注入を使用

## 6. エラーハンドリングの不統一

### 問題1: エラー処理の散在

**現状**:
- try-catchブロック
- Safeコンポーネント
- ErrorBoundary
- console.error

**改善案**: 統一されたエラーハンドリング戦略

### 問題2: ユーザーへの通知方法の不統一

**現状**:
- alert()
- カスタムトースト
- コンソールログ
- 無視

**改善案**: 統一された通知システム

## 7. パフォーマンスの問題

### 問題1: 不要な再レンダリング

**問題のコード**:
```typescript
// 毎回新しいオブジェクトを作成
const mapOptions = {
  zoom: 14,
  center: { lat, lng },
  // ...
};
```

**改善案**: useMemoを使用

### 問題2: 大きなコンポーネント

**問題**: PlaceDetailPanelのような巨大コンポーネントは、一部の変更で全体が再レンダリングされる

**改善案**: コンポーネントの分割とReact.memoの使用

## 8. 命名の不統一

### 問題1: 単数形と複数形の混在

- `placeStore` vs `placesStore`
- 機能が似ているため混乱を招く

### 問題2: 似た名前のコンポーネント

- `PlaceDetailsPanel` vs `PlaceDetailPanel`
- 役割の違いが名前から判断できない

## 改善の優先順位

### 緊急（すぐに対応すべき）
1. 重複コードの削除
2. PlaceDetailPanelの分割
3. 型安全性の改善

### 重要（1ヶ月以内）
1. ビジネスロジックの適切な配置
2. エラーハンドリングの統一
3. 命名の統一

### 推奨（3ヶ月以内）
1. パフォーマンス最適化
2. 依存関係の整理
3. テストの追加

## まとめ

これらの問題は、プロジェクトの成長に伴って自然に発生したものです。段階的なリファクタリングにより、保守性と拡張性の高いコードベースに改善できます。重要なのは、一度にすべてを変更しようとせず、優先順位に従って着実に改善を進めることです。