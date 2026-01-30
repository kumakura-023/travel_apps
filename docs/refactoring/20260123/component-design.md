# コンポーネント設計書: 検索機能強化

## 1. コンポーネント一覧

### 1.1 新規コンポーネント

| コンポーネント         | ファイルパス                                     | 責務                               |
| ---------------------- | ------------------------------------------------ | ---------------------------------- |
| `CustomSuggestionList` | `src/components/search/CustomSuggestionList.tsx` | サジェスト候補一覧の表示・選択     |
| `RichSuggestionItem`   | `src/components/search/RichSuggestionItem.tsx`   | 写真・評価付きサジェスト行         |
| `SimpleSuggestionItem` | `src/components/search/SimpleSuggestionItem.tsx` | テキストのみサジェスト行           |
| `RegionSearchButton`   | `src/components/search/RegionSearchButton.tsx`   | 「地域から探す」トリガーボタン     |
| `RegionSelectorModal`  | `src/components/region/RegionSelectorModal.tsx`  | 都道府県・市区町村選択モーダル     |
| `PrefectureList`       | `src/components/region/PrefectureList.tsx`       | 都道府県一覧                       |
| `CityList`             | `src/components/region/CityList.tsx`             | 市区町村一覧                       |
| `RegionSpotList`       | `src/components/region/RegionSpotList.tsx`       | スポット一覧画面（フルスクリーン） |
| `RegionSummaryCard`    | `src/components/region/RegionSummaryCard.tsx`    | 地域サマリーカード                 |
| `SpotCard`             | `src/components/region/SpotCard.tsx`             | 個別スポットカード                 |
| `SpotGrid`             | `src/components/region/SpotGrid.tsx`             | スポットグリッドレイアウト         |
| `CategoryFilterChips`  | `src/components/region/CategoryFilterChips.tsx`  | カテゴリフィルター                 |

### 1.2 変更コンポーネント

| コンポーネント  | 変更内容                                 |
| --------------- | ---------------------------------------- |
| `SearchBar.tsx` | Autocompleteラッパー削除、カスタムUI統合 |

### 1.3 再利用コンポーネント（変更なし）

| コンポーネント      | 用途             |
| ------------------- | ---------------- |
| `PlaceDetailsPanel` | スポット詳細表示 |
| `AddPlaceButton`    | 旅行計画への追加 |

---

## 2. ディレクトリ構造

```
src/
├── components/
│   ├── search/                      # 検索関連（新規）
│   │   ├── CustomSuggestionList.tsx
│   │   ├── RichSuggestionItem.tsx
│   │   ├── SimpleSuggestionItem.tsx
│   │   ├── RegionSearchButton.tsx
│   │   └── index.ts
│   ├── region/                      # 地域検索関連（新規）
│   │   ├── RegionSelectorModal.tsx
│   │   ├── PrefectureList.tsx
│   │   ├── CityList.tsx
│   │   ├── RegionSpotList.tsx
│   │   ├── RegionSummaryCard.tsx
│   │   ├── SpotCard.tsx
│   │   ├── SpotGrid.tsx
│   │   ├── CategoryFilterChips.tsx
│   │   └── index.ts
│   └── SearchBar.tsx                # 既存（改修）
├── store/
│   ├── suggestionStore.ts           # 新規
│   ├── regionSearchStore.ts         # 新規
│   └── selectedPlaceStore.ts        # 既存（変更なし）
├── hooks/
│   ├── useAutocomplete.ts           # 新規
│   ├── useNearbySearch.ts           # 新規
│   └── usePlaceDetails.ts           # 新規
├── services/
│   └── placesApiService.ts          # 新規（APIラッパー）
└── data/
    └── regions/                     # 地域マスタ（新規）
        ├── prefectures.json
        └── cities/
            ├── tokyo.json
            ├── kyoto.json
            └── ...
```

---

## 3. コンポーネント詳細設計

### 3.1 CustomSuggestionList

サジェスト候補のコンテナコンポーネント。

