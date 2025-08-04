## タスク27: プラン名変更のクラウド同期修正

### 背景と問題
プラン名を変更してもクラウド（Firestore）に保存されず、リロードすると「新しいプラン」に戻ってしまう問題が発生している。

### 問題の原因分析
1. **PlanNameEditModalのsave関数の問題**
   - `updatePlan`でローカル状態のみ更新
   - `savePlan`がstorageServiceから呼び出され、ローカルストレージにのみ保存
   - クラウド（Firestore）への保存処理が欠落

2. **データフローの問題**
   - 現在: updatePlan → storageService.savePlan（ローカルのみ）
   - 正しい: updatePlan → PlanService.savePlan（クラウド+ローカル）

### 修正方針
PlanNameEditModalのsave関数でPlanServiceを使用してクラウドに保存する。

### 実装詳細

1. **PlanNameEditModal.tsxの修正（47-61行目）**

```typescript
// 現在の実装（問題あり）
const save = () => {
  if (name.trim() && plan) {
    const updatedPlan = { 
      ...plan, 
      name: name.trim(),
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      updatedAt: new Date()
    };
    updatePlan(updatedPlan);
    savePlan(updatedPlan);  // ローカルストレージのみに保存
    onClose();
  }
};

// 修正後の実装
const save = async () => {
  if (name.trim() && plan) {
    try {
      // DIコンテナからPlanServiceを取得
      const container = DIContainer.getInstance();
      const planService = container.getPlanService();
      
      const updatedPlan = { 
        ...plan, 
        name: name.trim(),
        places,
        labels,
        totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        updatedAt: new Date()
      };
      
      // ローカル状態を更新
      updatePlan(updatedPlan);
      
      // クラウドとローカルの両方に保存
      await planService.savePlan(updatedPlan);
      
      onClose();
    } catch (error) {
      console.error('[PlanNameEditModal] Failed to save plan name:', error);
      alert('プラン名の保存に失敗しました。もう一度お試しください。');
    }
  }
};
```

2. **関連する修正**
   - save関数を`async`に変更
   - ボタンのonClickハンドラも非同期対応（369行目）:
   ```typescript
   <button 
     className="btn-primary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed" 
     onClick={save}  // 非同期でも問題なし
     disabled={!name.trim()}
   >
     保存
   </button>
   ```
   
   - handleKeyPressも修正（176-178行目）:
   ```typescript
   const handleKeyPress = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && activeTab === 'edit') {
       save();  // 非同期でも問題なし
     } else if (e.key === 'Escape') {
       onClose();
     }
   };
   ```

3. **インポートの削除**
   - storageServiceのsavePlanインポートを削除（6-8行目）:
   ```typescript
   import { 
     savePlan,  // この行を削除
     setActivePlan 
   } from '../services/storageService';
   ```

### 実装手順

1. **PlanNameEditModal.tsxを開く**
2. **save関数を上記の修正後の実装に置き換える**
3. **storageServiceからsavePlanのインポートを削除**
4. **動作確認**
   - プラン名を変更して保存
   - ページをリロード
   - プラン名が保持されていることを確認
   - 複数デバイスでも同期されることを確認

### 期待される結果

この修正により：
1. プラン名の変更がクラウド（Firestore）に保存される
2. リロード後もプラン名が保持される
3. 複数デバイス間でプラン名の変更が同期される
4. ローカルとクラウドのデータが一致する

## タスク28: プラン名変更の自動保存同期問題の修正

### 背景と問題
タスク27実行後、プラン名変更後のリロードでプラン自体が削除される問題が発生。ただし、リロード前に候補地を追加すると問題を回避できる。

### 問題の詳細な原因分析
1. **自動保存システムの設計上の欠陥**
   - `usePlanSyncEvents`フックは以下のイベントのみを監視：
     - onPlaceAdded（候補地追加）
     - onPlaceDeleted（候補地削除）
     - onLabelAdded/Updated/Deleted（ラベル操作）
   - **プラン自体の更新（名前変更等）を監視するリスナーが存在しない**

2. **候補地追加で問題が回避される理由**
   - 候補地追加時、`onPlaceAdded`イベントが発火
   - プラン全体（名前変更も含む）が自動保存される
   - これにより、変更されたプラン名も正しく保存される

3. **現在の処理フローの問題点**
   - PlanNameEditModal: `planService.savePlan()`を呼び出し
   - planService: Firestoreとローカルに保存
   - しかし、`usePlanStore.updatePlan()`はローカル状態のみ更新
   - 自動保存システムがプラン名変更を検知できない

### 修正方針

#### 方針1: usePlanSyncEventsにプラン更新リスナーを追加（推奨）

