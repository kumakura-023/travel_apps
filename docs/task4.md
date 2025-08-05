# 修正内容v19 実装タスク

## 概要
他のユーザが追加した候補地の通知機能を実装する。PlaceSimpleOverlay風のUIで確認ボタンを押すまで残る通知を表示し、TabNavigationから通知一覧にアクセスできるようにする。

## タスク一覧

### 1. 通知管理ストアの新規作成
**ファイル**: `src/store/notificationStore.ts`

**実装内容**:
```typescript
interface PlaceNotification {
  id: string;
  placeId: string;
  placeName: string;
  placeCategory: PlaceCategory;
  addedBy: {
    uid: string;
    displayName: string;
  };
  planId: string;
  timestamp: number;
  readBy: string[]; // 既読にしたユーザーIDの配列
  position: { lat: number; lng: number };
}

interface NotificationStore {
  notifications: PlaceNotification[];
  currentUserId: string | null;
  getUnreadCount: (userId: string) => number;
  addNotification: (notification: Omit<PlaceNotification, 'id' | 'timestamp' | 'readBy'>) => void;
  markAsRead: (notificationId: string, userId: string) => void;
  markAllAsRead: (userId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getNotificationsByPlan: (planId: string, userId: string) => PlaceNotification[];
  isReadByUser: (notification: PlaceNotification, userId: string) => boolean;
}
```

**実装詳細**:
- Zustandを使用して状態管理
- 通知の永続化（localStorage）
- ユーザーごとの未読数を計算（readBy配列を使用）
- 通知の有効期限設定（72時間）
- 自分が追加した候補地は通知として追加しない
- **重要**: 通知作成時はreadByを空配列で初期化
- **重要**: 各ユーザーが独立して既読管理できるよう、readBy配列にユーザーIDを追加

### 2. PlaceNotificationOverlayコンポーネントの作成
**ファイル**: `src/components/PlaceNotificationOverlay.tsx`

**実装内容**:
```tsx
interface PlaceNotificationOverlayProps {
  notification: PlaceNotification;
  onConfirm: () => void;
  map: google.maps.Map;
}
```

**デザイン仕様**:
- PlaceSimpleOverlayと同様の白背景・角丸デザイン
- 上部にカテゴリアイコンと場所名
- 中央に「○○さんが追加しました」のテキスト
- 下部に「確認」ボタン（coral-500のプライマリボタン）
- ズームレベルに応じたスケーリング（PlaceSimpleOverlayと同じロジック）
- 通知アイコン（ベルアイコン）を左上に表示
- ホバー時に少し拡大するアニメーション

**表示位置**:
- 候補地の位置より少し上にオフセット（PlaceDetailOverlayと同じ計算）
- 他のオーバーレイと重ならないように調整

### 3. NotificationListModalコンポーネントの作成
**ファイル**: `src/components/NotificationListModal.tsx`

