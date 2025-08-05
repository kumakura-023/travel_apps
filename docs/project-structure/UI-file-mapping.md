# UI管理ファイル対応表

## 概要
このドキュメントは、VoyageSketchプロジェクトの各UIコンポーネントがどのファイルで管理されているかの対応表です。
現在の構造とリファクタリング後の構造の両方を記載しています。

## 現在のUI管理ファイル対応表

### メモ機能関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| PlaceMemoEditor | `src/components/placeDetail/MemoEditor.tsx` | 場所に紐づくメモの編集 |
| LinkedMemoDisplay | `src/components/PlaceListItem.tsx` | リンクメモの表示・管理 |
| MapLabelOverlay | `src/components/LabelOverlay.tsx` | 地図上のメモオーバーレイ |

### 地図オーバーレイ関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| PlaceDetailOverlay | `src/components/PlaceCircle.tsx` | 候補地詳細オーバーレイ |
| PlaceSimpleOverlay | `src/components/PlaceSimpleOverlay.tsx` | 簡易候補地オーバーレイ |
| RouteInfoOverlay | `src/components/RouteDisplay.tsx` | ルート情報オーバーレイ |
| TravelTimeOverlay | `src/components/TravelTimeCircle.tsx` | 移動時間オーバーレイ |

### パネル・モーダル関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| PlaceDetailPanel | `src/components/PlaceDetailPanel.tsx` | 保存済み場所の詳細表示 |
| PlaceDetailsPanel | `src/components/PlaceDetailsPanel.tsx` | Google Places詳細表示 |
| RouteSearchPanel | `src/components/RouteSearchPanel.tsx` | ルート検索パネル |
| PlaceList | `src/components/PlaceList.tsx` | 候補地リスト表示 |

### モーダル・ダイアログ関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| DateSelectionModal | `src/components/DateSelectionModal.tsx` | 日程選択モーダル |
| PlanNameEditModal | `src/components/PlanNameEditModal.tsx` | プラン名編集モーダル |
| LabelEditDialog | `src/components/LabelEditDialog.tsx` | ラベル編集ダイアログ |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | 確認ダイアログ |
| SharePlanModal | `src/components/SharePlanModal.tsx` | プラン共有モーダル |
| InviteUrlModal | `src/components/InviteUrlModal.tsx` | 招待URLモーダル |
| PlanEditModal | `src/components/PlanEditModal.tsx` | プラン編集モーダル |
| ImageCarouselModal | `src/components/ImageCarouselModal.tsx` | 画像カルーセルモーダル |

### コントロール・ナビゲーション関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| SearchBar | `src/components/SearchBar.tsx` | 場所検索バー |
| TabNavigation | `src/components/TabNavigation.tsx` | タブナビゲーション |
| MapTypeSwitcher | `src/components/MapTypeSwitcher.tsx` | 地図タイプ切り替え |
| TravelTimeControls | `src/components/TravelTimeControls.tsx` | 移動時間コントロール |
| AddLabelToggle | `src/components/AddLabelToggle.tsx` | ラベル追加トグル |
| AddPlaceButton | `src/components/AddPlaceButton.tsx` | 候補地追加ボタン |

### リスト・アイテム関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| PlaceListItem | `src/components/PlaceListItem.tsx` | 候補地リストアイテム |
| PlaceLabel | `src/components/PlaceLabel.tsx` | 場所ラベル |
| PlaceMarkerCluster | `src/components/PlaceMarkerCluster.tsx` | マーカークラスター |

### 表示・情報関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| PlanNameDisplay | `src/components/PlanNameDisplay.tsx` | プラン名表示 |
| CostSummary | `src/components/CostSummary.tsx` | 費用サマリー |
| CostPieChart | `src/components/CostPieChart.tsx` | 費用円グラフ |
| CategoryFilter | `src/components/CategoryFilter.tsx` | カテゴリフィルター |

### 状態・管理関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| SyncStatusIndicator | `src/components/SyncStatusIndicator.tsx` | 同期状態表示 |
| SelectionBanner | `src/components/SelectionBanner.tsx` | 選択バナー |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | エラーバウンダリー |

### ユーティリティ関連

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| ModalPortal | `src/components/ModalPortal.tsx` | モーダルポータル |
| KeyboardShortcuts | `src/components/KeyboardShortcuts.tsx` | キーボードショートカット |
| Tutorial | `src/components/Tutorial.tsx` | チュートリアル |

### その他のUI（UI_name.mdに記載されていない）

| UI識別名称 | 現在のファイルパス | 主要機能 |
|------------|-------------------|----------|
| TabNavigationWrapper | `src/components/TabNavigationWrapper.tsx` | タブナビゲーションラッパー |
| TabNavigationToggle | `src/components/TabNavigationToggle.tsx` | タブナビゲーショントグル |
| AppMenu | `src/components/AppMenu.tsx` | アプリケーションメニュー |
| AuthButton | `src/components/AuthButton.tsx` | 認証ボタン |
| Settings | `src/components/Settings.tsx` | 設定画面 |
| ArrowToggleButton | `src/components/ArrowToggleButton.tsx` | 矢印トグルボタン |
| DaySelector | `src/components/DaySelector.tsx` | 日付選択UI |
| ExternalBrowserPrompt | `src/components/ExternalBrowserPrompt.tsx` | 外部ブラウザー誘導 |
| ImageGallery | `src/components/placeDetail/ImageGallery.tsx` | 画像ギャラリー |
| PlaceActions | `src/components/placeDetail/PlaceActions.tsx` | 場所アクション |

