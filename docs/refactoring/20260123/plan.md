# 実装計画書: 検索機能強化

## 1. 概要

### 1.1 対象Feature

旅行計画アプリの検索体験を質的に向上させる「リッチサジェスト」と「地域ドリルダウン」機能の実装。

### 1.2 カバーするスコープ

| 機能             | 説明                                                      |
| ---------------- | --------------------------------------------------------- |
| リッチサジェスト | 検索候補に写真・評価を表示するカスタムUI                  |
| 地域ドリルダウン | 都道府県 → 市区町村 → 観光地一覧の探索導線                |
| 既存機能連携     | 地図フォーカス、PlaceDetailsPanel表示、AddPlaceButton連携 |

### 1.3 技術スタック

- React 18 + TypeScript + Vite
- Zustand (状態管理)
- @react-google-maps/api
- Tailwind CSS

---

## 2. フェーズ構成

```
Phase 1: リッチサジェスト基盤（3-4日）
    ├── 1.1 PlacesApiService 新設
    ├── 1.2 suggestionStore 新設
    ├── 1.3 useAutocomplete フック新設
    ├── 1.4 CustomSuggestionList コンポーネント群実装
    └── 1.5 SearchBar 改修
            ↓
Phase 2: 地域マスタ・選択UI（2-3日）
    ├── 2.1 地域マスタJSON作成
    ├── 2.2 regionSearchStore 新設
    ├── 2.3 RegionSelectorModal 実装
    └── 2.4 RegionSearchButton 追加・統合
            ↓
Phase 3: スポット一覧（3-4日）
    ├── 3.1 useNearbySearch フック新設
    ├── 3.2 RegionSpotList 実装
    ├── 3.3 SpotCard / SpotGrid 実装
    └── 3.4 CategoryFilterChips 実装
            ↓
Phase 4: 統合・調整（2-3日）
    ├── 4.1 モバイル対応（BottomSheet）
    ├── 4.2 エラーハンドリング統合
    ├── 4.3 パフォーマンス最適化
    └── 4.4 テスト・品質保証
```

### 2.1 フェーズ間依存関係

| Phase   | 依存元    | 依存内容                                                |
| ------- | --------- | ------------------------------------------------------- |
| Phase 2 | Phase 1   | PlacesApiService（nearbySearch機能）、SearchBar改修完了 |
| Phase 3 | Phase 2   | regionSearchStore、地域マスタ                           |
| Phase 4 | Phase 1-3 | すべてのコンポーネント・フック                          |

---

## 3. ファイル変更一覧

### 3.1 新規作成ファイル

| ファイルパス                                     | 種別      | フェーズ | 説明                                 |
| ------------------------------------------------ | --------- | -------- | ------------------------------------ |
| `src/services/placesApiService.ts`               | Service   | 1.1      | Google Places API ラッパー           |
| `src/store/suggestionStore.ts`                   | Store     | 1.2      | サジェスト状態管理                   |
| `src/store/regionSearchStore.ts`                 | Store     | 2.2      | 地域検索状態管理                     |
| `src/hooks/useAutocomplete.ts`                   | Hook      | 1.3      | Autocomplete ロジック                |
| `src/hooks/useNearbySearch.ts`                   | Hook      | 3.1      | Nearby Search ロジック               |
| `src/hooks/usePlaceDetails.ts`                   | Hook      | 1.3      | Place Details 取得                   |
| `src/components/search/CustomSuggestionList.tsx` | Component | 1.4      | サジェストリスト                     |
| `src/components/search/RichSuggestionItem.tsx`   | Component | 1.4      | リッチサジェスト行                   |
| `src/components/search/SimpleSuggestionItem.tsx` | Component | 1.4      | シンプルサジェスト行                 |
| `src/components/search/RegionSearchButton.tsx`   | Component | 2.4      | 地域検索ボタン                       |
| `src/components/search/index.ts`                 | Barrel    | 1.4      | エクスポート集約                     |
| `src/components/region/RegionSelectorModal.tsx`  | Component | 2.3      | 地域選択モーダル                     |
| `src/components/region/PrefectureList.tsx`       | Component | 2.3      | 都道府県一覧                         |
| `src/components/region/CityList.tsx`             | Component | 2.3      | 市区町村一覧                         |
| `src/components/region/RegionSpotList.tsx`       | Component | 3.2      | スポット一覧画面                     |
| `src/components/region/RegionSummaryCard.tsx`    | Component | 3.2      | 地域サマリーカード                   |
| `src/components/region/SpotCard.tsx`             | Component | 3.3      | スポットカード                       |
| `src/components/region/SpotGrid.tsx`             | Component | 3.3      | スポットグリッド                     |
| `src/components/region/CategoryFilterChips.tsx`  | Component | 3.4      | カテゴリフィルター                   |
| `src/components/region/index.ts`                 | Barrel    | 3.4      | エクスポート集約                     |
| `src/types/region.ts`                            | Type      | 2.1      | 地域型定義                           |
| `src/data/regions/prefectures.json`              | Data      | 2.1      | 都道府県マスタ                       |
| `src/data/regions/cities/tokyo.json`             | Data      | 2.1      | 東京都市区町村                       |
| `src/data/regions/cities/kyoto.json`             | Data      | 2.1      | 京都府市区町村                       |
| `src/data/regions/cities/*.json`                 | Data      | 2.1      | 各都道府県市区町村（主要観光地優先） |
| `public/placeholders/place.svg`                  | Asset     | 1.4      | 写真なし時プレースホルダー           |

