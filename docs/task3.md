# タスク33:メモ追加時の同期エラー修正

## 問題の概要

TabNavigationのメモボタンをクリックしてメモ配置モードでマップ上をクリックすると、メモが追加されない。

## 原因分析（ログから確実に特定）

1. error.mdのログを見ると、実際にはメモ（label）は正常に作成されている
   - `[labelsStore] Saving last action position for new label` というログがある
   - labelIdも生成されている: `faa896d8-f989-4e66-9583-fad08a9e6b79`
2. しかし、`usePlanSyncEvents.ts`の70-83行目で、`setOnLabelAdded`の処理に重大な問題がある：
   - プランにラベルを追加している（77行目）が、**saveImmediatelyやsaveImmediatelyCloudを呼んでいない**
   - 他のイベント（placeAdded、placeDeleted等）では保存処理を呼んでいるのに、labelAddedだけ保存処理が抜けている
   - 依存配列も空`[]`になっており、他のuseEffectと異なる

## 根本原因

メモは一時的にローカルのlabelsStoreとplanStoreに追加されるが、Firestoreに保存されないため、次の同期タイミングでFirestoreの古いデータに上書きされて消えてしまう。

## 修正内容

### 1. usePlanSyncEvents.tsの修正（src/hooks/usePlanSyncEvents.ts）

#### 修正箇所: 70-83行目のsetOnLabelAdded処理

**修正前:**

```typescript
useEffect(() => {
  const { setOnLabelAdded } = useLabelsStore.getState();
  setOnLabelAdded((newLabel) => {
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      const planToSave: TravelPlan = {
        ...currentPlan,
        labels: [...currentPlan.labels, newLabel],
        updatedAt: new Date(),
      };
      usePlanStore.getState().setPlan(planToSave);
    }
  });
}, []);
```

**修正後:**

```typescript
useEffect(() => {
  const { setOnLabelAdded } = useLabelsStore.getState();
  setOnLabelAdded((newLabel) => {
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      const planToSave: TravelPlan = {
        ...currentPlan,
        labels: [...currentPlan.labels, newLabel],
        updatedAt: new Date(),
      };
      usePlanStore.getState().setPlan(planToSave);
      // 新しい同期システムがある場合はそれを使用、なければ従来の方法
      if (saveWithSyncManager) {
        saveWithSyncManager(planToSave, "place_added"); // 注: operationTypeにlabel_addedがない場合はplace_addedを使用
      } else {
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
    }
    syncDebugUtils.log("save", {
      type: "immediate_sync",
      reason: "label_added",
      labelText: newLabel.text,
      labelId: newLabel.id,
      timestamp: Date.now(),
    });
  });
}, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
```

### 2. オプション: operationTypeの拡張

`saveWithSyncManager`のoperationTypeにlabel操作を追加することを推奨：

**修正前（12行目）:**

```typescript
saveWithSyncManager?: (plan: TravelPlan, operationType?: 'place_added' | 'place_deleted' | 'place_updated' | 'memo_updated' | 'plan_updated') => void
```

**修正後:**

```typescript
saveWithSyncManager?: (plan: TravelPlan, operationType?: 'place_added' | 'place_deleted' | 'place_updated' | 'memo_updated' | 'plan_updated' | 'label_added' | 'label_updated' | 'label_deleted') => void
```

そして、各label操作で適切なoperationTypeを使用：

- labelAdded: `'label_added'`
- labelUpdated: `'label_updated'` (現在は'place_updated'を使用)
- labelDeleted: `'label_deleted'` (現在は'place_updated'を使用)

## テスト手順

1. `npm run dev`で開発サーバーを起動
2. TabNavigationのメモボタンをクリックして「配置中」状態にする
3. マップ上の任意の場所をクリック
4. メモが正しく追加され、画面に表示されることを確認
5. ページをリロードしても、メモが消えずに表示されることを確認
6. 別のデバイスやブラウザでも同じメモが表示されることを確認

## 実装完了の定義

- [ ] メモ配置モードでクリックした時、メモが追加される
- [ ] 追加されたメモが画面に表示される
- [ ] リロード後もメモが残っている
- [ ] 他のデバイスでも同じメモが表示される
- [ ] コンソールログでFirestoreへの保存が確認できる

## 修正の影響範囲

この修正は、メモ（ラベル）の追加処理のみに影響します。既存の候補地追加や削除機能には影響しません。

# タスク34: メモの位置移動・サイズ変更の同期エラー修正

## 問題の概要

メモの追加は同期されるようになったが、メモの位置移動やサイズ変更が同期されない。

## 原因分析（コードから確実に特定）

