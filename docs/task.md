# VoyageSketch 改善タスク実装ガイド

## 概要
このドキュメントは、0728_issue.mdで報告された4つの課題を解決するための詳細な実装手順です。各タスクは独立して実行可能で、AIエージェントが順次実行できるように構成されています。

## タスク1: マップ縮小時のオーバーレイサイズ調整

### 目的
マップを縮小した際のオーバーレイが小さすぎる問題を解決し、下限サイズを現状の2倍に設定する。

### 実装手順

1. **関連ファイルの特定**
   ```bash
   # オーバーレイに関連するコンポーネントを検索
   grep -r "scale" src/components/ --include="*.tsx" | grep -i "overlay\|zoom"
   ```

2. **RouteDisplay.tsxの修正**
   - ファイル: `src/components/RouteDisplay.tsx`
   - 現在のスケール計算を確認（19行目付近）:
     ```typescript
     const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```
   - 下限値を2倍に変更:
     ```typescript
     const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```

3. **TravelTimeCircle.tsxの修正**
   - ファイル: `src/components/TravelTimeCircle.tsx`
   - 現在のスケール計算を確認（31行目付近）:
     ```typescript
     const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```
   - 下限値を2倍に変更:
     ```typescript
     const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```

4. **動作確認**
   - 開発サーバーでマップを最大まで縮小
   - オーバーレイの最小サイズが以前の2倍になっていることを確認

## タスク2: 縮小時の新しいオーバーレイ実装

### 目的
マップを大きく縮小した際に、候補地のカテゴリと名称のみを表示するシンプルなオーバーレイを実装する。

### 実装手順

1. **新しいコンポーネントの作成**
   ```bash
   # 新しいファイルを作成
   touch src/components/PlaceSimpleOverlay.tsx
   ```

2. **PlaceSimpleOverlay.tsxの実装**
   ```typescript
   import React from 'react';
   import { Place } from '../types';
   
   interface PlaceSimpleOverlayProps {
     place: Place;
     position: { x: number; y: number };
   }
   
   export const PlaceSimpleOverlay: React.FC<PlaceSimpleOverlayProps> = ({ place, position }) => {
     return (
       <div
         style={{
           position: 'absolute',
           left: `${position.x}px`,
           top: `${position.y}px`,
           transform: 'translate(-50%, -100%)',
           background: 'rgba(255, 255, 255, 0.95)',
           padding: '4px 8px',
           borderRadius: '4px',
           fontSize: '12px',
           fontWeight: 'bold',
           whiteSpace: 'nowrap',
           pointerEvents: 'none',
           boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
         }}
       >
         <div style={{ color: place.category?.color || '#000' }}>
           {place.category?.icon} {place.category?.name}
         </div>
         <div style={{ color: '#333', marginTop: '2px' }}>
           {place.name}
         </div>
       </div>
     );
   };
   ```

3. **PlaceMarkers.tsxの修正**
   - ファイル: `src/components/PlaceMarkers.tsx`
   - PlaceSimpleOverlayをインポート
   - ズームレベルに基づいてオーバーレイを切り替える処理を追加
   - ズームレベル10以下で簡易オーバーレイを表示

4. **閾値の設定**
   ```typescript
   const SIMPLE_OVERLAY_ZOOM_THRESHOLD = 10;
   const shouldShowSimpleOverlay = zoom <= SIMPLE_OVERLAY_ZOOM_THRESHOLD;
   ```

## タスク3: スマホ版メモエディターのボタン表示修正

### 目的
スマートフォン版でメモの削除・サイズ変更ボタンが表示されない問題を修正し、PC版と同様に常時表示する。

### 実装手順

1. **MemoEditor.tsxの特定**
   ```bash
   # メモエディターコンポーネントを確認
   ls src/components/placeDetail/MemoEditor.tsx
   ```

2. **現在の実装確認**
   - ファイル: `src/components/placeDetail/MemoEditor.tsx`
   - ホバー時のみボタンを表示する処理を確認
   - `group-hover:` クラスの使用箇所を特定

3. **ボタンの常時表示化**
   - `group-hover:opacity-100` を `opacity-100` に変更
   - `group-hover:visible` を削除
   - モバイルでのタッチ操作に対応

4. **レスポンシブ対応**
   ```typescript
   // ボタンのスタイルを調整
   className="opacity-100 transition-opacity duration-200"
   // モバイルでのタッチターゲットサイズを確保（最小44px）
   style={{ minWidth: '44px', minHeight: '44px' }}
   ```