### 3.2 変更ファイル

| ファイルパス                   | 変更内容                                 | フェーズ |
| ------------------------------ | ---------------------------------------- | -------- |
| `src/components/SearchBar.tsx` | Autocompleteラッパー削除、カスタムUI統合 | 1.5      |

### 3.3 変更なし（再利用）

| ファイルパス                           | 用途                                  |
| -------------------------------------- | ------------------------------------- |
| `src/store/selectedPlaceStore.ts`      | 選択されたPlace保持（既存API維持）    |
| `src/store/savedPlacesStore.ts`        | 旅行計画の候補地リスト（既存API維持） |
| `src/hooks/useGoogleMaps.ts`           | 地図操作（既存API維持）               |
| `src/components/PlaceDetailsPanel.tsx` | スポット詳細表示（再利用）            |
| `src/components/AddPlaceButton.tsx`    | 旅行計画への追加（再利用）            |

---

## 4. Phase 1: リッチサジェスト基盤

### 4.1 タスク 1.1: PlacesApiService 新設

**目的**: Google Places API 呼び出しを一元管理し、キャッシュ・セッション管理を実装する。

**入力（依存）**:

- `useGoogleMaps` から `map` インスタンス
- Google Places API ライブラリ

**出力**:

- `src/services/placesApiService.ts`

**実装内容**:

```typescript
// シングルトンパターン
export function getPlacesApiService(map?: google.maps.Map): PlacesApiService;

class PlacesApiService {
  // Autocomplete
  startNewSession(): void;
  getPredictions(input: string, options?): Promise<AutocompletePrediction[]>;
  endSession(): void;

  // Place Details
  getDetailsForSuggestion(placeId: string): Promise<PlaceResult | null>;
  getFullDetails(placeId: string): Promise<PlaceResult | null>;

  // Nearby Search
  searchNearbySpots(location, options?): Promise<PlaceResult[]>;
  loadMoreSpots(): Promise<PlaceResult[]>;

  // Cache
  private detailsCache: Map<string, { data: PlaceResult; timestamp: number }>;
}
```

**完了条件**:

- [ ] AutocompleteService ラッパーが動作する
- [ ] PlacesService ラッパーが動作する
- [ ] セッショントークン管理が正しく機能する
- [ ] キャッシュ機能（TTL 5分）が動作する
- [ ] エラーハンドリングが実装されている

**推定時間**: 4時間

---

### 4.2 タスク 1.2: suggestionStore 新設

**目的**: サジェスト関連の状態を一元管理する Zustand store を作成する。

**入力（依存）**:

- Zustand ライブラリ
- Google Places 型定義

**出力**:

- `src/store/suggestionStore.ts`

**実装内容**:

```typescript
interface SuggestionState {
  query: string;
  predictions: AutocompletePrediction[];
  richDetails: Map<string, PlaceResult>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  setPredictions: (predictions: AutocompletePrediction[]) => void;
  setRichDetail: (placeId: string, detail: PlaceResult) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}
```

**完了条件**:

- [ ] Store が正しく初期化される
- [ ] 各アクションが状態を正しく更新する
- [ ] Map 型の richDetails が正しく動作する

**推定時間**: 1時間

---

### 4.3 タスク 1.3: useAutocomplete フック新設

**目的**: Autocomplete ロジックをカスタムフックに抽出し、再利用可能にする。

**入力（依存）**:

- `PlacesApiService` (タスク 1.1)
- `suggestionStore` (タスク 1.2)
- `useSelectedPlaceStore` (既存)
- `useGoogleMaps` (既存)

**出力**:

- `src/hooks/useAutocomplete.ts`
- `src/hooks/usePlaceDetails.ts`

**実装内容**:

```typescript
export function useAutocomplete() {
  // debounce 300ms
  const handleQueryChange: (newQuery: string) => void;

  // 候補選択 -> PlaceDetails取得 -> selectedPlaceStore更新 -> panTo
  const handleSelect: (placeId: string) => Promise<void>;

  return { query, handleQueryChange, handleSelect, clear };
}
```

**完了条件**:

- [ ] debounce (300ms) が正しく機能する
- [ ] 予測結果取得後、上位3件の Details を並列取得する
- [ ] 候補選択時に selectedPlaceStore と panTo が呼ばれる
- [ ] クリーンアップでタイマーが解除される

**推定時間**: 3時間

---

### 4.4 タスク 1.4: CustomSuggestionList コンポーネント群実装

**目的**: カスタムサジェストUIを構築する。

**入力（依存）**:

- `suggestionStore` (タスク 1.2)

**出力**:

- `src/components/search/CustomSuggestionList.tsx`
- `src/components/search/RichSuggestionItem.tsx`
- `src/components/search/SimpleSuggestionItem.tsx`
- `src/components/search/index.ts`
- `public/placeholders/place.svg`

**実装内容**:

#### CustomSuggestionList

- サジェスト候補リストのコンテナ
- 上位3件は RichSuggestionItem、4件目以降は SimpleSuggestionItem
- キーボードナビゲーション（上下矢印、Enter、Escape）
- 外側クリックで閉じる
- ローディング状態表示

#### RichSuggestionItem

- 写真サムネイル（48x48px）
- 場所名・住所
- 評価・レビュー件数
- スケルトンUI（詳細読み込み中）

#### SimpleSuggestionItem

- 場所名・住所のみ
- コンパクトなレイアウト

**完了条件**:

- [ ] 上位3件にリッチ情報（写真・評価）が表示される
- [ ] 4件目以降はテキストのみ表示
- [ ] キーボードナビゲーションが動作する
- [ ] 外側クリックでリストが閉じる
- [ ] スケルトンUIが表示される（詳細読み込み中）
- [ ] 写真がない場合はプレースホルダーが表示される

**推定時間**: 6時間

---

### 4.5 タスク 1.5: SearchBar 改修

**目的**: 既存の Autocomplete ラッパーを削除し、カスタムUIを統合する。

**入力（依存）**:

- `useAutocomplete` (タスク 1.3)
- `CustomSuggestionList` (タスク 1.4)
- 既存 `SearchBar.tsx`

**出力**:

- `src/components/SearchBar.tsx` (改修)

**変更内容**:

```diff
- import { Autocomplete } from "@react-google-maps/api";
+ import { useAutocomplete } from '../hooks/useAutocomplete';
+ import { useSuggestionStore } from '../store/suggestionStore';
+ import CustomSuggestionList from './search/CustomSuggestionList';

export default function SearchBar({ ... }) {
+   const { query, handleQueryChange, handleSelect, clear } = useAutocomplete();
+   const { predictions } = useSuggestionStore();
+   const [showSuggestions, setShowSuggestions] = useState(false);

    return (
      <div className="fixed z-50 ...">
-       <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
-         <input ... />
-       </Autocomplete>
+       <div className="relative flex-1">
+         <input
+           value={query}
+           onChange={(e) => {
+             handleQueryChange(e.target.value);
+             setShowSuggestions(true);
+           }}
+           onFocus={() => setShowSuggestions(true)}
+           ...
+         />
+         {showSuggestions && predictions.length > 0 && (
+           <CustomSuggestionList
+             onSelect={(placeId) => {
+               handleSelect(placeId);
+               setShowSuggestions(false);
+             }}
+             onClose={() => setShowSuggestions(false)}
+           />
+         )}
+       </div>

        {/* 既存のボタン群（クリア、検索、ナビゲーション）は維持 */}
      </div>
    );
}
```