1. **MapLabel型の定義**（src/types/index.ts:78行目）
   - `status?: 'new' | 'synced'` というフィールドがある
2. **新規メモ作成時**（src/store/labelsStore.ts:39行目）
   - `status: 'new'` で作成される
3. **メモ更新時の同期条件**（src/hooks/usePlanSyncEvents.ts:110行目）
   - `if (updatedLabel.status === 'synced')` という条件がある
   - つまり、statusが'synced'のメモのみが同期される

4. **問題の流れ**
   - 新規作成されたメモは status = 'new'
   - 位置やサイズを変更しても、updateLabel関数ではstatusは更新されない
   - statusが'new'のままなので、同期条件を満たさない
   - 結果、位置やサイズの変更がFirestoreに保存されない

## 根本原因

メモのstatusが一度も'synced'に更新されないため、位置やサイズの変更が同期されない。

## 修正内容

### 方法1: status条件を削除する（推奨）

**src/hooks/usePlanSyncEvents.ts（99-121行目）の修正:**

```typescript
useEffect(() => {
  const { setOnLabelUpdated } = useLabelsStore.getState();
  setOnLabelUpdated((updatedLabel, updatedLabels) => {
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      const planToSave: TravelPlan = {
        ...currentPlan,
        labels: updatedLabels,
        updatedAt: new Date(),
      };
      usePlanStore.getState().setPlan(planToSave);
      // statusの条件を削除して、常に同期する
      // 新しい同期システムがある場合はそれを使用、なければ従来の方法
      if (saveWithSyncManager) {
        saveWithSyncManager(planToSave, "label_updated");
      } else {
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
    }
  });
}, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
```

### 方法2: メモ追加成功後にstatusを更新する（代替案）

もしstatus管理を維持したい場合は、メモが正常に追加された後にstatusを'synced'に更新する：

**src/hooks/usePlanSyncEvents.ts（70-97行目）に追加:**

```typescript
useEffect(() => {
  const { setOnLabelAdded } = useLabelsStore.getState();
  setOnLabelAdded((newLabel) => {
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      const planToSave: TravelPlan = {
        ...currentPlan,
        labels: [...currentPlan.labels, newLabel],
        updatedAt: new Date(),
      };
      usePlanStore.getState().setPlan(planToSave);
      // 新しい同期システムがある場合はそれを使用、なければ従来の方法
      if (saveWithSyncManager) {
        saveWithSyncManager(planToSave, "label_added");
      } else {
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }

      // 保存成功後、statusを'synced'に更新
      setTimeout(() => {
        const { updateLabel } = useLabelsStore.getState();
        updateLabel(newLabel.id, { status: "synced" });
      }, 100);
    }
    // 以下省略
  });
}, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
```

## 推奨する修正方法

**方法1（status条件の削除）を推奨します。**

理由：

1. シンプルで確実
2. status管理の複雑さを避けられる
3. 現状、statusフィールドは他で使用されていない様子
4. 将来的に必要になったら、その時点で適切な実装を追加すればよい

## テスト手順

1. `npm run dev`で開発サーバーを起動
2. メモを新規追加する
3. 追加したメモをドラッグして位置を変更
4. メモの右下のハンドルをドラッグしてサイズを変更
5. 別のブラウザやデバイスで同じプランを開く
6. 位置とサイズの変更が反映されていることを確認
7. ページをリロードしても変更が保持されていることを確認

## 実装完了の定義

- [ ] メモの位置変更が即座に同期される
- [ ] メモのサイズ変更が即座に同期される
- [ ] リロード後も位置とサイズが保持される
- [ ] 他のデバイスでも変更が反映される
- [ ] コンソールエラーが発生しない

## 修正の影響範囲

この修正は、メモ（ラベル）の更新処理のみに影響します。

- メモの追加機能には影響しない（すでに修正済み）
- メモの削除機能には影響しない（別のuseEffectで処理）
- 候補地の操作には影響しない

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
      gestureHandling: isMapInteractionEnabled ? "greedy" : "none",
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

# タスク36: メモ操作終了時の位置・サイズリセット問題の修正

## 問題の概要

メモの操作（ドラッグ・リサイズ）が終了した瞬間に、操作前の状態に戻ってしまう。操作中は正しく追従するが、手を離すと元の位置・サイズに戻る。

## 原因分析（コードから確実に特定）

### LabelOverlay.tsx のhandlePointerUp関数（80-95行目）の問題

1. **ドラッグ終了時（87行目）**：

   ```typescript
   const latLng = map
     ?.getProjection()
     ?.fromPointToLatLng(interactionStartRef.current.world!);
   ```

   - `interactionStartRef.current.world`は**操作開始時の位置**
   - 操作中に更新されていない
   - 結果：操作開始時の位置に戻ってしまう

