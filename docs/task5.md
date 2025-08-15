# タスク5: 候補地追加時の通知機能修正

## 問題の概要
候補地を追加しても他のユーザーに通知が表示されない

## 問題の原因
`savedPlacesStore.ts`の`addPlace`メソッドで通知を生成する条件（99-112行目）は以下の通り：
- `newPlace.addedBy?.uid`が存在する
- `newPlace.addedBy.uid !== user.uid`（自分が追加した場合は通知しない）

しかし、候補地を追加する際に`addedBy`フィールドが設定されていないため、通知が生成されない。

## 修正内容

### 1. savedPlacesStore.tsの修正（src/store/savedPlacesStore.ts）

`addPlace`メソッド内で、`addedBy`フィールドが設定されていない場合は現在のユーザー情報を自動的に設定する。

**修正箇所：** 33-50行目付近

**修正前：**
```typescript
addPlace: (partial) =>
  set((state) => {
    if (!partial.coordinates) {
      throw new Error('Coordinates are required for adding a place');
    }
    
    const newPlace = {
      ...partial,
      labelHidden: true,
      labelPosition: {
        lat: partial.coordinates.lat,
        lng: partial.coordinates.lng,
      },
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Place;
```

**修正後：**
```typescript
addPlace: (partial) =>
  set((state) => {
    if (!partial.coordinates) {
      throw new Error('Coordinates are required for adding a place');
    }
    
    // 現在のユーザー情報を取得
    const { user } = useAuthStore.getState();
    
    const newPlace = {
      ...partial,
      labelHidden: true,
      labelPosition: {
        lat: partial.coordinates.lat,
        lng: partial.coordinates.lng,
      },
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      // addedByフィールドが設定されていない場合は現在のユーザー情報を設定
      addedBy: partial.addedBy || (user ? {
        uid: user.uid,
        displayName: user.displayName || user.email || 'ユーザー'
      } : undefined),
    } as Place;
```

### 2. 通知生成条件の修正（src/store/savedPlacesStore.ts）

通知生成のロジックを修正して、プラン内の他のユーザーに通知を送るようにする。

**修正箇所：** 98-112行目付近

**修正前：**
```typescript
// 通知を生成（自分が追加した候補地は通知しない）
if (plan && user && newPlace.addedBy?.uid && newPlace.addedBy.uid !== user.uid) {
  const notificationStore = useNotificationStore.getState();
  notificationStore.addNotification({
    placeId: newPlace.id,
    placeName: newPlace.name,
    placeCategory: newPlace.category,
    addedBy: {
      uid: newPlace.addedBy.uid,
      displayName: newPlace.addedBy.displayName || 'ユーザー'
    },
    planId: plan.id,
    position: newPlace.coordinates
  });
}
```

**修正後：**
```typescript
// 通知を生成（プラン内のすべてのユーザーが確認できるように）
if (plan && newPlace.addedBy?.uid) {
  console.log('[placesStore] Creating notification for new place:', {
    placeId: newPlace.id,
    placeName: newPlace.name,
    addedBy: newPlace.addedBy
  });
  
  const notificationStore = useNotificationStore.getState();
  notificationStore.addNotification({
    placeId: newPlace.id,
    placeName: newPlace.name,
    placeCategory: newPlace.category,
    addedBy: {
      uid: newPlace.addedBy.uid,
      displayName: newPlace.addedBy.displayName || 'ユーザー'
    },
    planId: plan.id,
    position: newPlace.coordinates
  });
}
```

## 実装時の注意事項

1. **既存のインポートを確認**
   - `useAuthStore`が既にインポートされているため、追加のインポートは不要

2. **デバッグログの追加**
   - 通知生成時にコンソールログを追加して動作確認を容易にする

3. **テスト方法**
   - 複数のユーザーアカウントでログインして候補地を追加
   - 通知アイコンに赤いバッジが表示されることを確認
   - 通知リストに新しい候補地の通知が表示されることを確認

## 影響範囲
- `src/store/savedPlacesStore.ts`のみの修正
- 他のコンポーネントへの影響なし
- 既存の候補地追加処理はそのまま動作

## 実装後の動作
1. ユーザーAが候補地を追加
2. `addedBy`フィールドにユーザーAの情報が自動設定される
3. 通知が生成され、notificationStoreに保存される
4. ユーザーBがアプリを開いたときに通知バッジが表示される
5. ユーザーBが通知リストを開くと、ユーザーAが追加した候補地の通知が表示される