```typescript
// src/components/search/CustomSuggestionList.tsx

interface Props {
  predictions: google.maps.places.AutocompletePrediction[];
  richDetails: Map<string, google.maps.places.PlaceResult>;
  isLoading: boolean;
  onSelect: (placeId: string) => void;
  onClose: () => void;
}

/**
 * 責務:
 * - サジェスト候補リストの表示
 * - 上位3件はRichSuggestionItem、それ以降はSimpleSuggestionItemで表示
 * - ローディング状態の表示
 * - キーボードナビゲーション（上下矢印、Enter）
 * - 外側クリックで閉じる
 *
 * 状態:
 * - focusedIndex: number（キーボードナビゲーション用）
 *
 * イベント:
 * - onSelect: 候補選択時
 * - onClose: リスト閉じる時
 */
```

**レイアウト（デスクトップ）**:

```
+----------------------------------------+
| [Loading spinner]    (ローディング中)   |
+----------------------------------------+
| [img] 東京タワー     ★4.5 (1,234件)    | ← RichSuggestionItem
|       東京都港区芝公園...              |
+----------------------------------------+
| [img] 東京スカイツリー ★4.6 (2,345件)  | ← RichSuggestionItem
|       東京都墨田区押上...              |
+----------------------------------------+
| [img] 東京駅         ★4.3 (890件)     | ← RichSuggestionItem
|       東京都千代田区丸の内...          |
+----------------------------------------+
| 東京ディズニーランド                    | ← SimpleSuggestionItem
| 千葉県浦安市舞浜...                    |
+----------------------------------------+
| 東京ドーム                             | ← SimpleSuggestionItem
| 東京都文京区後楽...                    |
+----------------------------------------+
```

**レイアウト（モバイル - BottomSheet）**:

```
+----------------------------------------+
|            ─────────                   |  ← ハンドル
|  検索結果                        [×]   |
+----------------------------------------+
| [img] 東京タワー     ★4.5 (1,234件)    |
|       東京都港区芝公園...              |
+----------------------------------------+
| ...                                    |
+----------------------------------------+
```

---

### 3.2 RichSuggestionItem

写真・評価付きのサジェスト行。

```typescript
// src/components/search/RichSuggestionItem.tsx

interface Props {
  prediction: google.maps.places.AutocompletePrediction;
  detail: google.maps.places.PlaceResult | undefined;
  isLoading: boolean;
  isFocused: boolean;
  onClick: () => void;
}

/**
 * 責務:
 * - 写真サムネイル表示（48x48px）
 * - 場所名・住所表示
 * - 評価・レビュー件数表示
 * - 詳細読み込み中のスケルトン表示
 *
 * 表示要素:
 * - 写真（なければプレースホルダー）
 * - 名前（prediction.structured_formatting.main_text）
 * - 住所（prediction.structured_formatting.secondary_text）
 * - 評価（detail.rating）
 * - レビュー件数（detail.user_ratings_total）
 */
```

**スタイル**:

```css
/* ホバー時 */
background: bg-slate-50 (light) / bg-slate-800 (dark)

/* フォーカス時（キーボードナビ） */
background: bg-primary/10
border-left: 3px solid primary

/* 写真 */
width: 48px
height: 48px
border-radius: 8px
object-fit: cover

/* 評価バッジ */
display: inline-flex
align-items: center
gap: 4px
font-size: 14px
```

---

### 3.3 SimpleSuggestionItem

テキストのみのサジェスト行（4件目以降）。

```typescript
// src/components/search/SimpleSuggestionItem.tsx

interface Props {
  prediction: google.maps.places.AutocompletePrediction;
  isFocused: boolean;
  onClick: () => void;
}

/**
 * 責務:
 * - 場所名・住所のみ表示
 * - コンパクトなレイアウト
 */
```

---

### 3.4 RegionSearchButton

「地域から探す」ボタン。

```typescript
// src/components/search/RegionSearchButton.tsx

interface Props {
  onClick: () => void;
}

/**
 * 責務:
 * - 地域検索モーダルを開くトリガー
 *
 * デザイン:
 * - アイコン: map / explore
 * - テキスト: "地域から探す"（デスクトップ）
 * - モバイル: アイコンのみ
 */
```

**配置**: SearchBar の右側

---

### 3.5 RegionSelectorModal