2. **リサイズ終了時（93-94行目）**：
   ```typescript
   onResizeEnd({
     width: label.width,
     height: label.height,
   });
   ```

   - `label.width`と`label.height`は**propsの値**
   - ローカル更新（localOnly=true）なので、propsは古い値のまま
   - 結果：操作開始時のサイズに戻ってしまう

## 根本原因

操作終了時に渡す位置・サイズが、操作中に更新した最新の値ではなく、操作開始時の値を使っているため。

## 修正内容

### LabelOverlay.tsx の修正

**1. 現在の位置・サイズを保持するrefを追加（29行目の後）:**

```typescript
// 現在の位置とサイズを保持
const currentPositionRef = useRef<{ lat: number; lng: number }>(label.position);
const currentSizeRef = useRef<{ width: number; height: number }>({
  width: label.width,
  height: label.height,
});
```

**2. handlePointerMove関数の修正（55-77行目）:**

```typescript
const handlePointerMove = (ev: PointerEvent) => {
  if (mode === "resizing") {
    ev.stopPropagation();
    const dx = ev.clientX - interactionStartRef.current.clientX;
    const dy = ev.clientY - interactionStartRef.current.clientY;
    const newWidth = Math.max(60, interactionStartRef.current.width + dx);
    const newHeight = Math.max(28, interactionStartRef.current.height + dy);

    // 現在のサイズを保存
    currentSizeRef.current = { width: newWidth, height: newHeight };

    onResize({ width: newWidth, height: newHeight });
    interactionStartRef.current.moved = true;
  } else if (mode === "dragging") {
    if (!map) return;
    const proj = map.getProjection();
    if (!proj || !interactionStartRef.current.world) return;
    const zoom = map.getZoom() || 0;
    const scale = 2 ** zoom;
    const dx = (ev.clientX - interactionStartRef.current.clientX) / scale;
    const dy = (ev.clientY - interactionStartRef.current.clientY) / scale;
    const newWorld = new google.maps.Point(
      interactionStartRef.current.world.x + dx,
      interactionStartRef.current.world.y + dy,
    );
    const latLng = proj.fromPointToLatLng(newWorld);
    if (latLng) {
      const newPosition = { lat: latLng.lat(), lng: latLng.lng() };

      // 現在の位置を保存
      currentPositionRef.current = newPosition;

      onMove(newPosition);
    }
    interactionStartRef.current.moved = true;
  }
};
```

**3. handlePointerUp関数の修正（80-102行目）:**

```typescript
const handlePointerUp = () => {
  isPointerDownRef.current = false;
  // 操作終了時の処理
  if (interactionStartRef.current.moved) {
    if (mode === "dragging" && onMoveEnd) {
      // 保存された最新の位置で同期
      onMoveEnd(currentPositionRef.current);
    } else if (mode === "resizing" && onResizeEnd) {
      // 保存された最新のサイズで同期
      onResizeEnd(currentSizeRef.current);
      // On mobile, end editing mode after resize operation
      if (isMobile) {
        setMode("idle");
        return;
      }
    }
  }

  // For non-mobile or non-resize operations, always set to idle
  if (!isMobile || mode !== "editing") {
    setMode("idle");
  }
  // For mobile editing mode without resize/drag, keep editing mode active
};
```

**4. propsの変更時にrefを更新（useEffectを追加）:**

```typescript
// labelの位置・サイズが外部から変更された場合にrefを更新
useEffect(() => {
  currentPositionRef.current = label.position;
  currentSizeRef.current = { width: label.width, height: label.height };
}, [label.position.lat, label.position.lng, label.width, label.height]);
```

## テスト手順

1. `npm run dev`で開発サーバーを起動
2. メモを追加
3. メモをドラッグして移動し、手を離す
4. 手を離した位置にメモが留まることを確認（元の位置に戻らない）
5. メモのサイズを変更し、手を離す
6. 変更したサイズが維持されることを確認（元のサイズに戻らない）
7. 別のブラウザで同じプランを開き、変更が正しく同期されることを確認

## 実装完了の定義

- [ ] メモのドラッグ終了時に、最終位置が保持される
- [ ] メモのリサイズ終了時に、最終サイズが保持される
- [ ] 操作前の状態に戻らない
- [ ] 他のデバイスに正しい位置・サイズが同期される
- [ ] コンソールエラーが発生しない

## 修正の影響範囲

- LabelOverlay コンポーネントの内部処理のみ
- 他のコンポーネントには影響しない
- 同期処理自体には影響しない（正しい値を渡すようになるだけ）