**実装内容**:
```tsx
interface NotificationListModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**デザイン仕様**:
- PlanNameEditModalと同様のモーダルデザイン
- ヘッダー: "通知" + 閉じるボタン
- 通知リスト:
  - 各通知はカード形式
  - カテゴリアイコン、場所名、追加者名、日時を表示
  - 未読は背景色を薄いcoral色に
  - クリックで地図上の該当地点に移動
  - 右側に「確認」ボタンと「削除」アイコン
- 上部に「すべて既読にする」ボタン
- 通知がない場合は「通知はありません」を表示
- リストはスクロール可能（最大高さ400px）

### 4. TabNavigationへの通知アイコン追加
**ファイル**: `src/components/TabNavigation.tsx`

**実装内容**:
- 既存のタブ（地図・リスト・設定）の右側に通知アイコンを追加
- ベルアイコン（Heroicons: BellIcon）を使用
- 未読カウントのバッジ表示:
  - アイコンの右上に赤い円形バッジ
  - 数字は白文字
  - 9件以上は「9+」と表示
- クリックでNotificationListModalを開く
- モバイル版では既存タブと同じサイズ
- デスクトップ版ではアイコンのみ表示

### 5. 候補地追加時の通知生成処理
**ファイル**: `src/store/savedPlacesStore.ts`の`addSavedPlace`メソッド修正

**実装内容**:
```typescript
// addSavedPlaceメソッド内に追加
if (currentUser && place.addedBy?.uid !== currentUser.uid) {
  const notificationStore = useNotificationStore.getState();
  notificationStore.addNotification({
    placeId: place.id,
    placeName: place.name,
    placeCategory: place.category,
    addedBy: {
      uid: place.addedBy.uid,
      displayName: place.addedBy.displayName || 'ユーザー'
    },
    planId: activePlanId,
    position: place.position
  });
  // 注: readByは空配列で自動的に初期化される
}
```

**注意点**:
- 自分が追加した候補地は通知しない
- クラウド同期で受信した候補地のみ通知対象
- プラン切り替え時は新しいプランの通知のみ表示

### 6. MapOverlayManagerへの統合
**ファイル**: `src/components/MapOverlayManager.tsx`

**実装内容**:
- 通知オーバーレイの管理を追加
- PlaceDetailOverlay、PlaceSimpleOverlayと同じ階層で表示
- 現在のユーザーが未読の通知のみ地図上に表示（readBy配列にユーザーIDが含まれていない）
- 確認ボタンクリック時の処理:
  1. 現在のユーザーIDをreadBy配列に追加（他のユーザーの既読状態には影響しない）
  2. オーバーレイを非表示
  3. PlaceDetailPanelを開いて詳細表示

**表示優先順位**:
1. RouteInfoOverlay
2. PlaceNotificationOverlay（未読のみ）
3. PlaceDetailOverlay
4. PlaceSimpleOverlay
5. MapLabelOverlay

### 7. クラウド同期対応
**ファイル**: `src/services/cloudSync.ts`の修正

**実装内容**:
- 通知データはローカルのみで管理（Firestoreには保存しない）
- 候補地の追加をリアルタイムで検知:
  ```typescript
  // onSnapshot内で候補地の追加を検知
  const addedPlaces = newPlaces.filter(place => 
    !oldPlaces.find(p => p.id === place.id)
  );
  ```
- WebSocketまたはFirestoreのリアルタイムリスナーで即座に反映

### 8. 通知の既読管理と削除機能
**ファイル**: 各コンポーネントでの実装

**既読管理**:
- PlaceNotificationOverlayの「確認」ボタンクリック時に現在のユーザーIDをreadByに追加
- NotificationListModal内の「確認」ボタンクリック時に現在のユーザーIDをreadByに追加
- 該当する候補地のPlaceDetailPanelを開いた時に現在のユーザーIDをreadByに追加
- **重要**: 他のユーザーの既読状態には一切影響を与えない

**削除機能**:
- NotificationListModal内の削除アイコンクリック
- 72時間経過した通知の自動削除（アプリ起動時にチェック）

**バッチ処理**:
- 「すべて既読にする」機能（現在のユーザーIDをすべての通知のreadBy配列に追加）
- プラン削除時に関連通知も削除
- **注意**: 「すべて既読にする」も現在のユーザーのみに適用

## テスト項目

1. **通知の生成**:
   - 他ユーザーが候補地を追加した時に通知が生成される
   - 自分が追加した候補地では通知が生成されない
   - 通知作成時はreadByが空配列で初期化される

2. **UI表示**:
   - PlaceNotificationOverlayが正しい位置に表示される
   - TabNavigationのバッジカウントが現在のユーザーの未読数を正確に表示
   - NotificationListModalで通知一覧が表示される

3. **インタラクション**:
   - 確認ボタンで現在のユーザーのみ既読になる
   - 通知クリックで地図が移動する
   - 削除機能が正常に動作する
   - **3人以上のユーザーテスト**: ユーザーAが既読にしても、ユーザーB・Cは未読のまま

4. **同期**:
   - リアルタイムで通知が表示される
   - プラン切り替え時に通知が正しくフィルタリングされる

5. **パフォーマンス**:
   - 大量の通知でもスムーズに動作する
   - メモリリークが発生しない

## 実装順序

1. notificationStoreの作成とテスト
2. PlaceNotificationOverlayコンポーネントの作成
3. NotificationListModalコンポーネントの作成
4. TabNavigationの修正
5. savedPlacesStoreへの通知生成処理追加
6. MapOverlayManagerへの統合
7. クラウド同期の対応
8. 既読・削除機能の実装
9. 統合テスト

## 注意事項

- 既存の機能を壊さないよう、変更は最小限に
- TypeScriptの型定義を厳密に
- design_rule.mdのデザインガイドラインに従う
- モバイル対応を忘れずに実装
- アクセシビリティ（スクリーンリーダー対応）を考慮
- エラーハンドリングを適切に実装
- **重要**: 通知の既読状態は必ずユーザーごとに独立して管理すること
- **重要**: 一人のユーザーの操作が他のユーザーの通知状態に影響しないこと