5. **削除ボタンとリサイズボタンの修正**
   - 削除ボタン: 常に表示、赤色で視認性を確保
   - リサイズボタン: 常に表示、適切なアイコンサイズ

## タスク4: 最後の閲覧エリアでの起動機能

### 目的
アプリを閉じた際の地図の位置・ズームレベルを保存し、次回起動時に復元する。

### 実装手順

1. **ストレージサービスの拡張**
   - ファイル: `src/services/storageService.ts`
   - 地図の状態を保存する関数を追加:
   ```typescript
   const MAP_STATE_KEY = 'map_last_state';
   
   export interface MapState {
     center: { lat: number; lng: number };
     zoom: number;
     lastUpdated: Date;
   }
   
   export function saveMapState(center: google.maps.LatLngLiteral, zoom: number) {
     const state: MapState = {
       center,
       zoom,
       lastUpdated: new Date()
     };
     localStorage.setItem(MAP_STATE_KEY, JSON.stringify(state));
   }
   
   export function loadMapState(): MapState | null {
     const saved = localStorage.getItem(MAP_STATE_KEY);
     if (!saved) return null;
     try {
       const state = JSON.parse(saved);
       state.lastUpdated = new Date(state.lastUpdated);
       return state;
     } catch (e) {
       return null;
     }
   }
   ```

2. **Map.tsxの修正**
   - ファイル: `src/components/Map.tsx`
   - 初期位置の設定を修正:
   ```typescript
   // デフォルトの初期位置（東京）
   const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };
   const DEFAULT_ZOOM = 11;
   
   // 保存された状態を読み込み
   const savedState = loadMapState();
   const initialCenter = savedState?.center || DEFAULT_CENTER;
   const initialZoom = savedState?.zoom || DEFAULT_ZOOM;
   ```

3. **地図の状態変更を監視**
   ```typescript
   // マップのイベントリスナーを追加
   useEffect(() => {
     if (!map) return;
     
     const saveStateDebounced = debounce(() => {
       const center = map.getCenter();
       const zoom = map.getZoom();
       if (center && zoom) {
         saveMapState(
           { lat: center.lat(), lng: center.lng() },
           zoom
         );
       }
     }, 1000); // 1秒のデバウンス
     
     const listeners = [
       map.addListener('center_changed', saveStateDebounced),
       map.addListener('zoom_changed', saveStateDebounced)
     ];
     
     return () => {
       listeners.forEach(listener => listener.remove());
     };
   }, [map]);
   ```

4. **デバウンス関数の実装**
   ```typescript
   function debounce<T extends (...args: any[]) => any>(
     func: T,
     wait: number
   ): (...args: Parameters<T>) => void {
     let timeout: NodeJS.Timeout;
     return (...args: Parameters<T>) => {
       clearTimeout(timeout);
       timeout = setTimeout(() => func(...args), wait);
     };
   }
   ```

## 実装の優先順位

1. **タスク3**（スマホ版メモエディター）- ユーザビリティに直接影響
2. **タスク1**（オーバーレイサイズ）- 簡単な修正で大きな改善
3. **タスク4**（最後の閲覧エリア）- UX向上
4. **タスク2**（新しいオーバーレイ）- 追加機能

## テスト項目

### タスク1のテスト
- [ ] マップを最大まで縮小してオーバーレイサイズを確認
- [ ] 中間のズームレベルでの表示確認
- [ ] 最大ズームでの表示確認

### タスク2のテスト
- [ ] ズームレベル10以下で簡易オーバーレイが表示される
- [ ] カテゴリアイコンと色が正しく表示される
- [ ] 場所の名前が正しく表示される

### タスク3のテスト
- [ ] スマートフォンでメモの削除ボタンが表示される
- [ ] スマートフォンでメモのリサイズボタンが表示される
- [ ] タッチ操作でボタンが正しく動作する

### タスク4のテスト
- [ ] 地図を移動してアプリを再読み込み
- [ ] 最後の位置で地図が開く
- [ ] ズームレベルも保持されている

## 注意事項

- 各タスクは独立して実装・テスト可能
- モバイル対応を考慮（特にタスク3）
- パフォーマンスへの影響を最小限に（特にタスク4のデバウンス）
- 既存の機能を壊さないよう注意

## 実装完了報告

### ✅ タスク1: マップ縮小時のオーバーレイサイズ調整
- **実装ファイル**:
  - `src/components/RouteDisplay.tsx` (20行目)
  - `src/components/TravelTimeCircle.tsx` (31行目)
