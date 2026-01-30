# Feature Brief: 検索機能強化

## 概要

| 項目       | 内容                                                     |
| ---------- | -------------------------------------------------------- |
| タイトル   | 検索体験の質的向上 - リッチサジェスト & 地域ドリルダウン |
| 作成日     | 2026-01-23                                               |
| ステータス | Draft                                                    |
| ブランチ   | (TBD) feature/enhanced-search                            |

---

## 1. ゴール

旅行計画アプリとして**発見性・判断しやすさ**を重視した検索体験を実現する。

具体的には以下2点：

1. **リッチサジェスト**: 検索候補に写真・評価を表示し、場所の判断材料を即座に提供
2. **地域ドリルダウン**: 「都道府県 → 市区町村 → 観光地一覧」という探索導線を追加

**「東京」と入力したときに東京タワーだけで終わらない、探索の起点として強い検索体験**を目指す。

---

## 2. スコープ

### 2.1 In Scope

| 機能                 | 詳細                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| カスタムサジェストUI | Google標準Autocompleteを廃止し、`AutocompleteService.getPlacePredictions()` + カスタムUIに移行 |
| リッチ情報表示       | 上位3件に対してPlace Details取得（写真・rating・user_ratings_total）                           |
| 地域マスタ           | 都道府県・市区町村の静的JSONマスタを保持                                                       |
| 地域検索UI           | 「地域から探す」モーダル/パネルの実装                                                          |
| 地域スポット一覧     | Nearby Search / Text Search で観光地取得・グリッド表示                                         |
| 既存機能連携         | 地図フォーカス、PlaceDetailsPanel表示、AddPlaceButton連携                                      |

### 2.2 Out of Scope

| 除外項目                       | 理由                      |
| ------------------------------ | ------------------------- |
| カテゴリ別検索（飲食、宿泊等） | 将来フェーズで検討        |
| お気に入り地域の保存           | 本タスクでは対象外        |
| ランキング表示                 | 将来フェーズで検討        |
| 検索履歴の永続化               | 本タスクでは対象外        |
| 市区町村境界ポリゴン取得       | Google Places APIで非対応 |

---

## 3. 完了条件

以下すべてを満たした時点で本機能は完了とみなす。

### 3.1 リッチサジェスト

- [ ] 検索入力時、カスタムUIでサジェスト候補が表示される
- [ ] 上位3件には写真サムネイル・星評価が表示される
- [ ] 候補選択時、地図が移動しPlaceDetailsPanelが表示される
- [ ] Enterキー確定時も同様に動作する
- [ ] 入力はdebounce（300ms程度）される
- [ ] モバイルではBottomSheet形式で表示される

### 3.2 地域ドリルダウン

- [ ] 検索バー横に「地域から探す」ボタンが表示される
- [ ] 都道府県一覧 → 市区町村選択 の階層UIが機能する
- [ ] 市区町村選択後、観光地一覧がグリッド表示される
- [ ] 各観光地カードに写真・評価が表示される
- [ ] 観光地タップで地図フォーカス＋PlaceDetailsPanel表示
- [ ] 観光地から旅行計画への追加が可能（AddPlaceButton連携）
- [ ] カテゴリフィルター（観光・飲食・買物など）が機能する

### 3.3 非機能要件

- [ ] APIコール数が適切に制限されている（上限3件のDetails取得等）
- [ ] デスクトップ・タブレット・モバイルで適切に表示される
- [ ] 既存のPlaceDetailsPanel・AddPlaceButtonの動作が壊れていない

---

## 4. 技術的制約・設計方針

### 4.1 API利用

| 制約                        | 対応                       |
| --------------------------- | -------------------------- |
| Place Details APIは課金対象 | サジェスト上位3件のみ取得  |
| Nearby Searchは最大60件     | 20件/ページ、Load More対応 |
| リクエスト過多を防ぐ        | debounce 300ms             |

### 4.2 既存コード尊重

| 方針                          | 詳細                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| Zustand storeは既存構造を維持 | `useSelectedPlaceStore`、`useSavedPlacesStore` を引き続き使用 |
| 既存コンポーネント再利用      | `PlaceDetailsPanel`、`AddPlaceButton` は変更最小限            |
| 新規store追加可               | 地域選択状態やサジェスト結果用のstoreは新設OK                 |

### 4.3 拡張性

将来的なカテゴリ検索・ランキング機能を阻害しない設計とする。

---

## 5. ユーザーフロー

### 5.1 リッチサジェストフロー