都道府県・市区町村選択のモーダル。

```typescript
// src/components/region/RegionSelectorModal.tsx

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect: (prefecture: Prefecture, city: City) => void;
}

/**
 * 責務:
 * - モーダル表示制御
 * - 2段階選択UIの管理
 * - 選択状態に応じた表示切替
 *
 * 状態:
 * - step: 'prefecture' | 'city'
 * - selectedPrefecture: Prefecture | null
 *
 * 子コンポーネント:
 * - PrefectureList
 * - CityList
 */
```

**レイアウト**:

```
+----------------------------------------+
| [←] 都道府県を選択                [×]  |
+----------------------------------------+
| 🔍 検索...                             |  ← 絞り込み入力
+----------------------------------------+
| 北海道                                  |
| 青森県                                  |
| 岩手県                                  |
| ...                                    |
+----------------------------------------+
```

↓ 都道府県選択後

```
+----------------------------------------+
| [←] 京都府 - 市区町村を選択      [×]   |
+----------------------------------------+
| 🔍 検索...                             |
+----------------------------------------+
| 京都市                                  |
| 宇治市                                  |
| 舞鶴市                                  |
| ...                                    |
+----------------------------------------+
```

---

### 3.6 RegionSpotList

スポット一覧画面（UIモック準拠）。

```typescript
// src/components/region/RegionSpotList.tsx

interface Props {
  prefecture: Prefecture;
  city: City;
  onClose: () => void;
  onSpotSelect: (place: google.maps.places.PlaceResult) => void;
}

/**
 * 責務:
 * - フルスクリーンモーダルとして表示
 * - 地域サマリーカード表示
 * - カテゴリフィルター
 * - スポットグリッド表示
 * - 地図表示FAB
 *
 * 状態:
 * - spots: PlaceResult[]
 * - selectedCategory: string | null
 * - isLoading: boolean
 *
 * 子コンポーネント:
 * - RegionSummaryCard
 * - CategoryFilterChips
 * - SpotGrid
 */
```

**レイアウト（UIモック準拠）**:

```
+----------------------------------------+
| [←]        Kyoto, Japan          [★]   |  ← Sticky Header
+----------------------------------------+
| +------------------------------------+ |
| |     [地域画像]                     | |
| |     Kyoto                          | |  ← RegionSummaryCard
| |     説明文...         [地図]       | |
| +------------------------------------+ |
+----------------------------------------+
| [All] [観光] [飲食] [買物] [宿泊]      |  ← CategoryFilterChips (sticky)
+----------------------------------------+
| +--------+  +--------+                 |
| | [img]  |  | [img]  |                 |
| | ★4.9   |  | ★4.8   |                 |  ← SpotGrid
| | 金閣寺 |  | 伏見稲荷|                 |
| +--------+  +--------+                 |
+----------------------------------------+
|              [🗺 FAB]                  |  ← 地図で見る
+----------------------------------------+
```

---

### 3.7 SpotCard

個別スポットカード。

```typescript
// src/components/region/SpotCard.tsx

interface Props {
  place: google.maps.places.PlaceResult;
  onClick: () => void;
}

/**
 * 責務:
 * - スポット情報のカード表示
 * - 写真（アスペクト比4:3）
 * - 評価バッジ（右上）
 * - 名前・サブタイトル
 *
 * デザイン（UIモック準拠）:
 * - 角丸: rounded-xl
 * - 影: shadow-sm
 * - ホバー: scale-110 (画像部分)
 * - 評価バッジ: bg-white/90 backdrop-blur
 */
```

**スタイル詳細**:

```css
/* カード全体 */
display: flex;
flex-direction: column;
gap: 12px;
cursor: pointer;

/* 画像コンテナ */
aspect-ratio: 4/3;
border-radius: 12px;
overflow: hidden;

/* 画像ホバー */
transition: transform 500ms;
:hover {
  transform: scale(1.1);
}

/* 評価バッジ */
position: absolute;
top: 8px;
right: 8px;
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(4px);
border-radius: 9999px;
padding: 4px 8px;

/* タイトル */
font-weight: bold;
line-clamp: 1;

/* サブタイトル */
color: slate-500;
font-size: 14px;
line-clamp: 1;
```