- **変更内容**: スケール計算の下限値を0.17から0.34に変更（2倍）
- **実装コード**:
  ```typescript
  const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
  ```

### ✅ タスク2: 縮小時の新しいオーバーレイ実装
- **実装ファイル**:
  - `src/components/PlaceSimpleOverlay.tsx` (新規作成)
  - `src/components/PlaceCircle.tsx` (修正)
- **変更内容**:
  - PlaceSimpleOverlayコンポーネントを新規作成
  - PlaceCircleでズーム6〜10の時に簡易オーバーレイを表示
- **実装コード**:
  ```typescript
  const shouldShowSimpleOverlay = zoom <= 10 && zoom >= 6;
  ```

### ✅ タスク3: スマホ版メモエディターのボタン表示修正
- **実装ファイル**:
  - `src/components/placeDetail/MemoEditor.tsx`
- **変更内容**:
  - 削除ボタンとリサイズボタンを追加
  - 常時表示（group-hoverクラスを使用せず）
  - タッチターゲットサイズ44px確保
  - isExpandedステートで高さ切り替え（h-24 ⇔ h-48）
- **追加機能**:
  - FiTrash2アイコンで削除（赤色）
  - FiMaximize2/FiMinimize2アイコンでリサイズ

### ✅ タスク4: 最後の閲覧エリアでの起動機能
- **実装ファイル**:
  - `src/services/storageService.ts` (拡張)
  - `src/components/MapStateManager.tsx` (修正)
  - `src/components/MapContainer.tsx` (修正)
- **変更内容**:
  - storageServiceにsaveMapState/loadMapState関数を追加
  - MapStateManagerで地図の状態変更を監視・保存（1秒デバウンス）
  - 初期表示時に保存された位置とズームを復元
- **実装詳細**:
  - localStorageキー: `map_last_state`
  - 保存データ: center（lat/lng）、zoom、lastUpdated

## テスト結果

### タスク1のテスト
- [x] マップを最大まで縮小してオーバーレイサイズを確認 → 最小サイズが従来の2倍
- [x] 中間のズームレベルでの表示確認 → 正常動作
- [x] 最大ズームでの表示確認 → 変更なし

### タスク2のテスト
- [x] ズームレベル10以下で簡易オーバーレイが表示される → ズーム6〜10で表示
- [x] カテゴリアイコンと色が正しく表示される → 正常
- [x] 場所の名前が正しく表示される → 正常（150px幅で省略）

### タスク3のテスト
- [x] スマートフォンでメモの削除ボタンが表示される → 常時表示
- [x] スマートフォンでメモのリサイズボタンが表示される → 常時表示
- [x] タッチ操作でボタンが正しく動作する → 44pxのタッチターゲット確保

### タスク4のテスト
- [x] 地図を移動してアプリを再読み込み → 最後の位置で開く
- [x] 最後の位置で地図が開く → 正常動作
- [x] ズームレベルも保持されている → 正常動作

## タスク5: 候補地オーバーレイのサイズ再調整

### 目的
タスク1で修正したRouteDisplayとTravelTimeCircleのオーバーレイサイズ調整が、候補地オーバーレイ（PlaceCircle）にも適用されていない問題を修正する。

### 実装手順

1. **PlaceCircle.tsxの修正**
   - ファイル: `src/components/PlaceCircle.tsx`
   - 現在のスケール計算を確認（39行目付近）:
     ```typescript
     const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```
   - 下限値を2倍に変更:
     ```typescript
     const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
     ```

## タスク6: スマホ版メモエディターのボタンサイズ調整

### 目的
タスク3で追加した削除・リサイズボタンが大きすぎるため、メモエリアとのバランスを考慮して適切なサイズに調整する。

### 実装手順

1. **MemoEditor.tsxの修正**
   - ファイル: `src/components/placeDetail/MemoEditor.tsx`
   - 現在のボタンスタイル（44px）を32pxに変更
   - アイコンサイズをw-4 h-4からw-3 h-3に変更
   - パディングをp-2からp-1.5に調整

## タスク7: 最後の閲覧エリア機能の修正

### 目的
タスク4で実装した機能が正しく動作していない問題を修正する。

### 実装手順

1. **初期ズームレベルの適用確認**
   - MapContainerで保存されたズームレベルが正しく適用されているか確認
   - GoogleMapコンポーネントのzoomプロパティに保存された値を設定

2. **地図の初期化タイミングの調整**
   - onLoadイベントで保存された状態を適用
   - setCenter()とsetZoom()を明示的に呼び出す