**維持する機能**:

- Enter キーでの検索確定
- 入力クリア機能
- ルート検索ボタン
- 地図移動・PlaceDetailsPanel連携
- inputRef の維持

**完了条件**:

- [ ] Autocomplete ラッパーが削除されている
- [ ] カスタムサジェストUIが統合されている
- [ ] 既存機能（Enter検索、クリア、ルート検索）が動作する
- [ ] selectedPlaceStore への連携が正しく動作する
- [ ] panTo による地図移動が正しく動作する

**推定時間**: 4時間

---

## 5. Phase 2: 地域マスタ・選択UI

### 5.1 タスク 2.1: 地域マスタJSON作成

**目的**: 都道府県・市区町村の静的マスタデータを作成する。

**入力（依存）**:

- なし（独立タスク）

**出力**:

- `src/types/region.ts`
- `src/data/regions/prefectures.json`
- `src/data/regions/cities/*.json`

**実装内容**:

#### 型定義

```typescript
// src/types/region.ts
interface Prefecture {
  code: string; // "13"
  name: string; // "東京都"
  nameEn: string; // "Tokyo"
  center: LatLng; // 代表座標
}

interface City {
  code: string; // "13101"
  name: string; // "千代田区"
  nameEn: string; // "Chiyoda"
  center: LatLng; // 代表座標
  searchRadius: number; // 検索半径（m）
}
```

#### 初期対象都市（主要観光地優先）

- 北海道（札幌市、函館市、小樽市）
- 東京都（23区、八王子市、町田市）
- 神奈川県（横浜市、鎌倉市、箱根町）
- 京都府（京都市、宇治市）
- 大阪府（大阪市、堺市）
- 沖縄県（那覇市、名護市）
- 他主要観光地（約50都市）

**完了条件**:

- [ ] 47都道府県のデータが作成されている
- [ ] 主要50都市の市区町村データが作成されている
- [ ] 各市区町村に center と searchRadius が設定されている
- [ ] TypeScript 型定義が作成されている

**推定時間**: 4時間

---

### 5.2 タスク 2.2: regionSearchStore 新設

**目的**: 地域検索の状態を一元管理する Zustand store を作成する。

**入力（依存）**:

- `src/types/region.ts` (タスク 2.1)

**出力**:

- `src/store/regionSearchStore.ts`

**実装内容**:

```typescript
interface RegionSearchState {
  isModalOpen: boolean;
  isSpotListOpen: boolean;
  selectedPrefecture: Prefecture | null;
  selectedCity: City | null;
  spots: PlaceResult[];
  selectedCategory: string | null;
  isLoading: boolean;

  // Modal actions
  openModal: () => void;
  closeModal: () => void;

  // Selection actions
  selectPrefecture: (prefecture: Prefecture) => void;
  selectCity: (city: City) => void;
  clearSelection: () => void;

  // Spot list actions
  openSpotList: () => void;
  closeSpotList: () => void;
  setSpots: (spots: PlaceResult[]) => void;
  setCategory: (category: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}
```

**完了条件**:

- [ ] Store が正しく初期化される
- [ ] モーダル開閉が正しく動作する
- [ ] 都道府県・市区町村選択が正しく動作する
- [ ] スポット一覧状態が正しく管理される

**推定時間**: 2時間

---

### 5.3 タスク 2.3: RegionSelectorModal 実装

**目的**: 都道府県・市区町村を選択する2段階モーダルを実装する。

**入力（依存）**:

- `regionSearchStore` (タスク 2.2)
- 地域マスタJSON (タスク 2.1)

**出力**:

- `src/components/region/RegionSelectorModal.tsx`
- `src/components/region/PrefectureList.tsx`
- `src/components/region/CityList.tsx`

**実装内容**:

#### RegionSelectorModal

- 2段階選択UIの管理（step: 'prefecture' | 'city'）
- 戻るボタンで前の段階へ
- 検索/絞り込み機能
- 市区町村選択で SpotList 画面へ遷移

#### PrefectureList

