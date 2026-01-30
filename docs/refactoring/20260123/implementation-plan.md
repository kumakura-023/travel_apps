# 実装方針書: 検索機能強化

## 1. 概要

本ドキュメントでは、既存コードをどのように拡張・変更するかの実装方針を定義する。

---

## 2. 実装フェーズ

### Phase 1: 基盤整備 & リッチサジェスト（推定: 3-4日）

1. PlacesApiService の新設
2. suggestionStore の新設
3. useAutocomplete フックの新設
4. CustomSuggestionList コンポーネント群の実装
5. SearchBar の改修

### Phase 2: 地域マスタ & 選択UI（推定: 2-3日）

1. 地域マスタJSON の作成
2. regionSearchStore の新設
3. RegionSelectorModal の実装
4. RegionSearchButton の追加

### Phase 3: スポット一覧（推定: 3-4日）

1. useNearbySearch フックの新設
2. RegionSpotList の実装
3. SpotCard / SpotGrid の実装
4. CategoryFilterChips の実装

### Phase 4: 統合 & 調整（推定: 2-3日）

1. モバイル対応（BottomSheet）
2. エラーハンドリング
3. パフォーマンス最適化
4. テスト

---

## 3. Phase 1: リッチサジェスト実装

### 3.1 PlacesApiService 新設

```
src/services/placesApiService.ts
```

**実装内容**:

- AutocompleteService ラッパー
- PlacesService ラッパー
- セッション管理
- キャッシュ機能
- エラーハンドリング

**依存関係**:

- `useGoogleMaps` から map インスタンスを受け取る
- シングルトンとして管理

```typescript
// src/services/placesApiService.ts

let instance: PlacesApiService | null = null;

export function getPlacesApiService(map?: google.maps.Map): PlacesApiService {
  if (!instance && map) {
    instance = new PlacesApiService(map);
  }
  if (!instance) {
    throw new Error("PlacesApiService not initialized");
  }
  return instance;
}

export class PlacesApiService {
  // ... 実装（API設計書参照）
}
```

### 3.2 suggestionStore 新設

```
src/store/suggestionStore.ts
```

```typescript
import { create } from "zustand";

interface SuggestionState {
  query: string;
  predictions: google.maps.places.AutocompletePrediction[];
  richDetails: Map<string, google.maps.places.PlaceResult>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  setPredictions: (
    predictions: google.maps.places.AutocompletePrediction[],
  ) => void;
  setRichDetail: (
    placeId: string,
    detail: google.maps.places.PlaceResult,
  ) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSuggestionStore = create<SuggestionState>((set, get) => ({
  query: "",
  predictions: [],
  richDetails: new Map(),
  isLoading: false,
  error: null,

  setQuery: (query) => set({ query }),

  setPredictions: (predictions) => set({ predictions }),

  setRichDetail: (placeId, detail) =>
    set((state) => {
      const newMap = new Map(state.richDetails);
      newMap.set(placeId, detail);
      return { richDetails: newMap };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      query: "",
      predictions: [],
      richDetails: new Map(),
      isLoading: false,
      error: null,
    }),
}));
```

### 3.3 useAutocomplete フック新設

```
src/hooks/useAutocomplete.ts
```

```typescript
import { useCallback, useEffect, useRef } from "react";
import { useSuggestionStore } from "../store/suggestionStore";
import { getPlacesApiService } from "../services/placesApiService";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { useGoogleMaps } from "./useGoogleMaps";

const DEBOUNCE_MS = 300;
const MAX_RICH_DETAILS = 3;

export function useAutocomplete() {
  const { query, setQuery, setPredictions, setRichDetail, setLoading, clear } =
    useSuggestionStore();
  const setPlace = useSelectedPlaceStore((s) => s.setPlace);
  const { panTo } = useGoogleMaps();

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // クエリ変更時の処理
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      // debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!newQuery.trim()) {
        setPredictions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const service = getPlacesApiService();
          const predictions = await service.getPredictions(newQuery);
          setPredictions(predictions);

          // 上位3件のリッチ詳細を取得
          const top3 = predictions.slice(0, MAX_RICH_DETAILS);
          await Promise.all(
            top3.map(async (p) => {
              const detail = await service.getDetailsForSuggestion(p.place_id);
              if (detail) {
                setRichDetail(p.place_id, detail);
              }
            }),
          );
        } catch (error) {
          console.error("Autocomplete error:", error);
        } finally {
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [setQuery, setPredictions, setRichDetail, setLoading],
  );

  // 候補選択時の処理
  const handleSelect = useCallback(
    async (placeId: string) => {
      const service = getPlacesApiService();
      const detail = await service.getFullDetails(placeId);

      if (detail && detail.geometry?.location) {
        setPlace(detail);
        panTo(
          detail.geometry.location.lat(),
          detail.geometry.location.lng(),
          15, // ズームレベル
        );
      }

      clear();
    },
    [setPlace, panTo, clear],
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    handleQueryChange,
    handleSelect,
    clear,
  };
}
```

