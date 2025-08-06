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

---

# 修正内容v20 実装タスク

## 問題概要
招待URLから参加するとFirestoreのインデックスエラーが発生し、招待されたプランに参加できない。プラン一覧にプランが表示されず、ゲスト側のユーザーがアクセスできない。

## エラー内容
```
[planListService] Error listening to plans: FirebaseError: The query requires an index.
[PlanCoordinator] Available plans: 0
[PlanCoordinator] No plans available, keeping empty state
```

## 根本原因
1. **memberIds配列の不整合**: Cloud Functionsでユーザーをプランに追加する際、membersオブジェクトは更新するがmemberIds配列を更新していない
2. **Firestoreインデックスの不足**: memberIds（array-contains）とupdatedAt（desc）の複合インデックスが必要だが作成されていない

## タスク一覧

### 1. Cloud Functions: acceptInviteToken関数の修正
**ファイル**: `functions/src/index.ts`

**修正箇所**: 169-174行目のupdate処理

**変更前のコード**:
```typescript
await planDoc.ref.update({
  [`members.${uid}`]: {
    role: 'editor',
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
});
```

**変更後のコード**:
```typescript
// 既存のmemberIds配列を取得
const existingMemberIds = planData.memberIds || [];
const updatedMemberIds = existingMemberIds.includes(uid) 
  ? existingMemberIds 
  : [...existingMemberIds, uid];

// membersとmemberIds両方を更新
await planDoc.ref.update({
  [`members.${uid}`]: {
    role: 'editor',
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  memberIds: updatedMemberIds,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 2. Cloud Functions: inviteUserToPlan関数の修正
**ファイル**: `functions/src/index.ts`

**修正箇所**: 83-88行目のupdate処理

**変更前のコード**:
```typescript
await planRef.update({
  [`members.${invitee.uid}`]: {
    role: "editor",
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
});
```

**変更後のコード**:
```typescript
// planDataから既存のmemberIds配列を取得
const existingMemberIds = planData.memberIds || [];
const updatedMemberIds = existingMemberIds.includes(invitee.uid) 
  ? existingMemberIds 
  : [...existingMemberIds, invitee.uid];

// membersとmemberIds両方を更新
await planRef.update({
  [`members.${invitee.uid}`]: {
    role: "editor",
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  memberIds: updatedMemberIds,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 3. Firestoreインデックスの作成
**実施方法**: Firebase Consoleで手動作成

**手順**:
1. Firebase Consoleにアクセス
2. Firestore Databaseセクションに移動
3. 「インデックス」タブを選択
4. 「インデックスを作成」をクリック
5. 以下の設定で複合インデックスを作成:

**インデックス設定**:
```
コレクション: plans
フィールド1: memberIds (配列に含まれる)
フィールド2: updatedAt (降順)
クエリスコープ: コレクション
```

**代替方法（CLIを使用）**:
`firestore.indexes.json`に以下を追加してデプロイ:
```json
{
  "indexes": [
    {
      "collectionGroup": "plans",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "memberIds",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### 4. 既存プランのmemberIds修復スクリプト
**ファイル**: 新規作成 `functions/src/repairMemberIds.ts`

**実装内容**:
```typescript
import * as admin from 'firebase-admin';

// 一度だけ実行するスクリプト
export async function repairExistingPlansMemberIds() {
  const db = admin.firestore();
  const plansRef = db.collection('plans');
  const snapshot = await plansRef.get();
  
  const batch = db.batch();
  let updateCount = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const members = data.members || {};
    const existingMemberIds = data.memberIds || [];
    
    // membersオブジェクトからメンバーIDを抽出
    const actualMemberIds = Object.keys(members);
    
    // memberIds配列が不完全な場合は修復
    const needsUpdate = actualMemberIds.some(id => !existingMemberIds.includes(id));
    
    if (needsUpdate) {
      batch.update(doc.ref, {
        memberIds: actualMemberIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      updateCount++;
      console.log(`Repairing plan ${doc.id}: adding memberIds ${actualMemberIds}`);
    }
  });
  
  if (updateCount > 0) {
    await batch.commit();
    console.log(`Successfully repaired ${updateCount} plans`);
  } else {
    console.log('No plans needed repair');
  }
  
  return { repaired: updateCount };
}
```

**実行方法**:
1. Cloud Function として一時的にデプロイ
2. Firebase Console から手動実行
3. 実行後は削除（一度だけ実行すればよい）

### 5. planCloudService.tsの修正（オプション - 念のため）
**ファイル**: `src/services/planCloudService.ts`

**修正箇所**: 155-161行目のaddUserToPlan関数

**変更前のコード**:
```typescript
export async function addUserToPlan(planId: string, newUserId: string, role: 'editor' | 'viewer' = 'editor') {
    const planRef = planDocRef(planId);
    await setDoc(planRef, {
        members: {
            [newUserId]: { role, joinedAt: new Date() }
        }
    }, { merge: true });
}
```

**変更後のコード**:
```typescript
export async function addUserToPlan(planId: string, newUserId: string, role: 'editor' | 'viewer' = 'editor') {
    const planRef = planDocRef(planId);
    
    // 既存のプランデータを取得
    const planSnap = await getDoc(planRef);
    const planData = planSnap.exists() ? planSnap.data() : {};
    const existingMemberIds = planData.memberIds || [];
    
    // memberIds配列を更新
    const updatedMemberIds = existingMemberIds.includes(newUserId) 
      ? existingMemberIds 
      : [...existingMemberIds, newUserId];
    
    await setDoc(planRef, {
        members: {
            [newUserId]: { role, joinedAt: new Date() }
        },
        memberIds: updatedMemberIds,
        updatedAt: serverTimestamp()
    }, { merge: true });
}
```

## テスト項目

### 1. 招待URL経由の参加テスト
1. ユーザーAがプランを作成
2. ユーザーAが招待URLを生成
3. ユーザーBが招待URLにアクセス
4. ユーザーBがGoogleログイン
5. **確認**: ユーザーBのプラン一覧にプランが表示される
6. **確認**: エラーログが出力されない

### 2. メール招待経由の参加テスト
1. ユーザーAがユーザーCのメールアドレスで招待
2. **確認**: ユーザーCのプラン一覧にプランが表示される
3. **確認**: memberIds配列にユーザーCのUIDが含まれる

### 3. インデックスエラーの解消確認
1. planListServiceのクエリ実行
2. **確認**: `failed-precondition`エラーが発生しない
3. **確認**: ソート付きクエリが正常に動作する

### 4. 既存プランの修復確認
1. 修復スクリプト実行前: memberIds配列が不完全なプランを確認
2. 修復スクリプトを実行
3. **確認**: すべてのプランでmemberIds配列がmembersオブジェクトと一致

### 5. プラン一覧の表示確認
1. 複数のプランに参加しているユーザーでテスト
2. **確認**: すべての参加プランが一覧に表示される
3. **確認**: 更新日時順でソートされている

## 実装順序

1. **Firestoreインデックスの作成**（最優先）
   - Firebase Consoleで即座に作成可能
   - 作成に10-15分かかる場合がある

2. **Cloud Functionsの修正**
   - acceptInviteToken関数の修正
   - inviteUserToPlan関数の修正
   - デプロイ: `firebase deploy --only functions`

3. **既存プランの修復**
   - 修復スクリプトの作成と実行
   - 一度だけ実行すれば完了

4. **planCloudService.tsの修正**（オプション）
   - フロントエンド側の念のための修正

5. **動作確認テスト**
   - すべての修正完了後に実施

## 注意事項

- **重要**: memberIds配列の更新は必ずmembersオブジェクトの更新と同時に行う
- **重要**: 既存のmemberIds配列を上書きしないよう、必ず既存の値を取得してから更新する
- Cloud Functionsのデプロイ後は必ず動作確認を行う
- インデックス作成には時間がかかるため、最初に実施する
- 修復スクリプトは本番環境で実行する前に、開発環境でテストする