- 都道府県一覧表示
- 絞り込み検索対応

#### CityList

- 市区町村一覧表示
- 動的インポート（コード分割）

**完了条件**:

- [ ] 都道府県一覧が表示される
- [ ] 都道府県選択で市区町村一覧に遷移する
- [ ] 戻るボタンで前の段階に戻れる
- [ ] 検索/絞り込みが機能する
- [ ] 市区町村選択で SpotList 画面に遷移する
- [ ] モバイル/デスクトップで適切に表示される

**推定時間**: 6時間

---

### 5.4 タスク 2.4: RegionSearchButton 追加・統合

**目的**: 「地域から探す」ボタンを SearchBar に追加し、モーダルと連携する。

**入力（依存）**:

- `RegionSelectorModal` (タスク 2.3)
- 改修済み `SearchBar.tsx` (タスク 1.5)

**出力**:

- `src/components/search/RegionSearchButton.tsx`
- `src/components/SearchBar.tsx` (追加改修)

**実装内容**:

```typescript
// RegionSearchButton.tsx
interface Props {
  onClick: () => void;
}

export default function RegionSearchButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-system-secondary-label ..."
      title="地域から探す"
    >
      <MdExplore size={18} />
      <span className="hidden md:inline ml-1">地域から探す</span>
    </button>
  );
}
```

**完了条件**:

- [ ] ボタンが SearchBar 内に表示される
- [ ] クリックで RegionSelectorModal が開く
- [ ] デスクトップではテキスト表示、モバイルではアイコンのみ

**推定時間**: 2時間

---

## 6. Phase 3: スポット一覧

### 6.1 タスク 3.1: useNearbySearch フック新設

**目的**: Nearby Search ロジックをカスタムフックに抽出する。

**入力（依存）**:

- `PlacesApiService` (タスク 1.1)
- `regionSearchStore` (タスク 2.2)

**出力**:

- `src/hooks/useNearbySearch.ts`

**実装内容**:

```typescript
export function useNearbySearch() {
  const { selectedCity, selectedCategory, setSpots, setLoading } =
    useRegionSearchStore();

  const searchSpots = async () => {
    if (!selectedCity) return;
    setLoading(true);
    try {
      const service = getPlacesApiService();
      const spots = await service.searchNearbySpots(
        selectedCity.center,
        {
          radius: selectedCity.searchRadius,
          type: selectedCategory || 'tourist_attraction',
        }
      );
      setSpots(spots);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => { ... };

  return { searchSpots, loadMore };
}
```

**完了条件**:

- [ ] selectedCity が設定されたら検索できる
- [ ] カテゴリフィルターが機能する
- [ ] Load More で追加取得できる
- [ ] エラーハンドリングが実装されている

**推定時間**: 2時間

---

### 6.2 タスク 3.2: RegionSpotList 実装

**目的**: スポット一覧画面（フルスクリーン）を実装する。

**入力（依存）**:

- `useNearbySearch` (タスク 3.1)
- `regionSearchStore` (タスク 2.2)
- `SpotGrid` (タスク 3.3)
- `CategoryFilterChips` (タスク 3.4)

**出力**:

- `src/components/region/RegionSpotList.tsx`
- `src/components/region/RegionSummaryCard.tsx`

**実装内容**:

#### RegionSpotList

- フルスクリーンモーダル
- Sticky ヘッダー（戻る、地域名、お気に入りボタン）
- 地域サマリーカード
- カテゴリフィルター（sticky）
- スポットグリッド
- 地図で見る FAB

#### RegionSummaryCard

- 地域の代表画像
- 地域名
- 簡易説明
- 地図アイコン

**完了条件**:

- [ ] フルスクリーンモーダルとして表示される
- [ ] ヘッダーが sticky で固定される
- [ ] 地域サマリーカードが表示される
- [ ] カテゴリフィルターが機能する
- [ ] スポットグリッドが表示される
- [ ] FAB で地図表示に切り替えられる

**推定時間**: 6時間

---

### 6.3 タスク 3.3: SpotCard / SpotGrid 実装

**目的**: スポット表示用のカードコンポーネントとグリッドレイアウトを実装する。

**入力（依存）**:

- `regionSearchStore` (タスク 2.2)

**出力**:

- `src/components/region/SpotCard.tsx`
- `src/components/region/SpotGrid.tsx`

**実装内容**:

#### SpotCard

- 写真（アスペクト比 4:3）
- 評価バッジ（右上）
- 名前・サブタイトル
- ホバーで画像スケール
- クリックで PlaceDetailsPanel 表示

#### SpotGrid

- 2カラムグリッド
- レスポンシブ対応
- 遅延読み込み対応

**完了条件**:

- [ ] カードが正しく表示される
- [ ] 2カラムグリッドでレイアウトされる
- [ ] クリックで PlaceDetailsPanel が表示される
- [ ] selectedPlaceStore が更新される
- [ ] 地図が panTo される

**推定時間**: 4時間

---

### 6.4 タスク 3.4: CategoryFilterChips 実装

**目的**: カテゴリフィルターチップを実装する。

**入力（依存）**:

- `regionSearchStore` (タスク 2.2)
- `useNearbySearch` (タスク 3.1)

**出力**:

- `src/components/region/CategoryFilterChips.tsx`
- `src/components/region/index.ts`

**実装内容**:

```typescript
const CATEGORIES = [
  { key: null, label: "All" },
  { key: "tourist_attraction", label: "観光" },
  { key: "restaurant", label: "飲食" },
  { key: "shopping_mall", label: "買物" },
  { key: "lodging", label: "宿泊" },
];
```

**完了条件**:

- [ ] カテゴリチップが横スクロールで表示される
- [ ] 選択状態が視覚的に区別される
- [ ] 選択変更で検索が再実行される
- [ ] スクロールバーが非表示

**推定時間**: 2時間

---

## 7. Phase 4: 統合・調整

### 7.1 タスク 4.1: モバイル対応（BottomSheet）

**目的**: モバイルデバイスで最適なUIを提供する。

**入力（依存）**:

- 全コンポーネント (Phase 1-3)

**出力**:

- サジェスト: BottomSheet 形式
- 地域スポット一覧: フルスクリーンモーダル

**実装内容**:

```typescript
// useDeviceDetect を活用
const { isMobile } = useDeviceDetect();

{isMobile ? (
  <BottomSheet isOpen={showSuggestions} onClose={...}>
    <CustomSuggestionList ... />
  </BottomSheet>
) : (
  <CustomSuggestionList ... />
)}
```

**完了条件**:

- [ ] モバイルでサジェストが BottomSheet で表示される
- [ ] モバイルで地域スポット一覧がフルスクリーンで表示される
- [ ] タッチ操作が快適（最低44pxのタップ領域）
- [ ] FAB が画面下部に固定される

**推定時間**: 4時間

---

### 7.2 タスク 4.2: エラーハンドリング統合

**目的**: すべてのAPI呼び出しに適切なエラーハンドリングを実装する。

**入力（依存）**:

- `PlacesApiService` (タスク 1.1)
- 全フック (Phase 1-3)

**出力**:

- エラー時のユーザー通知
- フォールバック表示

**実装内容**:

| 状況                       | 対応                                   |
| -------------------------- | -------------------------------------- |
| AutocompleteService エラー | コンソールログ、ユーザーには表示なし   |
| Place Details 取得失敗     | SimpleSuggestionItem にフォールバック  |
| nearbySearch 0件           | 「スポットが見つかりませんでした」表示 |
| 写真なし                   | プレースホルダー画像表示               |
| ネットワークエラー         | トースト通知                           |
| OVER_QUERY_LIMIT           | リトライ + ユーザー通知                |

**完了条件**:

- [ ] すべてのAPI呼び出しにエラーハンドリングがある
- [ ] ユーザーに適切なフィードバックが表示される
- [ ] アプリがクラッシュしない

**推定時間**: 3時間

---

### 7.3 タスク 4.3: パフォーマンス最適化

**目的**: パフォーマンスを最適化し、ユーザー体験を向上させる。

**入力（依存）**:

- 全コンポーネント・フック (Phase 1-3)

**出力**:

- 最適化されたコード

**チェックリスト**:

- [ ] debounce が正しく動作している
- [ ] キャッシュが効いている（同一place_idの再取得なし）
- [ ] 不要な再レンダリングがない（React DevTools で確認）
- [ ] 画像サイズが適切（サムネイルは100px以下）
- [ ] メモリリークがない（useEffect のクリーンアップ）
- [ ] 地域マスタの動的インポートが機能している
- [ ] Bundle サイズ増加が許容範囲内

