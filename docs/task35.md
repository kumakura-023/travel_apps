# タスク35: メモ操作中の同期競合とマップ動作問題の修正

## 問題の概要
1. メモの操作（ドラッグ・リサイズ）中に同期が発生し、操作途中で前の状態に戻ってしまう
2. メモの操作中にマップが動いてしまい、UXが悪い

## 原因分析（コードから確実に特定）

### 1. 同期タイミングの問題
- **頻繁な更新**: LabelOverlay.tsx（60、72行目）で、マウス移動のたびにonMove/onResizeが呼ばれる
- **即座の同期**: SyncManager.ts（36行目）で`debouncedOperations`に`label_updated`が含まれていない
- **全体の上書き**: useRealtimePlanListener.ts（153、157行目）で、同期時にラベル全体を上書きする

### 2. マップ動作の問題  
- **静的な設定**: MapContainer.tsx（79行目）で`gestureHandling`は初期化時のみ設定される
- **動的更新なし**: メモ操作中にisMapInteractionEnabledが変更されても、GoogleMapのオプションは更新されない

## 根本原因
1. メモ操作中の頻繁な同期により、他のクライアントのデータで操作中の位置が上書きされる
2. GoogleMapのgestureHandlingが動的に更新されないため、メモ操作中もマップが動く

## 修正内容

### 修正案1: 操作終了時のみ同期する（推奨）

**1. MapOverlayManager.tsxの修正（94-103行目）:**
```typescript
// 修正前
{labels.map((l) => (
  <LabelOverlay
    key={`label-${l.id}`}
    label={l}
    map={map}
    onEdit={() => setEditing(l)}
    onMove={(pos) => updateLabel(l.id, { position: pos })}
    onResize={(size) => updateLabel(l.id, size)}
  />
))}

// 修正後
{labels.map((l) => (
  <LabelOverlay
    key={`label-${l.id}`}
    label={l}
    map={map}
    onEdit={() => setEditing(l)}
    onMove={(pos) => {
      // ローカルの状態のみ更新（同期はしない）
      updateLabel(l.id, { position: pos }, true); // 第3引数でローカル更新を指定
    }}
    onResize={(size) => {
      // ローカルの状態のみ更新（同期はしない）
      updateLabel(l.id, size, true); // 第3引数でローカル更新を指定
    }}
    onMoveEnd={(pos) => {
      // 操作終了時に同期
      updateLabel(l.id, { position: pos });
    }}
    onResizeEnd={(size) => {
      // 操作終了時に同期
      updateLabel(l.id, size);
    }}
  />
))}
```

**2. LabelOverlay.tsxの修正:**

propsインターフェースに追加（10-16行目）:
```typescript
interface Props {
  label: MapLabel;
  map: google.maps.Map | null;
  onEdit: () => void;
  onMove: (pos: { lat: number; lng: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onMoveEnd?: (pos: { lat: number; lng: number }) => void; // 追加
  onResizeEnd?: (size: { width: number; height: number }) => void; // 追加
}
```

handlePointerUp関数の修正（77-98行目）:
```typescript
const handlePointerUp = () => {
  isPointerDownRef.current = false;
  // 操作終了時の処理
  if (interactionStartRef.current.moved) {
    if (mode === 'dragging' && onMoveEnd) {
      // 最終位置で同期
      const latLng = map?.getProjection()?.fromPointToLatLng(
        new google.maps.Point(
          interactionStartRef.current.world!.x,
          interactionStartRef.current.world!.y
        )
      );
      if (latLng) onMoveEnd({ lat: latLng.lat(), lng: latLng.lng() });
    } else if (mode === 'resizing' && onResizeEnd) {
      // 最終サイズで同期
      onResizeEnd({
        width: label.width,
        height: label.height
      });
    }
  }
  // 以下既存のコード
```

**3. labelsStore.tsの修正（updateLabel関数）:**
```typescript
updateLabel: (id, update, localOnly = false) => {
  set((s) => {
    let updatedLabel: MapLabel | null = null;
    const updatedLabels = s.labels.map((l) => {
      if (l.id === id) {
        updatedLabel = { ...l, ...update, updatedAt: new Date() };
        return updatedLabel;
      }
      return l;
    });

    // localOnlyがtrueの場合は同期コールバックを呼ばない
    if (!localOnly && s.onLabelUpdated && updatedLabel) {
      s.onLabelUpdated(updatedLabel, updatedLabels);
    }

    return { labels: updatedLabels };
  });
},
```

### 修正案2: マップの動的制御

**MapContainer.tsxの修正:**

useEffectを追加して、isMapInteractionEnabledの変更を監視:
```typescript
// 79行目の後に追加
useEffect(() => {
  if (map) {
    map.setOptions({
      gestureHandling: isMapInteractionEnabled ? 'greedy' : 'none'
    });
  }
}, [map, isMapInteractionEnabled]);
```

### 修正案3: デバウンス対応（代替案）

**SyncManager.tsの修正（36-40行目）:**
```typescript
debouncedOperations: ['memo_updated', 'place_updated', 'label_updated'],
operationDebounceDelays: {
  memo_updated: 1000,
  place_updated: 500,
  label_updated: 500, // ラベル更新のデバウンス時間を追加
}
```

## 推奨する修正方法

**修正案1（操作終了時のみ同期）を推奨します。**

理由：
1. ユーザー体験が最も良い（操作中は滑らか、終了時に確実に保存）
2. ネットワークトラフィックを削減
3. 同期競合を根本的に解決
4. 実装が明確で保守しやすい

修正案2も併せて実装することで、メモ操作中のマップ動作を確実に防げます。

## テスト手順

1. 2つのブラウザで同じプランを開く
2. 片方でメモをドラッグして移動
3. ドラッグ中は他方に反映されず、手を離した時点で反映されることを確認
4. メモのリサイズも同様にテスト
5. メモ操作中にマップが動かないことを確認
6. 複数のメモを素早く操作しても問題ないことを確認

## 実装完了の定義

- [ ] メモのドラッグ中に位置が戻らない
- [ ] メモのリサイズ中にサイズが戻らない
- [ ] 操作終了時に確実に同期される
- [ ] メモ操作中にマップが動かない
- [ ] パフォーマンスが改善される（ネットワーク通信の削減）

## 修正の影響範囲

- メモ（ラベル）の操作に関する処理のみ
- 候補地の操作には影響しない
- 他の同期処理には影響しない