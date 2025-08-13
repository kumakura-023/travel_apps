# メモUI識別名称

## 概要
旅行アプリには3種類の異なるメモ機能が存在します。AIエージェントが適切に識別できるよう、明確な名称を定義します。

## 1. PlaceMemoEditor (場所メモエディター)

### 識別名称: `PlaceMemoEditor`
- **ファイル**: `src/components/placeDetail/MemoEditor.tsx`
- **表示場所**: 場所詳細パネル内
- **データ構造**: `Place.memo` (string型)
- **特徴**:
  - 場所（Place）に直接紐づくメモ
  - 場所詳細パネルで表示・編集
  - テキストエリア形式で編集可能
  - 拡大/縮小ボタン付き
  - 削除ボタンでメモ内容をクリア
  - クラウド同期対応

### 実装詳細
```typescript
interface Place {
  memo: string; // このフィールドに保存
}
```

## 2. LinkedMemoDisplay (リンクメモ表示)

### 識別名称: `LinkedMemoDisplay`
- **ファイル**: `src/components/PlaceListItem.tsx`
- **表示場所**: 場所リストアイテム内
- **データ構造**: `MapLabel` (独立したオブジェクト)
- **特徴**:
  - 地図上のメモ（MapLabel）を場所にリンクした表示
  - 場所リストで「リンクメモ」として表示
  - リンク解除と削除の2つの操作が可能
  - 場所とは独立したメモオブジェクト
  - 複数のメモを1つの場所にリンク可能

### 実装詳細
```typescript
interface MapLabel {
  id: string;
  text: string;
  linkedPlaceId?: string; // 場所とのリンク
}
```

## 3. MapLabelOverlay (地図メモオーバーレイ)

### 識別名称: `MapLabelOverlay`
- **ファイル**: `src/components/LabelOverlay.tsx`
- **表示場所**: 地図上に直接表示
- **データ構造**: `MapLabel` (独立したオブジェクト)
- **特徴**:
  - 地図上に直接配置されるメモ
  - ドラッグ&ドロップで移動可能
  - リサイズ可能
  - 場所にリンク可能（オプション）
  - 削除ボタン（✕）で完全削除
  - ズームレベルに応じて表示/非表示

### 実装詳細
```typescript
interface MapLabel {
  id: string;
  text: string;
  position: { lat: number; lng: number };
  width: number;
  height: number;
  linkedPlaceId?: string; // 場所とのリンク（オプション）
}
```

## データ構造の違い

| メモUI | データ型 | 保存場所 | 場所との関係 |
|--------|----------|----------|--------------|
| PlaceMemoEditor | string | Place.memo | 直接保存 |
| LinkedMemoDisplay | MapLabel | labels配列 | リンク関係 |
| MapLabelOverlay | MapLabel | labels配列 | 独立/リンク可能 |

## 操作の違い

| メモUI | 編集 | 削除 | 移動 | リサイズ | リンク |
|--------|------|------|------|----------|--------|
| PlaceMemoEditor | ✅ | クリア | ❌ | ❌ | ❌ |
| LinkedMemoDisplay | ❌ | 完全削除 | ❌ | ❌ | 解除可能 |
| MapLabelOverlay | ✅ | 完全削除 | ✅ | ✅ | 設定可能 |

## AIエージェント向け識別ポイント

1. **PlaceMemoEditor**: 場所詳細パネル内の「メモ」セクション
2. **LinkedMemoDisplay**: 場所リスト内の「リンクメモ」セクション
3. **MapLabelOverlay**: 地図上に直接表示されるメモオブジェクト

これらの名称を使用することで、AIエージェントは適切なメモ機能を識別し、適切な操作を実行できます。


---

# 全UIコンポーネント識別名称

## 地図関連UI

### 4. PlaceDetailOverlay (候補地詳細オーバーレイ)
- **識別名称**: `PlaceDetailOverlay`
- **ファイル**: `src/components/PlaceCircle.tsx` (詳細オーバーレイ部分)
- **表示場所**: 地図上の候補地マーカー上部
- **表示条件**: ズームレベル12以上
- **特徴**:
  - 候補地の詳細情報を表示
  - カテゴリアイコン、場所名、住所
  - 出発地・目的地設定ボタン
  - 削除ボタン
  - 日程選択機能
  - ズームレベルに応じたスケーリング