**完了条件**:

- [ ] Lighthouse スコアが著しく低下していない
- [ ] 初回レンダリング時間が許容範囲内
- [ ] メモリ使用量が安定している

**推定時間**: 4時間

---

### 7.4 タスク 4.4: テスト・品質保証

**目的**: 機能が正しく動作することを確認する。

**入力（依存）**:

- 全実装 (Phase 1-4)

**出力**:

- テストコード（任意）
- 手動テスト結果

**テスト戦略**:

#### 手動テスト項目

**リッチサジェスト**:

- [ ] 検索入力時、カスタムUIでサジェスト候補が表示される
- [ ] 上位3件には写真サムネイル・星評価が表示される
- [ ] 候補選択時、地図が移動しPlaceDetailsPanelが表示される
- [ ] Enterキー確定時も同様に動作する
- [ ] 入力はdebounce（300ms程度）される
- [ ] モバイルではBottomSheet形式で表示される

**地域ドリルダウン**:

- [ ] 検索バー横に「地域から探す」ボタンが表示される
- [ ] 都道府県一覧 → 市区町村選択 の階層UIが機能する
- [ ] 市区町村選択後、観光地一覧がグリッド表示される
- [ ] 各観光地カードに写真・評価が表示される
- [ ] 観光地タップで地図フォーカス＋PlaceDetailsPanel表示
- [ ] 観光地から旅行計画への追加が可能（AddPlaceButton連携）
- [ ] カテゴリフィルター（観光・飲食・買物など）が機能する

**非機能要件**:

- [ ] APIコール数が適切に制限されている
- [ ] デスクトップ・タブレット・モバイルで適切に表示される
- [ ] 既存のPlaceDetailsPanel・AddPlaceButtonの動作が壊れていない

**完了条件**:

- [ ] すべての手動テスト項目がパス
- [ ] リグレッションがない

**推定時間**: 4時間

---

## 8. マイルストーン

### 8.1 マイルストーン定義

| マイルストーン       | 達成条件                             | 目標日     |
| -------------------- | ------------------------------------ | ---------- |
| M1: 基盤完成         | Phase 1 完了、リッチサジェストが動作 | 開始後4日  |
| M2: 地域選択完成     | Phase 2 完了、地域選択モーダルが動作 | 開始後7日  |
| M3: スポット一覧完成 | Phase 3 完了、スポット一覧が動作     | 開始後11日 |
| M4: リリース準備完了 | Phase 4 完了、全テストパス           | 開始後14日 |

### 8.2 進捗判断の節目

#### M1: 基盤完成

- PlacesApiService が API を正しく呼び出せる
- カスタムサジェストUIが表示される
- 候補選択で地図移動・詳細パネル表示ができる

#### M2: 地域選択完成

- 「地域から探す」ボタンが表示される
- 都道府県 → 市区町村の選択ができる
- 選択後に SpotList 画面に遷移する

#### M3: スポット一覧完成

- スポットがグリッド表示される
- カテゴリフィルターが機能する
- スポット選択で地図移動・詳細パネル表示ができる

#### M4: リリース準備完了

- 全テスト項目がパス
- パフォーマンスが許容範囲内
- ドキュメントが更新されている

---

## 9. リスクと対策

### 9.1 技術的リスク

| リスク                            | 影響度 | 発生確率 | 対策                                       |
| --------------------------------- | ------ | -------- | ------------------------------------------ |
| API課金増加                       | 中     | 高       | Details取得を3件に限定、キャッシュ活用     |
| SearchBar改修によるリグレッション | 高     | 中       | Feature Flagで切り替え可能に、旧コード退避 |
| Details取得遅延                   | 中     | 中       | 段階的表示、スケルトンUI                   |
| Nearby Search結果品質             | 中     | 中       | Text Searchへのフォールバック              |

### 9.2 プロセス的リスク

| リスク                         | 影響度 | 発生確率 | 対策                         |
| ------------------------------ | ------ | -------- | ---------------------------- |
| 地域マスタ作成に時間がかかる   | 低     | 中       | 主要50都市に限定、段階的拡張 |
| モバイルUIの調整に時間がかかる | 中     | 中       | 早期にモバイルでの動作確認   |