```
[検索バーにフォーカス]
    ↓
[文字入力開始]
    ↓ debounce 300ms
[AutocompleteService.getPlacePredictions() 呼び出し]
    ↓
[予測結果取得（最大5件）]
    ↓
[上位3件に対してPlace Details取得（並列）]
    ↓
[カスタムサジェストUI表示]
  - 上位3件: 写真 + 名前 + 評価 + 住所
  - 4件目以降: 名前 + 住所のみ
    ↓
[候補をタップ or Enter]
    ↓
[selectedPlaceStoreに保存]
    ↓
[地図パン + PlaceDetailsPanel表示]
```

### 5.2 地域ドリルダウンフロー

```
[「地域から探す」ボタンタップ]
    ↓
[地域選択モーダル表示]
  - 都道府県リスト表示
    ↓
[都道府県選択（例: 京都府）]
    ↓
[市区町村リスト表示]
    ↓
[市区町村選択（例: 京都市）]
    ↓
[スポット一覧画面へ遷移]
  - ヘッダー: 戻るボタン + 地域名
  - 地域サマリーカード
  - カテゴリフィルター
  - スポットグリッド（2カラム）
    ↓
[スポットタップ]
    ↓
[地図パン + PlaceDetailsPanel表示]
    ↓
[AddPlaceButtonで旅行計画に追加可能]
```

---

## 6. 画面構成

### 6.1 デスクトップ

```
+------------------------------------------+
|  [SearchBar] [地域から探す]              |
+------------------------------------------+
|                                          |
|   +-- カスタムサジェスト ---------------+|
|   | [img] スポット名 ★4.5 (120件)       ||
|   |       住所...                       ||
|   +-------------------------------------+|
|   | [img] スポット名 ★4.2 (80件)        ||
|   +-------------------------------------+|
|   | スポット名（詳細なし）              ||
|   +-------------------------------------+|
|                                          |
|           [Google Map]                   |
|                                          |
+------------------------------------------+
```

### 6.2 地域スポット一覧（UIモック参照）

```
+------------------------------------------+
| [←]        Kyoto, Japan            [★]   |  ← ヘッダー
+------------------------------------------+
| +--------------------------------------+ |
| |     [大きな地域画像]                 | |
| |     Kyoto                            | |
| |     説明文...          [地図icon]    | |
| +--------------------------------------+ |
+------------------------------------------+
| [All] [観光] [飲食] [買物] [宿泊]       |  ← フィルター
+------------------------------------------+
| +--------+  +--------+                   |
| | [img]  |  | [img]  |                   |
| | ★4.9   |  | ★4.8   |                   |
| | 金閣寺 |  | 伏見稲荷|                   |  ← グリッド
| +--------+  +--------+                   |
| +--------+  +--------+                   |
| | [img]  |  | [img]  |                   |
| +--------+  +--------+                   |
+------------------------------------------+
|        [🗺 地図で見る FAB]              |
+------------------------------------------+
```

### 6.3 モバイル

- サジェスト: BottomSheet形式で下から表示
- 地域スポット一覧: フルスクリーンモーダル

---

## 7. コンポーネント構成

### 7.1 新規コンポーネント

| コンポーネント         | 責務                           |
| ---------------------- | ------------------------------ |
| `CustomSuggestionList` | カスタムサジェストUIの表示     |
| `RichSuggestionItem`   | 写真・評価付きのサジェスト行   |
| `SimpleSuggestionItem` | 名前・住所のみのサジェスト行   |
| `RegionSearchButton`   | 「地域から探す」ボタン         |
| `RegionSelectorModal`  | 都道府県・市区町村選択モーダル |
| `RegionSpotList`       | スポット一覧画面               |
| `RegionSummaryCard`    | 地域サマリーカード             |
| `SpotCard`             | 個別スポットカード             |
| `CategoryFilterChips`  | カテゴリフィルターチップ群     |

### 7.2 変更対象コンポーネント

| コンポーネント  | 変更内容                                                      |
| --------------- | ------------------------------------------------------------- |
| `SearchBar.tsx` | Autocompleteラッパーを削除、AutocompleteService直接使用に変更 |

### 7.3 変更なし（再利用）

| コンポーネント      | 用途             |
| ------------------- | ---------------- |
| `PlaceDetailsPanel` | スポット詳細表示 |
| `AddPlaceButton`    | 旅行計画への追加 |

---

## 8. Store設計

### 8.1 新規Store

```typescript
// suggestionStore.ts
interface SuggestionState {
  query: string;
  predictions: google.maps.places.AutocompletePrediction[];
  richDetails: Map<string, google.maps.places.PlaceResult>; // place_id -> details
  isLoading: boolean;
  setQuery: (query: string) => void;
  setPredictions: (predictions: AutocompletePrediction[]) => void;
  setRichDetail: (placeId: string, detail: PlaceResult) => void;
  clear: () => void;
}

// regionSearchStore.ts
interface RegionSearchState {
  isOpen: boolean;
  selectedPrefecture: string | null;
  selectedCity: string | null;
  spots: google.maps.places.PlaceResult[];
  selectedCategory: string | null;
  isLoading: boolean;
  // actions...
}
```