### 5. PlaceSimpleOverlay (簡易候補地オーバーレイ)
- **識別名称**: `PlaceSimpleOverlay`
- **ファイル**: `src/components/PlaceSimpleOverlay.tsx`
- **表示場所**: 地図上の候補地マーカー上部
- **表示条件**: ズームレベル6〜10
- **特徴**:
  - カテゴリアイコンと場所名のみ表示
  - シンプルな白背景
  - ポインターイベントなし（クリック不可）
  - 縮小時の視認性確保

### 6. RouteInfoOverlay (ルート情報オーバーレイ)
- **識別名称**: `RouteInfoOverlay`
- **ファイル**: `src/components/RouteDisplay.tsx`
- **表示場所**: 地図上のルート線上部
- **特徴**:
  - ルートの所要時間・距離を表示
  - 交通手段アイコン
  - 削除ボタン
  - グラデーション背景
  - アニメーション効果

### 7. TravelTimeOverlay (移動時間オーバーレイ)
- **識別名称**: `TravelTimeOverlay`
- **ファイル**: `src/components/TravelTimeCircle.tsx`
- **表示場所**: 地図上の移動時間円上部
- **特徴**:
  - 移動時間円の情報表示
  - 削除ボタン
  - シンプルな白背景
  - ズームレベルに応じたスケーリング

## パネル・モーダルUI

### 8. PlaceDetailPanel (場所詳細パネル)
- **識別名称**: `PlaceDetailPanel`
- **ファイル**: `src/components/PlaceDetailPanel.tsx`
- **表示場所**: 画面左側（デスクトップ）、ボトムシート（モバイル）
- **特徴**:
  - 場所の詳細情報表示
  - 写真ギャラリー
  - メモ編集機能
  - 住所・営業時間表示
  - レスポンシブ対応（デスクトップ/タブレット/モバイル）

### 9. PlaceDetailsPanel (場所詳細表示パネル)
- **識別名称**: `PlaceDetailsPanel`
- **ファイル**: `src/components/PlaceDetailsPanel.tsx`
- **表示場所**: 画面左側（固定幅540px）
- **特徴**:
  - Google Places APIの詳細情報表示
  - ホテル予約リンク
  - 候補地追加ボタン

### 10. RouteSearchPanel (ルート検索パネル)
- **識別名称**: `RouteSearchPanel`
- **ファイル**: `src/components/RouteSearchPanel.tsx`
- **表示場所**: 画面左側（デスクトップ）、下部（タブレット）、フルスクリーン（モバイル）
- **特徴**:
  - 出発地・目的地設定
  - 交通手段選択
  - ルート検索実行
  - 検索結果表示
  - ルート削除機能

### 11. PlaceList (候補地リスト)
- **識別名称**: `PlaceList`
- **ファイル**: `src/components/PlaceList.tsx`
- **表示場所**: タブ内のリスト表示
- **特徴**:
  - 候補地一覧表示
  - カテゴリフィルター
  - 検索機能
  - プラン名編集
  - 日程選択

## モーダル・ダイアログUI

### 12. DateSelectionModal (日程選択モーダル)
- **識別名称**: `DateSelectionModal`
- **ファイル**: `src/components/DateSelectionModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - カレンダー形式の日程選択
  - 月ナビゲーション
  - 複数日選択対応
  - アニメーション効果

### 13. PlanNameEditModal (プラン名編集モーダル)
- **識別名称**: `PlanNameEditModal`
- **ファイル**: `src/components/PlanNameEditModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - プラン名編集
  - プラン管理機能
  - タブ切り替え
  - 複製・削除機能

### 14. LabelEditDialog (ラベル編集ダイアログ)
- **識別名称**: `LabelEditDialog`
- **ファイル**: `src/components/LabelEditDialog.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - メモ（ラベル）の編集
  - フォント・色・サイズ設定
  - 候補地とのリンク設定
  - 近隣候補地検索

### 15. ConfirmDialog (確認ダイアログ)
- **識別名称**: `ConfirmDialog`
- **ファイル**: `src/components/ConfirmDialog.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - 削除確認
  - カスタマイズ可能なメッセージ
  - 確認・キャンセルボタン
  - スプリングアニメーション