### 9.3 ロールバック手順

Phase 1 でリグレッションが発生した場合:

1. `<Autocomplete>` コンポーネントの復元
2. カスタムUI関連のimport削除
3. suggestionStore の無効化
4. SearchBar を元の状態に戻す

---

## 10. Acceptance Criteria との対応

### 10.1 リッチサジェスト

| Acceptance Criteria                                   | 対応タスク |
| ----------------------------------------------------- | ---------- |
| 検索入力時、カスタムUIでサジェスト候補が表示される    | 1.4, 1.5   |
| 上位3件には写真サムネイル・星評価が表示される         | 1.3, 1.4   |
| 候補選択時、地図が移動しPlaceDetailsPanelが表示される | 1.3, 1.5   |
| Enterキー確定時も同様に動作する                       | 1.5        |
| 入力はdebounce（300ms程度）される                     | 1.3        |
| モバイルではBottomSheet形式で表示される               | 4.1        |

### 10.2 地域ドリルダウン

| Acceptance Criteria                                 | 対応タスク     |
| --------------------------------------------------- | -------------- |
| 検索バー横に「地域から探す」ボタンが表示される      | 2.4            |
| 都道府県一覧 → 市区町村選択 の階層UIが機能する      | 2.3            |
| 市区町村選択後、観光地一覧がグリッド表示される      | 3.2, 3.3       |
| 各観光地カードに写真・評価が表示される              | 3.3            |
| 観光地タップで地図フォーカス＋PlaceDetailsPanel表示 | 3.2, 3.3       |
| 観光地から旅行計画への追加が可能                    | 3.2 (既存連携) |
| カテゴリフィルターが機能する                        | 3.4            |

### 10.3 非機能要件

| Acceptance Criteria                            | 対応タスク |
| ---------------------------------------------- | ---------- |
| APIコール数が適切に制限されている              | 1.1, 4.3   |
| デスクトップ・タブレット・モバイルで適切に表示 | 4.1        |
| 既存機能の動作が壊れていない                   | 4.4        |

---

## 11. 実装順序サマリー

```
Day 1-2:
  └── 1.1 PlacesApiService 新設 (4h)
  └── 1.2 suggestionStore 新設 (1h)
  └── 1.3 useAutocomplete フック新設 (3h)

Day 3-4:
  └── 1.4 CustomSuggestionList コンポーネント群実装 (6h)
  └── 1.5 SearchBar 改修 (4h)
  └── [M1: 基盤完成]

Day 5-6:
  └── 2.1 地域マスタJSON作成 (4h)
  └── 2.2 regionSearchStore 新設 (2h)
  └── 2.3 RegionSelectorModal 実装 (6h)

Day 7:
  └── 2.4 RegionSearchButton 追加・統合 (2h)
  └── [M2: 地域選択完成]

Day 8-9:
  └── 3.1 useNearbySearch フック新設 (2h)
  └── 3.2 RegionSpotList 実装 (6h)
  └── 3.3 SpotCard / SpotGrid 実装 (4h)

Day 10-11:
  └── 3.4 CategoryFilterChips 実装 (2h)
  └── [M3: スポット一覧完成]

Day 12-13:
  └── 4.1 モバイル対応 (4h)
  └── 4.2 エラーハンドリング統合 (3h)
  └── 4.3 パフォーマンス最適化 (4h)

Day 14:
  └── 4.4 テスト・品質保証 (4h)
  └── [M4: リリース準備完了]
```

---

## 12. 関連ドキュメント

- Feature Brief: `docs/refactoring/20260123/feature-brief.md`
- コンポーネント設計書: `docs/refactoring/20260123/component-design.md`
- API設計書: `docs/refactoring/20260123/api-design.md`
- 実装方針書: `docs/refactoring/20260123/implementation-plan.md`
- 懸念点・トレードオフ: `docs/refactoring/20260123/concerns-tradeoffs.md`

---

## 13. 承認

| 役割       | 名前    | 日付       | ステータス |
| ---------- | ------- | ---------- | ---------- |
| 作成者     | planner | 2026-01-23 | Draft      |
| レビュアー |         |            | Pending    |
| 承認者     |         |            | Pending    |