## リファクタリング後のUI管理ファイル対応表（想定）

### PlaceDetailPanelの分割（フェーズ1）

| UI識別名称 | リファクタリング後のファイルパス | 変更内容 |
|------------|----------------------------------|----------|
| PlaceDetailPanel | `src/components/placeDetail/PlaceDetailPanel.tsx` | メインコンテナ（100行以下） |
| PlaceDetailHeader | `src/components/placeDetail/PlaceDetailHeader.tsx` | ヘッダー部分を分離 |
| PlaceDetailInfo | `src/components/placeDetail/PlaceDetailInfo.tsx` | 基本情報表示を分離 |
| PlaceDetailCost | `src/components/placeDetail/PlaceDetailCost.tsx` | コスト関連を分離 |
| PlaceDetailMemo | `src/components/placeDetail/PlaceDetailMemo.tsx` | メモ機能を分離 |
| PlaceDetailImages | `src/components/placeDetail/PlaceDetailImages.tsx` | 画像管理を分離 |
| PlaceDetailActions | `src/components/placeDetail/PlaceDetailActions.tsx` | アクションボタンを分離 |

### カスタムフックへの移行（フェーズ1）

| 機能 | リファクタリング後のファイルパス | 内容 |
|------|----------------------------------|------|
| 場所詳細ロジック | `src/components/placeDetail/hooks/usePlaceDetail.ts` | ビジネスロジック |
| コスト計算ロジック | `src/components/placeDetail/hooks/usePlaceCost.ts` | コスト計算ロジック |

### ストア名の統一（フェーズ1）

| 現在の名称 | リファクタリング後の名称 | ファイルパス |
|------------|------------------------|--------------|
| placeStore | selectedPlaceStore | `src/store/selectedPlaceStore.ts` |
| placesStore | savedPlacesStore | `src/store/savedPlacesStore.ts` |

### Safe*コンポーネントの統一（フェーズ2）

| 現在のUI | リファクタリング後 | 変更内容 |
|----------|-------------------|----------|
| SafeRouteOverlay | withErrorBoundary(RouteDisplay) | HOCパターンで統一 |
| SafeTravelTimeOverlay | withErrorBoundary(TravelTimeDisplay) | HOCパターンで統一 |

### ルート関連ストアの統合（フェーズ3）

| 現在のストア | リファクタリング後 | ファイルパス |
|--------------|-------------------|--------------|
| routeSearchStore | routeStore | `src/store/routeStore.ts` |
| routeConnectionsStore | routeStore | `src/store/routeStore.ts` |

### Atomic Design導入後の構造（将来的な目標）

```
src/components/
├── atoms/          # 最小単位のコンポーネント
│   ├── Button/
│   ├── Input/
│   ├── Icon/
│   └── Label/
├── molecules/      # 基本的な組み合わせ
│   ├── FormField/
│   ├── ListItem/
│   └── Card/
├── organisms/      # 複雑な組み合わせ
│   ├── PlaceCard/
│   ├── RoutePanel/
│   └── CostSummaryCard/
├── templates/      # ページレイアウト
│   ├── MainLayout/
│   └── ModalLayout/
└── pages/         # 完全なページ
    ├── HomePage/
    └── SettingsPage/
```

## 問題点と改善提案

### 1. 名前の混乱を解消

| 問題のある名称 | 改善案 |
|---------------|--------|
| PlaceDetailsPanel vs PlaceDetailPanel | PlaceSearchPanel vs PlaceSavedDetailPanel |
| Map.tsx vs MapContainer.tsx | MapContainer.tsxに統一 |

### 2. 重複ファイルの削除対象

| 削除対象ファイル | 理由 |
|-----------------|------|
| `src/services/planListServiceNoSort.ts` | planListService.tsと重複 |
| `src/components/Map.tsx` | MapContainer.tsxと重複 |
| `src/di/DIContainer.ts` | ServiceContainer.tsと重複 |

### 3. 責任分離が必要なコンポーネント

| コンポーネント | 現在の行数 | 分割後の想定 |
|---------------|-----------|--------------|
| PlaceDetailPanel | 1000行以上 | 各100-200行の7つのコンポーネント |
| Settings | 複数の責任 | 機能ごとに分割 |

## まとめ

このドキュメントは、VoyageSketchプロジェクトのUI管理ファイルの現状と、リファクタリング計画に基づく将来の構造を示しています。リファクタリングは段階的に実施され、最終的にはより保守性の高い、責任が明確に分離された構造を目指します。