### 3.4 CustomSuggestionList 実装

```
src/components/search/CustomSuggestionList.tsx
```

```typescript
import { useEffect, useRef, useState } from 'react';
import { useSuggestionStore } from '../../store/suggestionStore';
import RichSuggestionItem from './RichSuggestionItem';
import SimpleSuggestionItem from './SimpleSuggestionItem';

interface Props {
  onSelect: (placeId: string) => void;
  onClose: () => void;
}

export default function CustomSuggestionList({ onSelect, onClose }: Props) {
  const { predictions, richDetails, isLoading } = useSuggestionStore();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            Math.min(prev + 1, predictions.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedIndex >= 0 && predictions[focusedIndex]) {
            onSelect(predictions[focusedIndex].place_id);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [predictions, focusedIndex, onSelect, onClose]);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (predictions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-2
                 glass-effect-border rounded-xl shadow-elevation-3
                 max-h-[400px] overflow-y-auto z-50"
      role="listbox"
    >
      {isLoading && predictions.length === 0 ? (
        <div className="p-4 text-center text-system-secondary-label">
          検索中...
        </div>
      ) : (
        predictions.map((prediction, index) => {
          const isRich = index < 3;
          const detail = richDetails.get(prediction.place_id);

          return isRich ? (
            <RichSuggestionItem
              key={prediction.place_id}
              prediction={prediction}
              detail={detail}
              isLoading={isLoading && !detail}
              isFocused={focusedIndex === index}
              onClick={() => onSelect(prediction.place_id)}
            />
          ) : (
            <SimpleSuggestionItem
              key={prediction.place_id}
              prediction={prediction}
              isFocused={focusedIndex === index}
              onClick={() => onSelect(prediction.place_id)}
            />
          );
        })
      )}
    </div>
  );
}
```

### 3.5 SearchBar 改修

**変更前**:

```typescript
// 現在の実装（抜粋）
<Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
  <input ... />
</Autocomplete>
```

**変更後**:

```typescript
// 改修後（抜粋）
import { useAutocomplete } from '../hooks/useAutocomplete';
import { useSuggestionStore } from '../store/suggestionStore';
import CustomSuggestionList from './search/CustomSuggestionList';
import RegionSearchButton from './search/RegionSearchButton';
import { useRegionSearchStore } from '../store/regionSearchStore';

export default function SearchBar({ onPlaceSelected, inputRef, onClearExternal }: Props) {
  const { query, handleQueryChange, handleSelect, clear } = useAutocomplete();
  const { predictions } = useSuggestionStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { openModal } = useRegionSearchStore();

  // ... 既存のref管理

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleQueryChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionSelect = async (placeId: string) => {
    await handleSelect(placeId);
    setShowSuggestions(false);
    // onPlaceSelected は handleSelect 内で panTo が呼ばれるため不要
  };

  return (
    <div className="fixed z-50 ...">
      <div className="relative flex-1">
        {/* Autocompleteラッパーを削除し、直接inputを配置 */}
        <input
          ref={combinedRef}
          type="text"
          placeholder="Google マップを検索する"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="..."
        />

        {/* カスタムサジェスト */}
        {showSuggestions && predictions.length > 0 && (
          <CustomSuggestionList
            onSelect={handleSuggestionSelect}
            onClose={() => setShowSuggestions(false)}
          />
        )}
      </div>

      <div className="flex items-center space-x-1 pr-4">
        {/* クリアボタン（既存） */}
        {/* 検索アイコン（既存） */}

        {/* 地域から探すボタン（新規） */}
        <RegionSearchButton onClick={openModal} />

        {/* ナビゲーションボタン（既存） */}
      </div>
    </div>
  );
}
```