### 16. SharePlanModal (プラン共有モーダル)
- **識別名称**: `SharePlanModal`
- **ファイル**: `src/components/SharePlanModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - メールアドレス入力
  - プラン共有機能
  - URL招待リンク

### 17. InviteUrlModal (招待URLモーダル)
- **識別名称**: `InviteUrlModal`
- **ファイル**: `src/components/InviteUrlModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - 招待URL生成
  - URLコピー機能
  - 共有機能

### 18. PlanEditModal (プラン編集モーダル)
- **識別名称**: `PlanEditModal`
- **ファイル**: `src/components/PlanEditModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - プラン名編集
  - 開始日・終了日設定
  - シンプルなフォーム

### 19. ImageCarouselModal (画像カルーセルモーダル)
- **識別名称**: `ImageCarouselModal`
- **ファイル**: `src/components/ImageCarouselModal.tsx`
- **表示場所**: 画面中央（オーバーレイ）
- **特徴**:
  - 画像ギャラリー表示
  - スワイプ操作
  - ズーム機能
  - 画像ナビゲーション

## コントロール・ナビゲーションUI

### 20. SearchBar (検索バー)
- **識別名称**: `SearchBar`
- **ファイル**: `src/components/SearchBar.tsx`
- **表示場所**: 画面左上
- **特徴**:
  - Google Places API検索
  - オートコンプリート
  - 検索履歴
  - カテゴリフィルター

### 21. TabNavigation (タブナビゲーション)
- **識別名称**: `TabNavigation`
- **ファイル**: `src/components/TabNavigation.tsx`
- **表示場所**: 画面下部（モバイル）、左側（デスクトップ）
- **特徴**:
  - 地図・リスト・設定タブ
  - ラベル追加モード切り替え
  - レスポンシブ対応

### 22. MapTypeSwitcher (地図タイプ切り替え)
- **識別名称**: `MapTypeSwitcher`
- **ファイル**: `src/components/MapTypeSwitcher.tsx`
- **表示場所**: 地図右上
- **特徴**:
  - 地図タイプ切り替え（通常・衛星・地形）
  - コンパクトなボタン配置

### 23. TravelTimeControls (移動時間コントロール)
- **識別名称**: `TravelTimeControls`
- **ファイル**: `src/components/TravelTimeControls.tsx`
- **表示場所**: 地図左上
- **特徴**:
  - 移動時間円の作成
  - 出発地・目的地設定
  - 交通手段選択
  - 時間設定

### 24. AddLabelToggle (ラベル追加トグル)
- **識別名称**: `AddLabelToggle`
- **ファイル**: `src/components/AddLabelToggle.tsx`
- **表示場所**: タブナビゲーション内
- **特徴**:
  - ラベル追加モードのON/OFF
  - 視覚的フィードバック

### 25. AddPlaceButton (候補地追加ボタン)
- **識別名称**: `AddPlaceButton`
- **ファイル**: `src/components/AddPlaceButton.tsx`
- **表示場所**: 場所詳細パネル内
- **特徴**:
  - 候補地への追加
  - 保存状態の表示
  - アニメーション効果

## リスト・アイテムUI

### 26. PlaceListItem (候補地リストアイテム)
- **識別名称**: `PlaceListItem`
- **ファイル**: `src/components/PlaceListItem.tsx`
- **表示場所**: 候補地リスト内
- **特徴**:
  - 候補地の基本情報表示
  - 費用・日程編集
  - リンクメモ表示・管理
  - カテゴリ表示

### 27. PlaceLabel (場所ラベル)
- **識別名称**: `PlaceLabel`
- **ファイル**: `src/components/PlaceLabel.tsx`
- **表示場所**: 地図上
- **特徴**:
  - 場所名のラベル表示
  - ドラッグ・リサイズ可能
  - 編集・削除機能
  - カテゴリ色表示

### 28. PlaceMarkerCluster (候補地マーカークラスター)
- **識別名称**: `PlaceMarkerCluster`
- **ファイル**: `src/components/PlaceMarkerCluster.tsx`
- **表示場所**: 地図上
- **特徴**:
  - 近接マーカーのグループ化
  - クラスター数表示
  - ズーム時の展開

## 表示・情報UI

### 29. PlanNameDisplay (プラン名表示)
- **識別名称**: `PlanNameDisplay`
- **ファイル**: `src/components/PlanNameDisplay.tsx`
- **表示場所**: 画面左上
- **特徴**:
  - 現在のプラン名表示
  - 編集機能
  - レスポンシブ対応

### 30. CostSummary (費用サマリー)
- **識別名称**: `CostSummary`
- **ファイル**: `src/components/CostSummary.tsx`
- **表示場所**: タブ内
- **特徴**:
  - 総費用表示
  - カテゴリ別費用内訳
  - 円グラフ表示

### 31. CostPieChart (費用円グラフ)
- **識別名称**: `CostPieChart`
- **ファイル**: `src/components/CostPieChart.tsx`
- **表示場所**: 費用サマリー内
- **特徴**:
  - カテゴリ別費用の円グラフ
  - インタラクティブな表示
  - ツールチップ

### 32. CategoryFilter (カテゴリフィルター)
- **識別名称**: `CategoryFilter`
- **ファイル**: `src/components/CategoryFilter.tsx`
- **表示場所**: リスト上部
- **特徴**:
  - カテゴリ別フィルタリング
  - 複数選択対応
  - 視覚的フィードバック

## 状態・管理UI

### 33. SyncStatusIndicator (同期状態インジケーター)
- **識別名称**: `SyncStatusIndicator`
- **ファイル**: `src/components/SyncStatusIndicator.tsx`
- **表示場所**: 画面右上
- **特徴**:
  - クラウド同期状態表示
  - 接続状態インジケーター
  - エラー表示

### 34. SelectionBanner (選択バナー)
- **識別名称**: `SelectionBanner`
- **ファイル**: `src/components/SelectionBanner.tsx`
- **表示場所**: 画面下部
- **特徴**:
  - 複数選択状態の表示
  - 選択解除・削除機能
  - アニメーション効果

### 35. ErrorBoundary (エラーバウンダリー)
- **識別名称**: `ErrorBoundary`
- **ファイル**: `src/components/ErrorBoundary.tsx`
- **表示場所**: エラー発生時
- **特徴**:
  - エラー捕捉・表示
  - リロード機能
  - エラー詳細表示

## ユーティリティUI

### 36. ModalPortal (モーダルポータル)
- **識別名称**: `ModalPortal`
- **ファイル**: `src/components/ModalPortal.tsx`
- **表示場所**: body直下
- **特徴**:
  - モーダルのポータル表示
  - z-index管理
  - アクセシビリティ対応

### 37. KeyboardShortcuts (キーボードショートカット)
- **識別名称**: `KeyboardShortcuts`
- **ファイル**: `src/components/KeyboardShortcuts.tsx`
- **表示場所**: グローバル
- **特徴**:
  - キーボードショートカット処理
  - ヘルプ表示
  - ショートカット一覧

### 38. Tutorial (チュートリアル)
- **識別名称**: `Tutorial`
- **ファイル**: `src/components/Tutorial.tsx`
- **表示場所**: 初回起動時
- **特徴**:
  - 機能説明
  - ステップバイステップ
  - スキップ機能

## UI分類まとめ

| カテゴリ | UI名称 | 主要機能 |
|----------|--------|----------|
| **メモ機能** | PlaceMemoEditor, LinkedMemoDisplay, MapLabelOverlay | メモの作成・編集・管理 |
| **地図オーバーレイ** | PlaceDetailOverlay, PlaceSimpleOverlay, RouteInfoOverlay, TravelTimeOverlay | 地図上の情報表示 |
| **パネル** | PlaceDetailPanel, PlaceDetailsPanel, RouteSearchPanel, PlaceList | 詳細情報・検索・リスト表示 |
| **モーダル** | DateSelectionModal, PlanNameEditModal, LabelEditDialog, ConfirmDialog | 設定・確認・編集ダイアログ |
| **コントロール** | SearchBar, TabNavigation, MapTypeSwitcher, TravelTimeControls | 操作・ナビゲーション |
| **リスト** | PlaceListItem, PlaceLabel, PlaceMarkerCluster | アイテム表示・管理 |
| **情報表示** | PlanNameDisplay, CostSummary, CostPieChart, CategoryFilter | データ可視化 |
| **状態管理** | SyncStatusIndicator, SelectionBanner, ErrorBoundary | 状態・エラー表示 |
| **ユーティリティ** | ModalPortal, KeyboardShortcuts, Tutorial | 補助機能 |

これらの名称により、AIエージェントは各UIコンポーネントを正確に識別し、適切な操作を実行できます。