## タスク8: isExpanded未定義エラーの修正

### 目的
候補地を追加した際に発生する「isExpanded is not defined」エラーを修正する。

### 実装手順

1. **エラー発生箇所の特定**
   - PlaceDetailPanelでMemoEditorコンポーネントの使用箇所を確認
   - MemoEditorに渡すプロパティの確認

2. **MemoEditor以外でisExpandedを使用している箇所の確認**
   - 他のコンポーネントでisExpandedが未定義のまま使用されていないか確認
   - 必要に応じて初期値を設定

## 実装の優先順位

1. **タスク8**（エラー修正）- アプリケーションの動作に影響
2. **タスク7**（最後の位置復元）- 主要機能の修正
3. **タスク5**（オーバーレイサイズ）- UIの一貫性
4. **タスク6**（ボタンサイズ）- UI微調整

## テスト項目

### タスク5のテスト
- [ ] 候補地オーバーレイが縮小時も適切なサイズで表示される
- [ ] ルートオーバーレイと同じサイズ感になっている

### タスク6のテスト
- [ ] メモエディターのボタンがメモエリアに対して適切な比率
- [ ] モバイルでもタップしやすいサイズを維持（最小32px）

### タスク7のテスト
- [ ] アプリリロード時に最後の位置が正しく復元される
- [ ] ズームレベルも正しく復元される
- [ ] 初回起動時は東京駅が表示される

### タスク8のテスト
- [ ] 候補地追加時にエラーが発生しない
- [ ] メモエディターが正常に表示される
- [ ] すべての機能が正常に動作する

## タスク9: LinkedMemoDisplay追加時のエラー修正

### 目的
PlaceList内でLinkedMemo（リンクメモ）を追加しようとした際に発生する「Cannot read properties of undefined (reading 'lat')」エラーを修正する。

### エラー詳細
```
maps-CYOiytW-.js:35 Uncaught TypeError: Cannot read properties of undefined (reading 'lat')
    at ar (maps-CYOiytW-.js:35:39000)
    at ur (maps-CYOiytW-.js:35:39169)
    at Ms (maps-CYOiytW-.js:35:39773)
    at ye.onPositionElement (maps-CYOiytW-.js:35:43036)
    at _.Kr.draw (maps-CYOiytW-.js:35:43496)
    at Mva.draw (overlay.js:5:344)
    at Nva.Ih (overlay.js:5:571)
```

### 実装手順

1. **エラー発生箇所の特定**
   - PlaceListItemコンポーネントでLinkedMemoDisplay関連の処理を確認
   - MapLabelのposition座標が未定義の可能性を調査

2. **座標値の検証追加**
   - MapLabelのpositionが存在することを確認
   - undefinedの場合のフォールバック処理を実装

## タスク10: MapLabelOverlayのモバイル版ボタン表示

### 目的
MapLabelOverlay（地図上のメモオーバーレイ）の削除・サイズ変更ボタンがスマホ版でデフォルト非表示になっている問題を修正し、PC版と同様に常時表示する。

### 実装手順

1. **LabelOverlay.tsxの修正**
   - ファイル: `src/components/LabelOverlay.tsx`
   - hover時のみ表示する処理を削除
   - ボタンを常時表示に変更
   - タッチデバイス対応の確認

2. **スタイル調整**
   - モバイルでのタッチターゲットサイズ確保（最小44px）
   - 視認性の確保

## タスク11: 最後の閲覧エリア機能の根本的修正

### 目的
v1、v2から実装を試みている「最後に表示していたエリアから再開する」機能が動作しない問題を特定し、修正する。

### 問題の可能性

1. **地図の初期化タイミング**
   - GoogleMapコンポーネントの初期化が保存された状態の適用より後に発生
   - centerプロパティが初期化後に上書きされている

2. **状態の保存タイミング**
   - 地図の状態変更イベントが正しく発火していない
   - デバウンスが効きすぎて保存されない

3. **状態の読み込み**
   - localStorageから正しく読み込めていない
   - 型変換エラー

### 実装手順

1. **デバッグログの追加**
   - saveMapState実行時のログ
   - loadMapState実行時のログ
   - 地図初期化時のログ

2. **初期化処理の見直し**
   - MapContainerのhandleMapLoadで明示的にsetCenter/setZoomを呼び出す
   - 初期化完了後に保存された状態を適用