---

## 4. Phase 2: 地域マスタ & 選択UI実装

### 4.1 地域マスタJSON作成

```
src/data/regions/prefectures.json
```

```json
[
  {
    "code": "01",
    "name": "北海道",
    "nameEn": "Hokkaido",
    "center": { "lat": 43.0642, "lng": 141.3469 }
  },
  {
    "code": "13",
    "name": "東京都",
    "nameEn": "Tokyo",
    "center": { "lat": 35.6762, "lng": 139.6503 }
  },
  {
    "code": "26",
    "name": "京都府",
    "nameEn": "Kyoto",
    "center": { "lat": 35.0116, "lng": 135.7681 }
  }
  // ... 47都道府県
]
```

```
src/data/regions/cities/kyoto.json
```

```json
{
  "prefectureCode": "26",
  "cities": [
    {
      "code": "26100",
      "name": "京都市",
      "nameEn": "Kyoto",
      "center": { "lat": 35.0116, "lng": 135.7681 },
      "searchRadius": 15000
    },
    {
      "code": "26201",
      "name": "宇治市",
      "nameEn": "Uji",
      "center": { "lat": 34.8842, "lng": 135.8004 },
      "searchRadius": 10000
    }
    // ...
  ]
}
```

### 4.2 regionSearchStore 新設

```
src/store/regionSearchStore.ts
```

```typescript
import { create } from "zustand";
import type { Prefecture, City } from "../types/region";

interface RegionSearchState {
  isModalOpen: boolean;
  isSpotListOpen: boolean;
  selectedPrefecture: Prefecture | null;
  selectedCity: City | null;
  spots: google.maps.places.PlaceResult[];
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
  setSpots: (spots: google.maps.places.PlaceResult[]) => void;
  setCategory: (category: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useRegionSearchStore = create<RegionSearchState>((set) => ({
  isModalOpen: false,
  isSpotListOpen: false,
  selectedPrefecture: null,
  selectedCity: null,
  spots: [],
  selectedCategory: null,
  isLoading: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, selectedPrefecture: null }),

  selectPrefecture: (prefecture) => set({ selectedPrefecture: prefecture }),
  selectCity: (city) =>
    set({
      selectedCity: city,
      isModalOpen: false,
      isSpotListOpen: true,
    }),
  clearSelection: () =>
    set({
      selectedPrefecture: null,
      selectedCity: null,
      spots: [],
      selectedCategory: null,
    }),

  openSpotList: () => set({ isSpotListOpen: true }),
  closeSpotList: () =>
    set({
      isSpotListOpen: false,
      selectedCity: null,
      spots: [],
      selectedCategory: null,
    }),
  setSpots: (spots) => set({ spots }),
  setCategory: (category) => set({ selectedCategory: category }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### 4.3 RegionSelectorModal 実装

```
src/components/region/RegionSelectorModal.tsx
```

基本構造:

- 2段階選択（都道府県 → 市区町村）
- 検索/絞り込み機能
- 戻るボタンで前の段階へ
- 市区町村選択でSpotList画面へ遷移

---

## 5. Phase 3: スポット一覧実装

### 5.1 useNearbySearch フック新設

```
src/hooks/useNearbySearch.ts
```

```typescript
import { useCallback } from "react";
import { getPlacesApiService } from "../services/placesApiService";
import { useRegionSearchStore } from "../store/regionSearchStore";

