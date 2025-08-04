# UIコンポーネントと責任分離

## 概要

VoyageSketchのUIコンポーネントは、プレゼンテーション層として機能し、ビジネスロジックから分離されています。しかし、一部のコンポーネントで責任の混在が見られます。

## ナビゲーション関連

### TabNavigation
**場所**: `src/components/TabNavigation.tsx`

**責任**: メインタブナビゲーション

### TabNavigationWrapper
**場所**: `src/components/TabNavigationWrapper.tsx`

**責任**: タブナビゲーションのラッパー

### TabNavigationToggle
**場所**: `src/components/TabNavigationToggle.tsx`

**責任**: タブナビゲーションの表示/非表示切り替え

**問題点**: 3つのコンポーネントに分割されているが、責任が不明確

### AppMenu
**場所**: `src/components/AppMenu.tsx`

**責任**: アプリケーションメニュー

## モーダル・ダイアログ

### ModalPortal
**場所**: `src/components/ModalPortal.tsx`

**責任**: モーダルのポータルレンダリング

### ConfirmDialog
**場所**: `src/components/ConfirmDialog.tsx`

**責任**: 確認ダイアログ

### DateSelectionModal
**場所**: `src/components/DateSelectionModal.tsx`

**責任**: 日付選択モーダル

### ImageCarouselModal
**場所**: `src/components/ImageCarouselModal.tsx`

**責任**: 画像カルーセル表示

### LabelEditDialog
**場所**: `src/components/LabelEditDialog.tsx`

**責任**: ラベル編集ダイアログ

## 表示コンポーネント

### CostSummary
**場所**: `src/components/CostSummary.tsx`

**責任**: コスト集計表示

### CostPieChart
**場所**: `src/components/CostPieChart.tsx`

**責任**: コスト円グラフ表示

### DaySelector
**場所**: `src/components/DaySelector.tsx`

**責任**: 日付選択UI

### CategoryFilter
**場所**: `src/components/CategoryFilter.tsx`

**責任**: カテゴリーフィルター

### SelectionBanner
**場所**: `src/components/SelectionBanner.tsx`

**責任**: 複数選択時のバナー表示

## 特殊UI

### BottomSheet（モバイル用）
**関連ストア**: `src/store/bottomSheetStore.ts`
**関連フック**: `src/hooks/useBottomSheet.ts`

**責任**: モバイル版のボトムシート機能

### ExternalBrowserPrompt
**場所**: `src/components/ExternalBrowserPrompt.tsx`

**責任**: 外部ブラウザー誘導

### Tutorial
**場所**: `src/components/Tutorial.tsx`

**責任**: チュートリアル表示

### KeyboardShortcuts
**場所**: `src/components/KeyboardShortcuts.tsx`

**責任**: キーボードショートカット処理

## 認証関連

### AuthButton
**場所**: `src/components/AuthButton.tsx`

**責任**: ログイン/ログアウトボタン

## 設定

### Settings
**場所**: `src/components/Settings.tsx`

**責任**: アプリケーション設定画面

## ユーティリティコンポーネント

### ArrowToggleButton
**場所**: `src/components/ArrowToggleButton.tsx`

**責任**: 矢印トグルボタン

### AddLabelToggle
**場所**: `src/components/AddLabelToggle.tsx`

**責任**: ラベル追加トグル

### ErrorBoundary
**場所**: `src/components/ErrorBoundary.tsx`

**責任**: エラー境界

## 問題点

### 1. コンポーネントの粒度が不統一
```typescript
// 小さすぎる例
- ArrowToggleButton（単なるボタン）
- AddLabelToggle（単なるトグル）

// 大きすぎる例
- PlaceDetailPanel（1000行以上）
- Settings（複数の設定項目）
```

### 2. 責任の混在
```typescript
// UIコンポーネントにビジネスロジックが含まれる
const CostSummary = () => {
  // コスト計算ロジックがコンポーネント内に存在
  const totalCost = places.reduce((sum, place) => {
    return sum + estimateCost(place.category, place.priceLevel);
  }, 0);
};
```

### 3. 状態管理の不適切な実装
```typescript
// グローバル状態をコンポーネント内で直接更新
const handleSave = () => {
  // 直接ストアを更新
  usePlacesStore.getState().updatePlace(id, data);
};
```

### 4. 再利用性の低さ
- 特定の用途に特化しすぎている
- 汎用的なコンポーネントの不足

## 推奨される改善

### 1. Atomic Designの導入
```typescript
// Atoms - 最小単位
Button, Input, Icon, Label

// Molecules - 基本的な組み合わせ
FormField, ListItem, Card

// Organisms - 複雑な組み合わせ
PlaceCard, RoutePanel, CostSummaryCard

// Templates - ページレイアウト
MainLayout, ModalLayout

// Pages - 完全なページ
HomePage, SettingsPage
```

### 2. プレゼンテーショナルコンポーネントの分離
```typescript
// Presentational Component
const CostSummaryView = ({ totalCost, breakdown }) => (
  <div>{/* 純粋な表示 */}</div>
);

// Container Component
const CostSummaryContainer = () => {
  const totalCost = useCostCalculation();
  return <CostSummaryView totalCost={totalCost} />;
};
```

### 3. カスタムフックによるロジック分離
```typescript
// ビジネスロジックをフックに
const useCostCalculation = () => {
  const places = usePlacesStore(state => state.places);
  
  const totalCost = useMemo(() => {
    return calculateTotalCost(places);
  }, [places]);
  
  return { totalCost, breakdown: getCostBreakdown(places) };
};
```

### 4. コンポーネントライブラリの作成
```typescript
// 共通UIコンポーネント
export * from './components/common/Button';
export * from './components/common/Modal';
export * from './components/common/Card';
export * from './components/common/List';
```

### 5. Storybookの導入
```typescript
// コンポーネントカタログ
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

## リファクタリング優先順位

1. **高**: PlaceDetailPanelの分割（責任分離）
2. **高**: ビジネスロジックのフック化
3. **中**: 小さすぎるコンポーネントの統合
4. **低**: Atomic Designの段階的導入