1. **planStoreにonPlanUpdatedコールバックを追加**
```typescript
// src/store/planStore.ts
interface PlanState {
  // 既存のフィールド...
  onPlanUpdated?: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  // 既存のフィールド...
  onPlanUpdated: undefined,
  setOnPlanUpdated: (callback) => set({ onPlanUpdated: callback }),
  updatePlan: (update) => set((state) => {
    if (state.plan) {
      const updatedPlan = { ...state.plan, ...update };
      
      // 更新後のコールバックを実行
      if (state.onPlanUpdated) {
        state.onPlanUpdated(updatedPlan);
      }
      
      return { plan: updatedPlan };
    }
    return state;
  }),
}));
```

2. **usePlanSyncEventsにプラン更新リスナーを追加**
```typescript
// src/hooks/usePlanSyncEvents.ts
export function usePlanSyncEvents(
  plan: TravelPlan | null,
  saveImmediately: (plan: TravelPlan) => void,
  saveImmediatelyCloud: (plan: TravelPlan) => void,
  saveWithSyncManager?: (plan: TravelPlan, operationType?: string) => void
) {
  // 既存のuseEffect...

  // プラン更新イベントのリスナーを追加
  useEffect(() => {
    const { setOnPlanUpdated } = usePlanStore.getState();
    setOnPlanUpdated((updatedPlan) => {
      // 新しい同期システムがある場合はそれを使用、なければ従来の方法
      if (saveWithSyncManager) {
        saveWithSyncManager(updatedPlan, 'plan_updated');
      } else {
        saveImmediately(updatedPlan);
        saveImmediatelyCloud(updatedPlan);
      }
      
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'plan_updated',
        planName: updatedPlan.name,
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
}
```

3. **PlanNameEditModalの修正を元に戻す**
```typescript
// src/components/PlanNameEditModal.tsx
const save = () => {
  if (name.trim() && plan) {
    const updatedPlan = { 
      ...plan, 
      name: name.trim(),
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      updatedAt: new Date()
    };
    
    // updatePlanを呼ぶだけで、onPlanUpdatedコールバックが自動保存を実行
    updatePlan(updatedPlan);
    onClose();
  }
};
```

### 実装手順

1. **planStore.tsを開いて修正**
   - onPlanUpdatedコールバックフィールドを追加
   - setOnPlanUpdatedメソッドを追加
   - updatePlanメソッドを修正してコールバックを実行

2. **usePlanSyncEvents.tsを開いて修正**
   - プラン更新リスナーのuseEffectを追加
   - saveWithSyncManagerのoperationTypeに'plan_updated'を追加可能にする

3. **PlanNameEditModal.tsxの修正**
   - save関数を簡略化（DIContainer関連のコードを削除）
   - エラーハンドリングは自動保存システムに委譲

4. **動作確認**
   - プラン名を変更して保存
   - 候補地を追加せずにリロード
   - プラン名が保持され、プランが削除されないことを確認

### 期待される結果

この修正により：
1. プラン名変更が自動保存システムによって適切に検知・保存される
2. リロード後もプランが削除されない
3. 候補地追加なしでもプラン名変更が正しく保存される
4. 他のプラン属性（説明、日程等）の変更も同様に自動保存される

## タスク29: 「詳細を見る」ボタンから開いたPlaceDetailPanelで画像が表示されない問題の修正

### 問題の概要
- 候補地オーバーレイの「詳細を見る」ボタンからPlaceDetailPanelを開いた際、画像が表示されない
- POIから直接PlaceDetailsPanelを開いた場合は画像が正常に表示される

### 原因分析
1. Place型には`photos: string[]`プロパティが存在する（src/types/index.ts:20）
2. PlaceDetailPanelは`place.photos`から画像データを取得している（PlaceDetailPanel.tsx:101）
3. 「詳細を見る」ボタンのクリック処理でPlace型からgoogle.maps.places.PlaceResult型に変換する際、`photos`プロパティが含まれていない

### 修正内容

#### 1. PlaceCircle.tsx内の変換処理を修正
現在のコード（詳細オーバーレイ内の「詳細を見る」ボタン）：
```javascript
setPlace({
  place_id: place.id,
  name: place.name,
  formatted_address: place.address,
  geometry: {
    location: {
      lat: () => place.coordinates.lat,
      lng: () => place.coordinates.lng,
    } as google.maps.LatLng,
  },
  types: [place.category],
} as google.maps.places.PlaceResult);
```

修正後：
```javascript
setPlace({
  place_id: place.id,
  name: place.name,
  formatted_address: place.address,
  geometry: {
    location: {
      lat: () => place.coordinates.lat,
      lng: () => place.coordinates.lng,
    } as google.maps.LatLng,
  },
  types: [place.category],
  photos: place.photos, // 画像データを追加
} as google.maps.places.PlaceResult);
```