export function useNearbySearch() {
  const { selectedCity, setSpots, setLoading, selectedCategory } =
    useRegionSearchStore();

  const searchSpots = useCallback(async () => {
    if (!selectedCity) return;

    setLoading(true);
    try {
      const service = getPlacesApiService();
      const spots = await service.searchNearbySpots(selectedCity.center, {
        radius: selectedCity.searchRadius,
        type: selectedCategory || "tourist_attraction",
      });
      setSpots(spots);
    } catch (error) {
      console.error("Nearby search error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCategory, setSpots, setLoading]);

  return { searchSpots };
}
```

### 5.2 RegionSpotList 実装

UIモックに準拠した実装。詳細はコンポーネント設計書参照。

---

## 6. Phase 4: 統合 & 調整

### 6.1 モバイル対応

**BottomSheet コンポーネント活用**:

既存の `bottomSheetStore` がある場合はそれを活用。なければ新設。

```typescript
// モバイル判定
const { isDesktop, isMobile } = useDeviceDetect();

// サジェスト表示
{isMobile ? (
  <BottomSheet isOpen={showSuggestions} onClose={() => setShowSuggestions(false)}>
    <CustomSuggestionList ... />
  </BottomSheet>
) : (
  <CustomSuggestionList ... />
)}
```

### 6.2 エラーハンドリング統合

既存の `useErrorHandler` フックを活用。

```typescript
import { useErrorHandler } from "../hooks/useErrorHandler";

const { handleError } = useErrorHandler();

try {
  // API呼び出し
} catch (error) {
  handleError(error);
}
```

### 6.3 パフォーマンス最適化チェックリスト

- [ ] debounce が正しく動作している
- [ ] キャッシュが効いている
- [ ] 不要な再レンダリングがない（React DevTools で確認）
- [ ] 画像サイズが適切（サムネイルは100px以下）
- [ ] メモリリークがない（useEffect のクリーンアップ）

---

## 7. テスト戦略

### 7.1 ユニットテスト

| 対象              | テスト内容                          |
| ----------------- | ----------------------------------- |
| PlacesApiService  | API呼び出しのモック、キャッシュ動作 |
| suggestionStore   | 状態更新の正確性                    |
| regionSearchStore | 状態遷移の正確性                    |

### 7.2 コンポーネントテスト

| 対象                 | テスト内容                 |
| -------------------- | -------------------------- |
| CustomSuggestionList | 表示・選択・キーボード操作 |
| RegionSelectorModal  | 2段階選択フロー            |
| SpotCard             | クリックイベント           |

### 7.3 E2Eテスト

| シナリオ         | 確認項目                                   |
| ---------------- | ------------------------------------------ |
| リッチサジェスト | 入力→候補表示→選択→詳細表示                |
| 地域ドリルダウン | ボタン→都道府県→市区町村→スポット一覧→選択 |

---

## 8. 移行計画

### 8.1 Feature Flag（任意）

```typescript
// src/config/features.ts
export const FEATURES = {
  RICH_SUGGESTIONS: true,    // Phase 1 完了後 true
  REGION_SEARCH: true,       // Phase 2 完了後 true
};

// 使用例
{FEATURES.RICH_SUGGESTIONS ? (
  <CustomSuggestionList />
) : (
  <LegacyAutocomplete />
)}
```

### 8.2 ロールバック手順

Phase 1 でリグレッションが発生した場合:

1. `<Autocomplete>` コンポーネントの復元
2. カスタムUI関連のimport削除
3. suggestionStore の無効化

---

## 9. 依存関係

### 9.1 追加パッケージ

```json
{
  "dependencies": {
    // 既存パッケージで対応可能
    // lodash-es の debounce を使う場合は追加
  }
}
```

**debounce の選択肢**:

1. `lodash-es` の debounce（推奨）
2. 自前実装
3. `use-debounce` パッケージ

### 9.2 既存パッケージとの互換性

| パッケージ             | バージョン | 互換性                                 |
| ---------------------- | ---------- | -------------------------------------- |
| @react-google-maps/api | ^2.18.1    | AutocompleteService は引き続き使用可能 |
| zustand                | ^4.5.2     | 新store追加で問題なし                  |

---

## 10. コードレビューポイント

### 10.1 必須確認事項

- [ ] API呼び出し回数が適切か
- [ ] エラーハンドリングが網羅されているか
- [ ] TypeScript の型定義が正確か
- [ ] アクセシビリティ対応されているか
- [ ] 既存機能が壊れていないか

### 10.2 パフォーマンス確認

- [ ] Lighthouse スコア
- [ ] Bundle サイズ増加量
- [ ] 初回レンダリング時間