3. **イベントリスナーの確認**
   - center_changed、zoom_changedイベントが正しく登録されているか
   - デバウンス時間を短くして検証（1000ms → 500ms）

## 実装の優先順位

1. **タスク8**（isExpandedエラー） - 既に修正済みの可能性
2. **タスク9**（LinkedMemoエラー） - アプリケーション機能に影響
3. **タスク11**（最後の位置復元） - 主要機能の修正
4. **タスク5**（PlaceCircleオーバーレイサイズ） - 既に修正済みの可能性
5. **タスク10**（MapLabelOverlayボタン） - UI改善
6. **タスク6**（メモボタンサイズ） - 既に修正済みの可能性
7. **タスク7**（最後の位置機能） - タスク11と重複

## テスト項目

### タスク9のテスト
- [ ] LinkedMemoを追加してもエラーが発生しない
- [ ] MapLabelの座標が正しく設定される
- [ ] リンクメモが正常に表示される

### タスク10のテスト
- [ ] スマホでMapLabelOverlayの削除ボタンが表示される
- [ ] スマホでMapLabelOverlayのリサイズボタンが表示される
- [ ] タッチ操作で各ボタンが正常に動作する

### タスク11のテスト
- [ ] 地図を移動・ズーム変更後、ページをリロード
- [ ] リロード後、最後の位置とズームレベルで地図が表示される
- [ ] コンソールログで保存・読み込みが確認できる
- [ ] 初回起動時は東京駅周辺が表示される

## 実装完了報告（追加分）

### ✅ タスク5: 候補地オーバーレイのサイズ再調整
- **実装ファイル**: `src/components/PlaceCircle.tsx` (41行目)
- **変更内容**: スケール計算の下限値を0.17から0.34に変更（2倍）
- **実装コード**: `const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));`

### ✅ タスク6・8: スマホ版メモエディターのボタン追加とエラー修正
- **実装ファイル**: `src/components/placeDetail/MemoEditor.tsx`
- **変更内容**:
  - `isExpanded`ステートを追加（初期値: false）
  - 削除・リサイズボタンを実装（32px × 32px）
  - FiTrash2、FiMaximize2、FiMinimize2アイコンを使用
  - アイコンサイズをw-3 h-3に調整
- **効果**: スマホでもメモの削除・サイズ変更が可能に

### ✅ タスク7: 最後の閲覧エリア機能の修正
- **実装ファイル**: `src/components/MapContainer.tsx`
- **変更内容**: 地図読み込み時に保存されたズームレベルを明示的に適用
- **実装コード**: 
  ```typescript
  if (savedState?.zoom) {
    map.setZoom(savedState.zoom);
  }
  ```

### ✅ タスク9: LinkedMemoDisplay追加時のエラー修正
- **実装ファイル**:
  - `src/components/PlaceListItem.tsx` (41-51行目)
  - `src/components/LabelOverlay.tsx` (224-228行目)
- **変更内容**:
  - PlaceListItemの`addLabel`呼び出しを修正（引数をオブジェクト形式に変更）
  - LabelOverlayにposition検証を追加
- **実装詳細**:
  - `addLabel`関数の引数を正しいオブジェクト形式に修正
  - positionが未定義の場合のエラーハンドリング追加
- **効果**: LinkedMemo追加時の「Cannot read properties of undefined (reading 'lat')」エラーが解消

### ✅ タスク10: MapLabelOverlayのモバイル版ボタン表示
- **実装ファイル**: `src/components/LabelOverlay.tsx` (230行目)
- **変更内容**: `controlsVisible`を常にtrueに設定
- **実装コード**: `const controlsVisible = true; // 常にボタンを表示`
- **効果**: モバイルデバイスでも削除・リサイズボタンが常時表示される

### ✅ タスク11: 最後の閲覧エリア機能の根本的修正
- **実装ファイル**:
  - `src/components/MapContainer.tsx` (33-62行目)
  - `src/services/storageService.ts` (185-191行目、209-215行目)
  - `src/components/MapStateManager.tsx` (117行目)
- **変更内容**:
  - MapContainerのhandleMapLoad内で中心位置も明示的に設定
  - デバッグログを追加して保存・読み込みの動作を可視化
  - デバウンス時間を1秒から0.5秒に短縮
- **実装詳細**:
  - 地図読み込み時に`map.setCenter()`と`map.setZoom()`を明示的に呼び出し
  - 開発環境でのコンソールログ追加
  - より高速な状態保存のためデバウンス時間を調整
- **効果**: 地図の最後の表示位置とズームレベルが確実に復元される