#### 2. PlaceSimpleOverlay.tsx内の変換処理を修正
同様に、簡易オーバーレイ内の詳細ボタンクリック処理にも`photos: place.photos`を追加する必要がある。

### 実装手順

1. **PlaceCircle.tsxを開く**
   - 「詳細を見る」ボタンのonClickハンドラ内（約237行目）
   - `setPlace`呼び出しに`photos: place.photos`を追加

2. **PlaceSimpleOverlay.tsxを開く**
   - 詳細ボタンのonClickハンドラ内（約106-117行目）
   - `setPlace`呼び出しに`photos: place.photos`を追加

3. **動作確認**
   - 候補地の詳細オーバーレイから「詳細を見る」ボタンをクリック
   - PlaceDetailPanelに画像が表示されることを確認
   - 簡易オーバーレイからも同様に確認

### 補足
- Place型の`photos`は`string[]`型で画像URLの配列を保持している
- PlaceDetailPanel内では、この画像データをそのまま使用できる
- 画像URLは既に適切なフォーマットで保存されているため、追加の変換は不要

## タスク30: 最新候補地点リスタート機能の復活

### 背景と問題
アプリ起動後、最後に追加した地点から再開する機能（タスク20, 21, 24で実装）が失われている。リファクタリングでplanStoreのupdateLastActionPositionメソッドがdeprecatedになり、実際の保存処理が行われなくなったことが原因。

### 問題の詳細
1. **updateLastActionPositionメソッドの無効化**
   - planStore.tsのupdateLastActionPositionが警告を出すだけで、Firestoreへの保存を実行しない
   - placesStore、labelsStoreから呼び出されても実際には何も保存されていない

2. **新しいアーキテクチャへの対応不足**
   - PlanServiceにupdateLastActionPositionに相当するメソッドが存在しない
   - DIコンテナベースの新アーキテクチャに対応した実装が必要

3. **読み込み処理は正常**
   - MapStateManager、MapContainerでの読み込み処理は実装済み
   - planCloudServiceでlastActionPositionの読み込みも実装済み
   - 保存処理のみが欠落している状態

### 修正方針
新しいアーキテクチャに沿って、PlanServiceにupdateLastActionPositionメソッドを追加し、DIコンテナを通じて利用可能にする。

### 実装詳細

#### 1. PlanService.tsに新メソッドを追加（src/services/plan/PlanService.ts）

```typescript
// インポートにserverTimestampを追加
import { serverTimestamp } from 'firebase/firestore';

// PlanServiceクラスに以下のメソッドを追加（89行目の後）
async updateLastActionPosition(
  planId: string,
  position: google.maps.LatLngLiteral,
  userId: string,
  actionType: 'place' | 'label'
): Promise<void> {
  const lastActionPosition = {
    position: {
      lat: position.lat,
      lng: position.lng
    },
    timestamp: serverTimestamp(),
    userId,
    actionType
  };
  
  console.log('[PlanService] Updating last action position:', {
    planId,
    position,
    userId,
    actionType
  });
  
  try {
    await this.planRepository.updatePlan(planId, {
      lastActionPosition
    });
    
    // ローカルキャッシュも更新
    const cachedPlan = await this.localCacheRepository.loadPlan(planId);
    if (cachedPlan) {
      cachedPlan.lastActionPosition = {
        ...lastActionPosition,
        timestamp: new Date() // ローカルではDateオブジェクトを使用
      };
      await this.localCacheRepository.savePlan(cachedPlan);
    }
    
    console.log('[PlanService] Last action position updated successfully');
  } catch (error) {
    console.error('[PlanService] Failed to update last action position:', error);
    throw error;
  }
}
```

#### 2. IPlanRepositoryインターフェースに更新メソッドを追加（src/repositories/interfaces/IPlanRepository.ts）

```typescript
// 既存のメソッドの後に追加
updatePlan(planId: string, update: Partial<TravelPlan>): Promise<void>;
```

#### 3. FirestorePlanRepositoryに実装を追加（src/repositories/FirestorePlanRepository.ts）

```typescript
// クラスに以下のメソッドを追加
async updatePlan(planId: string, update: Partial<TravelPlan>): Promise<void> {
  try {
    const planRef = doc(this.db, 'plans', planId);
    await updateDoc(planRef, {
      ...update,
      updatedAt: serverTimestamp()
    });
    console.log('[FirestorePlanRepository] Plan updated:', planId);
  } catch (error) {
    console.error('[FirestorePlanRepository] Failed to update plan:', error);
    throw error;
  }
}
```