---

### 3.8 CategoryFilterChips

カテゴリフィルター。

```typescript
// src/components/region/CategoryFilterChips.tsx

interface Props {
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

const CATEGORIES = [
  { key: null, label: "All" },
  { key: "tourist_attraction", label: "観光" },
  { key: "restaurant", label: "飲食" },
  { key: "shopping_mall", label: "買物" },
  { key: "lodging", label: "宿泊" },
];

/**
 * 責務:
 * - カテゴリチップの横スクロール表示
 * - 選択状態の管理
 *
 * デザイン:
 * - 選択中: bg-primary text-white
 * - 未選択: bg-white border
 * - 横スクロール、スクロールバー非表示
 */
```

---

## 4. SearchBar 改修

### 4.1 現在の実装

```typescript
// 現在
<Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
  <input ... />
</Autocomplete>
```

### 4.2 改修後の実装

```typescript
// 改修後
const { query, setQuery, predictions, richDetails, isLoading } = useSuggestionStore();
const { handleSelect } = useAutocomplete();

return (
  <div className="relative">
    <div className="flex items-center ...">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        ...
      />
      <RegionSearchButton onClick={openRegionModal} />
    </div>

    {showSuggestions && predictions.length > 0 && (
      <CustomSuggestionList
        predictions={predictions}
        richDetails={richDetails}
        isLoading={isLoading}
        onSelect={handleSelect}
        onClose={() => setShowSuggestions(false)}
      />
    )}
  </div>
);
```

### 4.3 維持する機能

- Enterキーでの検索確定
- 入力クリア機能
- ルート検索ボタン
- 地図移動・PlaceDetailsPanel連携

---

## 5. レスポンシブ対応

### 5.1 ブレークポイント

| デバイス | 幅         | サジェスト表示 | 地域検索表示   |
| -------- | ---------- | -------------- | -------------- |
| Desktop  | ≥1024px    | ドロップダウン | モーダル       |
| Tablet   | 768-1023px | ドロップダウン | モーダル       |
| Mobile   | <768px     | BottomSheet    | フルスクリーン |

### 5.2 モバイル専用調整

- サジェスト: 最大5件表示
- スポットグリッド: 2カラム維持
- FAB: 画面下部に固定
- ヘッダー: sticky

---

## 6. アクセシビリティ

| 要素                     | 対応                                         |
| ------------------------ | -------------------------------------------- |
| キーボードナビゲーション | 上下矢印で候補移動、Enterで選択、Escで閉じる |
| スクリーンリーダー       | aria-label, aria-selected, role="listbox"    |
| フォーカス管理           | 候補選択後は検索バーにフォーカス戻す         |
| コントラスト             | WCAG AA準拠                                  |

---

## 7. 状態管理フロー

### 7.1 リッチサジェスト

```
[ユーザー入力]
     ↓
[suggestionStore.setQuery()]
     ↓ debounce 300ms
[useAutocomplete.fetchPredictions()]
     ↓
[AutocompleteService.getPlacePredictions()]
     ↓
[suggestionStore.setPredictions()]
     ↓
[上位3件のplace_idを抽出]
     ↓ 並列
[PlacesService.getDetails() × 3]
     ↓
[suggestionStore.setRichDetail()]
     ↓
[CustomSuggestionList 再描画]
```

### 7.2 候補選択

```
[ユーザーが候補クリック or Enter]
     ↓
[PlacesService.getDetails() で完全情報取得]
     ↓
[selectedPlaceStore.setPlace()]
     ↓
[panTo() で地図移動]
     ↓
[PlaceDetailsPanel 表示]
```

---

## 8. エラーハンドリング

| 状況                       | 対応                                               |
| -------------------------- | -------------------------------------------------- |
| AutocompleteService エラー | コンソールログ、ユーザーには表示なし               |
| Place Details 取得失敗     | 該当候補はSimpleSuggestionItemにフォールバック     |
| nearbySearch 0件           | 「この地域にはスポットが見つかりませんでした」表示 |
| 写真なし                   | プレースホルダー画像表示                           |
| ネットワークエラー         | トースト通知                                       |
