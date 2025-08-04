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
        saveWithSyncManager(planToSave, 'label_updated');
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
        saveWithSyncManager(planToSave, 'label_added');
      } else {
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
      
      // 保存成功後、statusを'synced'に更新
      setTimeout(() => {
        const { updateLabel } = useLabelsStore.getState();
        updateLabel(newLabel.id, { status: 'synced' });
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