#### 4. LocalStoragePlanRepositoryにも実装を追加（src/repositories/LocalStoragePlanRepository.ts）

```typescript
// クラスに以下のメソッドを追加
async updatePlan(planId: string, update: Partial<TravelPlan>): Promise<void> {
  const plans = this.loadAllPlans();
  const planIndex = plans.findIndex(p => p.id === planId);
  
  if (planIndex !== -1) {
    plans[planIndex] = {
      ...plans[planIndex],
      ...update,
      updatedAt: new Date()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(plans));
    console.log('[LocalStoragePlanRepository] Plan updated:', planId);
  } else {
    throw new Error(`Plan not found: ${planId}`);
  }
}
```

#### 5. placesStore.tsの修正（src/store/placesStore.ts）

```typescript
// インポートを追加
import { DIContainer } from '../di/DIContainer';
import { useAuthStore } from '../hooks/useAuth';

// addPlaceメソッド内のupdateLastActionPosition呼び出し部分を修正（66-72行目を置換）
// Firestoreに最後の操作位置を保存（新アーキテクチャ対応）
const { plan } = usePlanStore.getState();
const { user } = useAuthStore.getState();

if (plan && user) {
  console.log('[placesStore] Saving last action position for new place:', {
    placeId: newPlace.id,
    placeName: newPlace.name,
    coordinates: newPlace.coordinates
  });
  
  try {
    const container = DIContainer.getInstance();
    const planService = container.getPlanService();
    
    await planService.updateLastActionPosition(
      plan.id,
      newPlace.coordinates,
      user.uid,
      'place'
    );
    
    console.log('[placesStore] Last action position saved successfully');
  } catch (error) {
    console.error('[placesStore] Failed to update last action position:', error);
  }
}
```

#### 6. labelsStore.tsの修正（src/store/labelsStore.ts）

```typescript
// インポートを追加
import { DIContainer } from '../di/DIContainer';
import { useAuthStore } from '../hooks/useAuth';

// addLabelメソッド内のupdateLastActionPosition呼び出し部分を修正（対応する行を置換）
// Firestoreに最後の操作位置を保存（新アーキテクチャ対応）
const { plan } = usePlanStore.getState();
const { user } = useAuthStore.getState();

if (plan && user) {
  console.log('[labelsStore] Saving last action position for new label:', {
    labelId: newLabel.id,
    text: newLabel.text,
    position: newLabel.position
  });
  
  try {
    const container = DIContainer.getInstance();
    const planService = container.getPlanService();
    
    await planService.updateLastActionPosition(
      plan.id,
      newLabel.position,
      user.uid,
      'label'
    );
    
    console.log('[labelsStore] Last action position saved successfully');
  } catch (error) {
    console.error('[labelsStore] Failed to update last action position:', error);
  }
}
```

#### 7. planStoreの状態更新も追加（オプション）

MapStateManagerの実装を確認すると、planオブジェクトのlastActionPositionを監視しているため、ローカルの状態も更新する必要がある場合があります。

```typescript
// PlanService.tsのupdateLastActionPositionメソッド内に追加
// planStoreの状態も更新（リアルタイム反映のため）
const { setPlan, plan: currentPlan } = usePlanStore.getState();
if (currentPlan && currentPlan.id === planId) {
  setPlan({
    ...currentPlan,
    lastActionPosition: {
      position: {
        lat: position.lat,
        lng: position.lng
      },
      timestamp: new Date(),
      userId,
      actionType
    }
  });
}
```

### 実装手順

1. **IPlanRepositoryインターフェースに`updatePlan`メソッドを追加**
2. **FirestorePlanRepositoryとLocalStoragePlanRepositoryに実装を追加**
3. **PlanServiceに`updateLastActionPosition`メソッドを追加**
4. **placesStoreとlabelsStoreの呼び出し部分を新実装に置き換え**
5. **動作確認とデバッグ**

### テスト項目

- [ ] 候補地追加時にコンソールログで保存処理が確認できる
- [ ] FirestoreコンソールでlastActionPositionフィールドが更新される
- [ ] アプリをリロードして最後に追加した候補地の位置から開始する
- [ ] 別デバイスでも同じ位置から開始することを確認
- [ ] メモ（ラベル）追加時も同様に動作することを確認
- [ ] エラーが発生した場合、適切にログが出力される

### 期待される結果

この修正により：
1. 最後に追加された候補地・メモの位置がFirestoreに保存される
2. アプリ起動時にその位置から地図が開始される
3. プラン参加者全員で最後の操作位置が共有される
4. 新しいDIコンテナベースのアーキテクチャに完全に準拠した実装となる