### 8.2 既存Store（変更なし）

- `useSelectedPlaceStore`: 選択されたPlace保持
- `useSavedPlacesStore`: 旅行計画の候補地リスト

---

## 9. API利用設計

### 9.1 リッチサジェスト

| API                                         | 用途               | 呼び出しタイミング       |
| ------------------------------------------- | ------------------ | ------------------------ |
| `AutocompleteService.getPlacePredictions()` | サジェスト候補取得 | 入力変更後300ms debounce |
| `PlacesService.getDetails()`                | 上位3件の詳細取得  | 予測結果取得後           |

**取得フィールド（Details）**:

- `place_id`, `name`, `geometry`, `formatted_address`
- `rating`, `user_ratings_total`, `photos`

### 9.2 地域スポット検索

| API                            | 用途               | パラメータ                                                      |
| ------------------------------ | ------------------ | --------------------------------------------------------------- |
| `PlacesService.nearbySearch()` | 地域内スポット取得 | location: 市中心座標, radius: 15000, type: `tourist_attraction` |

**代替案**: Text Searchで `"京都市 観光"` のようなクエリも可

### 9.3 API制限対策

| 対策                 | 実装方法                             |
| -------------------- | ------------------------------------ |
| debounce             | 入力から300ms待機                    |
| Details取得制限      | 上位3件のみ                          |
| nearbySearch結果制限 | 1ページ（20件）、Load Moreで追加取得 |
| キャッシュ           | 同一place_idの詳細は再取得しない     |

---

## 10. 地域マスタデータ

### 10.1 データ構造

```typescript
// types/region.ts
interface Prefecture {
  code: string; // "13"
  name: string; // "東京都"
  nameEn: string; // "Tokyo"
  center: LatLng; // 代表座標
  cities: City[];
}

interface City {
  code: string; // "13101"
  name: string; // "千代田区"
  nameEn: string; // "Chiyoda"
  center: LatLng; // 代表座標
  searchRadius: number; // 検索半径（m）
}
```

### 10.2 配置

```
src/
  data/
    regions/
      prefectures.json    # 都道府県一覧（47件）
      cities/
        tokyo.json        # 東京都の市区町村
        kyoto.json        # 京都府の市区町村
        ...
```

---

## 11. 懸念点・トレードオフ

### 11.1 API課金

| 懸念                       | 対策                       |
| -------------------------- | -------------------------- |
| Place Detailsの課金        | 上位3件に限定              |
| nearbySearchの連続呼び出し | ユーザーアクション起点のみ |

### 11.2 UX

| 懸念            | 対策                                         |
| --------------- | -------------------------------------------- |
| Details取得遅延 | 予測結果を先に表示し、詳細は非同期で追加表示 |
| 写真がない場所  | プレースホルダー画像を表示                   |

### 11.3 モバイル

| 懸念                     | 対策                                  |
| ------------------------ | ------------------------------------- |
| サジェストが画面を覆う   | BottomSheet形式で表示、最大5件        |
| 地域スポット一覧の操作性 | フルスクリーンモーダル＋FABで地図切替 |

### 11.4 既存機能への影響

| 懸念                            | 対策                                                 |
| ------------------------------- | ---------------------------------------------------- |
| SearchBar変更による既存動作破壊 | 選択後のフローは既存と同一（selectedPlaceStore経由） |

---

## 12. 実装フェーズ（推奨）

### Phase 1: リッチサジェスト基盤

1. `suggestionStore` 新設
2. `AutocompleteService` ラッパー実装
3. `CustomSuggestionList` コンポーネント実装
4. `SearchBar` 改修

### Phase 2: 地域マスタ・選択UI

1. 地域マスタJSON作成
2. `regionSearchStore` 新設
3. `RegionSelectorModal` 実装
4. `RegionSearchButton` 追加

### Phase 3: スポット一覧

1. `RegionSpotList` 実装
2. `SpotCard` 実装
3. `CategoryFilterChips` 実装
4. nearbySearch連携

### Phase 4: 統合・調整

1. モバイル対応（BottomSheet等）
2. パフォーマンス最適化
3. エラーハンドリング
4. テスト

---

## 13. 関連ドキュメント

- UIモック: `docs/refactoring/20260123/UI_design_refference/`
- 既存コード: `src/components/SearchBar.tsx`
- 既存Store: `src/store/selectedPlaceStore.ts`

---

## 14. 承認

| 役割       | 名前 | 日付       | ステータス |
| ---------- | ---- | ---------- | ---------- |
| 作成者     | (AI) | 2026-01-23 | Draft      |
| レビュアー |      |            | Pending    |
| 承認者     |      |            | Pending    |
