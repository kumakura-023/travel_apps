# プラン管理システム大規模リファクタリング計画

## 概要

現在のプラン管理システムは責務が混在し、データソースの不整合や非同期処理の競合状態が発生しています。単一責任原則に基づいたアーキテクチャに再設計します。

## 現状の問題点

### 1. 責務の混在

- `storageService.ts`: プラン管理、マップ状態、アクティブプランID管理など複数の責務
- `planStore.ts`: 状態管理とビジネスロジックの混在
- `usePlanLoad.ts`: 初期化ロジックとデータ取得の混在

### 2. データソースの不整合

- Firestore、localStorage、Zustand Storeの3つが独立して動作
- 同期タイミングが保証されていない
- 削除時の不整合（Firestoreから削除してもlocalStorageに残る）

### 3. エラーハンドリングの不統一

- 各層で異なるエラーハンドリング
- エラー時の状態が不明確

## 新アーキテクチャ設計

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Components │ ←── │  Zustand Stores │ ←── │   Coordinators  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                           ↑
                                                           │
                                                  ┌────────┴────────┐
                                                  │    Services     │
                                                  └────────┬────────┘
                                                           │
                                              ┌────────────┴────────────┐
                                              ↓                         ↓
                                    ┌─────────────────┐      ┌─────────────────┐
                                    │   Repositories   │      │    Adapters     │
                                    └─────────────────┘      └─────────────────┘
                                              ↓                         ↓
                                    ┌─────────────────┐      ┌─────────────────┐
                                    │Firestore/Storage│      │  External APIs  │
                                    └─────────────────┘      └─────────────────┘
```

### 各層の責務

1. **Repository層**: データの永続化のみ
2. **Service層**: ビジネスロジック
3. **Store層**: UIの状態管理
4. **Coordinator層**: 初期化と各層の調整

## リファクタリングステップ

### Step 1: Repository層の実装（4時間）

#### Task 1.1: IPlanRepository インターフェースの定義

```typescript
// src/repositories/interfaces/IPlanRepository.ts
export interface IPlanRepository {
  // 単一プランの操作
  savePlan(plan: TravelPlan): Promise<void>;
  loadPlan(planId: string): Promise<TravelPlan | null>;
  deletePlan(planId: string): Promise<void>;

  // プランリストの操作
  getAllPlans(): Promise<TravelPlan[]>;

  // リアルタイム監視（Firestoreのみ）
  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void;
}
```

#### Task 1.2: FirestorePlanRepository の実装

```typescript
// src/repositories/FirestorePlanRepository.ts
import { IPlanRepository } from "./interfaces/IPlanRepository";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { TravelPlan } from "../types";
import { serializePlan, deserializePlan } from "../utils/planSerializer";

export class FirestorePlanRepository implements IPlanRepository {
  private readonly plansCollection = collection(db, "plans");

  async savePlan(plan: TravelPlan): Promise<void> {
    const planRef = doc(this.plansCollection, plan.id);
    const payload = serializePlan(plan);

    await setDoc(planRef, {
      payload,
      name: plan.name,
      ownerId: plan.ownerId,
      members: plan.members || {},
      updatedAt: new Date(),
      lastActionPosition: plan.lastActionPosition || null,
    });
  }

  async loadPlan(planId: string): Promise<TravelPlan | null> {
    const planRef = doc(this.plansCollection, planId);
    const snapshot = await getDoc(planRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    const plan = deserializePlan(data.payload as string);

    // メタデータを追加
    plan.ownerId = data.ownerId;
    plan.members = data.members;
    if (data.name) plan.name = data.name;
    if (data.lastActionPosition)
      plan.lastActionPosition = data.lastActionPosition;

    return plan;
  }

  async deletePlan(planId: string): Promise<void> {
    const planRef = doc(this.plansCollection, planId);
    await deleteDoc(planRef);
  }

  async getAllPlans(): Promise<TravelPlan[]> {
    // 注: この実装は現在のユーザーのプランのみを返すべき
    // ユーザーIDは上位層から渡される必要がある
    throw new Error(
      "getAllPlans requires user context - use PlanService instead",
    );
  }

  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    const planRef = doc(this.plansCollection, planId);

    return onSnapshot(planRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      const plan = deserializePlan(data.payload as string);

      // メタデータを追加
      plan.ownerId = data.ownerId;
      plan.members = data.members;
      if (data.name) plan.name = data.name;
      if (data.lastActionPosition)
        plan.lastActionPosition = data.lastActionPosition;

      callback(plan);
    });
  }
}
```

#### Task 1.3: LocalStoragePlanRepository の実装

```typescript
// src/repositories/LocalStoragePlanRepository.ts
import { IPlanRepository } from "./interfaces/IPlanRepository";
import { TravelPlan } from "../types";
import { parseJSON } from "../utils/planSerializer";

export class LocalStoragePlanRepository implements IPlanRepository {
  private readonly PLAN_PREFIX = "travel-app-plan-";

  async savePlan(plan: TravelPlan): Promise<void> {
    const key = this.getPlanKey(plan.id);
    const data = JSON.stringify(plan, null, 2);
    localStorage.setItem(key, data);
  }

  async loadPlan(planId: string): Promise<TravelPlan | null> {
    const key = this.getPlanKey(planId);
    const data = localStorage.getItem(key);

    if (!data) return null;

    try {
      return parseJSON(data) as TravelPlan;
    } catch (error) {
      console.error("Failed to parse plan from localStorage:", error);
      return null;
    }
  }

  async deletePlan(planId: string): Promise<void> {
    const key = this.getPlanKey(planId);
    localStorage.removeItem(key);
  }

  async getAllPlans(): Promise<TravelPlan[]> {
    const plans: TravelPlan[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PLAN_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const plan = parseJSON(data) as TravelPlan;
            plans.push(plan);
          } catch (error) {
            console.error("Failed to parse plan:", error);
          }
        }
      }
    }

    // 作成日の降順でソート
    return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    // LocalStorageはリアルタイム監視をサポートしない
    // 初回のみコールバックを実行
    this.loadPlan(planId).then(callback);

    // 空のunsubscribe関数を返す
    return () => {};
  }

  private getPlanKey(planId: string): string {
    return `${this.PLAN_PREFIX}${planId}`;
  }
}
```

#### Task 1.4: IUserRepository インターフェースの定義

```typescript
// src/repositories/interfaces/IUserRepository.ts
export interface IUserRepository {
  getActivePlanId(userId: string): Promise<string | null>;
  setActivePlanId(userId: string, planId: string): Promise<void>;
  getUserPlans(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]>;
}
```

#### Task 1.5: FirestoreUserRepository の実装

```typescript
// src/repositories/FirestoreUserRepository.ts
import { IUserRepository } from "./interfaces/IUserRepository";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export class FirestoreUserRepository implements IUserRepository {
  private readonly usersCollection = "users";

  async getActivePlanId(userId: string): Promise<string | null> {
    const userRef = doc(db, this.usersCollection, userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return data.activePlanId || null;
  }

  async setActivePlanId(userId: string, planId: string): Promise<void> {
    const userRef = doc(db, this.usersCollection, userId);

    await updateDoc(userRef, {
      activePlanId: planId,
      updatedAt: serverTimestamp(),
    });
  }

  async getUserPlans(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]> {
    const userRef = doc(db, this.usersCollection, userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.data();
    return data.plans || [];
  }
}
```

### Step 2: Service層の実装（4時間）

#### Task 2.1: PlanService の実装

```typescript
// src/services/plan/PlanService.ts
import { IPlanRepository } from "../../repositories/interfaces/IPlanRepository";
import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { TravelPlan } from "../../types";
import { v4 as uuidv4 } from "uuid";

export class PlanService {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly userRepository: IUserRepository,
    private readonly localCacheRepository: IPlanRepository, // LocalStorage for caching
  ) {}

  /**
   * プランを作成（単一責任：プラン作成のビジネスロジック）
   */
  async createPlan(userId: string, name: string): Promise<TravelPlan> {
    const now = new Date();
    const newPlan: TravelPlan = {
      id: uuidv4(),
      name,
      places: [],
      routes: [],
      labels: [],
      days: 1,
      startDate: now,
      endDate: now,
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ownerId: userId,
      members: {
        [userId]: { role: "owner", joinedAt: now },
      },
    };

    // Firestoreに保存
    await this.planRepository.savePlan(newPlan);

    // ローカルキャッシュにも保存
    await this.localCacheRepository.savePlan(newPlan);

    return newPlan;
  }

  /**
   * プランを保存（単一責任：プラン保存のビジネスロジック）
   */
  async savePlan(plan: TravelPlan): Promise<void> {
    // 更新日時を設定
    plan.updatedAt = new Date();

    // Firestoreに保存
    await this.planRepository.savePlan(plan);

    // ローカルキャッシュも更新
    await this.localCacheRepository.savePlan(plan);
  }

  /**
   * プランを削除（単一責任：プラン削除のビジネスロジック）
   */
  async deletePlan(userId: string, planId: string): Promise<string | null> {
    // Firestoreから削除
    await this.planRepository.deletePlan(planId);

    // ローカルキャッシュからも削除
    await this.localCacheRepository.deletePlan(planId);

    // ユーザーのプランリストを取得
    const userPlans = await this.userRepository.getUserPlans(userId);
    const remainingPlans = userPlans.filter((p) => p.id !== planId);

    // 残りのプランがある場合は最初のプランを返す
    if (remainingPlans.length > 0) {
      return remainingPlans[0].id;
    }

    // プランがない場合はnullを返す
    return null;
  }

  /**
   * プランをロード（単一責任：プラン取得のビジネスロジック）
   */
  async loadPlan(planId: string): Promise<TravelPlan | null> {
    // まずローカルキャッシュから取得を試みる
    const cachedPlan = await this.localCacheRepository.loadPlan(planId);
    if (cachedPlan) {
      return cachedPlan;
    }

    // キャッシュになければFirestoreから取得
    const plan = await this.planRepository.loadPlan(planId);

    // 取得できたらキャッシュに保存
    if (plan) {
      await this.localCacheRepository.savePlan(plan);
    }

    return plan;
  }

  /**
   * プランのリアルタイム監視（単一責任：リアルタイム同期のビジネスロジック）
   */
  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    return this.planRepository.listenToPlan(planId, async (plan) => {
      // Firestoreから更新があったらローカルキャッシュも更新
      if (plan) {
        await this.localCacheRepository.savePlan(plan);
      } else {
        await this.localCacheRepository.deletePlan(planId);
      }

      callback(plan);
    });
  }
}
```

#### Task 2.2: ActivePlanService の実装

```typescript
// src/services/plan/ActivePlanService.ts
import { IUserRepository } from "../../repositories/interfaces/IUserRepository";

export class ActivePlanService {
  private readonly ACTIVE_PLAN_KEY = "travel-app-active-plan";

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * アクティブプランIDを取得（単一責任：アクティブプラン取得）
   */
  async getActivePlanId(userId: string): Promise<string | null> {
    // Firestoreから取得
    const firestoreId = await this.userRepository.getActivePlanId(userId);

    // ローカルストレージからも取得（オフライン対応）
    const localId = localStorage.getItem(this.ACTIVE_PLAN_KEY);

    // Firestoreを優先、なければローカル
    return firestoreId || localId;
  }

  /**
   * アクティブプランIDを設定（単一責任：アクティブプラン設定）
   */
  async setActivePlanId(userId: string, planId: string): Promise<void> {
    // Firestoreに保存
    await this.userRepository.setActivePlanId(userId, planId);

    // ローカルストレージにも保存（オフライン対応）
    if (planId) {
      localStorage.setItem(this.ACTIVE_PLAN_KEY, planId);
    } else {
      localStorage.removeItem(this.ACTIVE_PLAN_KEY);
    }
  }
}
```

### Step 3: Coordinator層の実装（3時間）

#### Task 3.1: PlanCoordinator の実装

```typescript
// src/coordinators/PlanCoordinator.ts
import { PlanService } from "../services/plan/PlanService";
import { ActivePlanService } from "../services/plan/ActivePlanService";
import { usePlanStore } from "../store/planStore";
import { usePlacesStore } from "../store/placesStore";
import { useLabelsStore } from "../store/labelsStore";
import { TravelPlan } from "../types";

export class PlanCoordinator {
  private currentPlanUnsubscribe?: () => void;

  constructor(
    private readonly planService: PlanService,
    private readonly activePlanService: ActivePlanService,
  ) {}

  /**
   * 初期化（単一責任：初期化フローの調整）
   */
  async initialize(userId: string): Promise<void> {
    try {
      // 1. アクティブプランIDを取得
      const activePlanId = await this.activePlanService.getActivePlanId(userId);

      if (activePlanId) {
        // 2. アクティブプランをロード
        await this.loadAndListenToPlan(activePlanId);
      } else {
        // 3. プランがない場合は空の状態を設定
        this.setEmptyState();
      }
    } catch (error) {
      console.error("[PlanCoordinator] Failed to initialize:", error);
      this.setErrorState(error);
    }
  }

  /**
   * プランを切り替え（単一責任：プラン切り替えの調整）
   */
  async switchPlan(userId: string, planId: string): Promise<void> {
    try {
      // 1. 現在の監視を停止
      this.stopListening();

      // 2. アクティブプランIDを更新
      await this.activePlanService.setActivePlanId(userId, planId);

      // 3. 新しいプランをロードして監視開始
      await this.loadAndListenToPlan(planId);
    } catch (error) {
      console.error("[PlanCoordinator] Failed to switch plan:", error);
      this.setErrorState(error);
    }
  }

  /**
   * プランを削除（単一責任：プラン削除フローの調整）
   */
  async deletePlan(userId: string, planId: string): Promise<void> {
    try {
      // 1. プランを削除（次のプランIDが返される）
      const nextPlanId = await this.planService.deletePlan(userId, planId);

      if (nextPlanId) {
        // 2. 次のプランに切り替え
        await this.switchPlan(userId, nextPlanId);
      } else {
        // 3. プランがない場合は空の状態を設定
        await this.activePlanService.setActivePlanId(userId, "");
        this.setEmptyState();
      }
    } catch (error) {
      console.error("[PlanCoordinator] Failed to delete plan:", error);
      this.setErrorState(error);
    }
  }

  /**
   * クリーンアップ（単一責任：リソースの解放）
   */
  cleanup(): void {
    this.stopListening();
  }

  private async loadAndListenToPlan(planId: string): Promise<void> {
    // ローディング状態を設定
    usePlanStore.setState({ isLoading: true });

    // プランをロード
    const plan = await this.planService.loadPlan(planId);

    if (plan) {
      // 初期データを設定
      this.updateStores(plan);

      // リアルタイム監視を開始
      this.currentPlanUnsubscribe = this.planService.listenToPlan(
        planId,
        (updatedPlan) => {
          if (updatedPlan) {
            this.updateStores(updatedPlan);
          } else {
            // プランが削除された場合
            this.setEmptyState();
          }
        },
      );
    } else {
      // プランが見つからない場合
      this.setEmptyState();
    }
  }

  private updateStores(plan: TravelPlan): void {
    usePlanStore.setState({
      plan,
      isLoading: false,
      error: null,
    });
    usePlacesStore.setState({ places: plan.places || [] });
    useLabelsStore.setState({ labels: plan.labels || [] });
  }

  private setEmptyState(): void {
    usePlanStore.setState({
      plan: null,
      isLoading: false,
      error: null,
    });
    usePlacesStore.setState({ places: [] });
    useLabelsStore.setState({ labels: [] });
  }

  private setErrorState(error: any): void {
    usePlanStore.setState({
      plan: null,
      isLoading: false,
      error: error.message || "Unknown error",
    });
  }

  private stopListening(): void {
    if (this.currentPlanUnsubscribe) {
      this.currentPlanUnsubscribe();
      this.currentPlanUnsubscribe = undefined;
    }
  }
}
```

### Step 4: Store層の整理（2時間）

#### Task 4.1: planStore の簡素化

```typescript
// src/store/planStore.ts
import { create } from "zustand";
import { TravelPlan } from "../types";

interface PlanState {
  plan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;
}

// Storeは状態管理のみに専念（ビジネスロジックを含まない）
export const usePlanStore = create<PlanState>(() => ({
  plan: null,
  isLoading: true,
  error: null,
}));
```

### Step 5: 依存性注入コンテナの実装（2時間）

#### Task 5.1: DIContainer の実装

```typescript
// src/di/DIContainer.ts
import { FirestorePlanRepository } from "../repositories/FirestorePlanRepository";
import { LocalStoragePlanRepository } from "../repositories/LocalStoragePlanRepository";
import { FirestoreUserRepository } from "../repositories/FirestoreUserRepository";
import { PlanService } from "../services/plan/PlanService";
import { ActivePlanService } from "../services/plan/ActivePlanService";
import { PlanCoordinator } from "../coordinators/PlanCoordinator";

export class DIContainer {
  private static instance: DIContainer;

  // Repositories
  private firestorePlanRepository: FirestorePlanRepository;
  private localStoragePlanRepository: LocalStoragePlanRepository;
  private firestoreUserRepository: FirestoreUserRepository;

  // Services
  private planService: PlanService;
  private activePlanService: ActivePlanService;

  // Coordinators
  private planCoordinator: PlanCoordinator;

  private constructor() {
    // Repositoriesの初期化
    this.firestorePlanRepository = new FirestorePlanRepository();
    this.localStoragePlanRepository = new LocalStoragePlanRepository();
    this.firestoreUserRepository = new FirestoreUserRepository();

    // Servicesの初期化
    this.planService = new PlanService(
      this.firestorePlanRepository,
      this.firestoreUserRepository,
      this.localStoragePlanRepository,
    );

    this.activePlanService = new ActivePlanService(
      this.firestoreUserRepository,
    );

    // Coordinatorsの初期化
    this.planCoordinator = new PlanCoordinator(
      this.planService,
      this.activePlanService,
    );
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  getPlanCoordinator(): PlanCoordinator {
    return this.planCoordinator;
  }

  getPlanService(): PlanService {
    return this.planService;
  }
}
```

### Step 6: 既存コードの移行（4時間）

#### Task 6.1: usePlanInitializer フックの実装

```typescript
// src/hooks/usePlanInitializer.ts
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "./useAuth";
import { DIContainer } from "../di/DIContainer";

export function usePlanInitializer() {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const coordinatorRef = useRef<PlanCoordinator>();

  useEffect(() => {
    if (!user) {
      // ユーザーがログアウトした場合はクリーンアップ
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
        coordinatorRef.current = undefined;
      }
      setIsInitialized(false);
      return;
    }

    // 初期化
    const initialize = async () => {
      try {
        const container = DIContainer.getInstance();
        const coordinator = container.getPlanCoordinator();
        coordinatorRef.current = coordinator;

        await coordinator.initialize(user.uid);
        setIsInitialized(true);
      } catch (error) {
        console.error("[usePlanInitializer] Failed to initialize:", error);
      }
    };

    initialize();

    return () => {
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
      }
    };
  }, [user]);

  return { isInitialized };
}
```

#### Task 6.2: PlanNameEditModal の移行

```typescript
// src/components/PlanNameEditModal.tsx の confirmDelete 関数
const confirmDelete = async () => {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    console.log("[PlanNameEditModal] Starting plan deletion:", plan.id);
    setShowDeleteConfirm(false);

    // DIコンテナから取得
    const container = DIContainer.getInstance();
    const coordinator = container.getPlanCoordinator();

    // Coordinatorを通じて削除
    await coordinator.deletePlan(user.uid, plan.id);

    console.log("[PlanNameEditModal] Plan deletion completed");
    onClose();
  } catch (error) {
    console.error("[PlanNameEditModal] Failed to delete plan:", error);
    alert("プランの削除に失敗しました。もう一度お試しください。");
    setShowDeleteConfirm(false);
  }
};
```

#### Task 6.3: App.tsx の修正

```typescript
// src/App.tsx
import { usePlanInitializer } from './hooks/usePlanInitializer';

function App() {
  const { isInitialized } = usePlanInitializer();

  // 初期化が完了するまでローディング表示
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // 既存のApp実装...
}
```

### Step 7: テストの実装（3時間）

#### Task 7.1: Repository層のテスト

```typescript
// src/repositories/__tests__/LocalStoragePlanRepository.test.ts
import { LocalStoragePlanRepository } from "../LocalStoragePlanRepository";
import { TravelPlan } from "../../types";

describe("LocalStoragePlanRepository", () => {
  let repository: LocalStoragePlanRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStoragePlanRepository();
  });

  test("savePlan should store plan in localStorage", async () => {
    const plan: TravelPlan = createMockPlan();
    await repository.savePlan(plan);

    const savedPlan = await repository.loadPlan(plan.id);
    expect(savedPlan).toEqual(plan);
  });

  test("deletePlan should remove plan from localStorage", async () => {
    const plan: TravelPlan = createMockPlan();
    await repository.savePlan(plan);
    await repository.deletePlan(plan.id);

    const deletedPlan = await repository.loadPlan(plan.id);
    expect(deletedPlan).toBeNull();
  });
});
```

#### Task 7.2: Service層のテスト

```typescript
// src/services/plan/__tests__/PlanService.test.ts
import { PlanService } from "../PlanService";
import { IPlanRepository } from "../../../repositories/interfaces/IPlanRepository";
import { IUserRepository } from "../../../repositories/interfaces/IUserRepository";

describe("PlanService", () => {
  let planService: PlanService;
  let mockPlanRepo: jest.Mocked<IPlanRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockLocalRepo: jest.Mocked<IPlanRepository>;

  beforeEach(() => {
    mockPlanRepo = createMockPlanRepository();
    mockUserRepo = createMockUserRepository();
    mockLocalRepo = createMockPlanRepository();

    planService = new PlanService(mockPlanRepo, mockUserRepo, mockLocalRepo);
  });

  test("createPlan should save to both repositories", async () => {
    const userId = "user123";
    const planName = "Test Plan";

    const newPlan = await planService.createPlan(userId, planName);

    expect(newPlan.name).toBe(planName);
    expect(newPlan.ownerId).toBe(userId);
    expect(mockPlanRepo.savePlan).toHaveBeenCalledWith(newPlan);
    expect(mockLocalRepo.savePlan).toHaveBeenCalledWith(newPlan);
  });
});
```

### Step 8: 段階的移行とクリーンアップ（2時間）

#### Task 8.1: 旧コードの削除

- `src/services/storageService.ts` のプラン関連機能を削除
- `src/hooks/usePlanLoad.ts` を削除
- `src/store/planStore.ts` の不要なメソッドを削除

#### Task 8.2: ドキュメントの更新

- 新しいアーキテクチャのドキュメント作成
- APIリファレンスの更新
- 移行ガイドの作成

## 実装順序と優先度

### Phase 1: 基盤実装（必須 - 8時間）

1. Repository層の実装（Step 1）
2. Service層の実装（Step 2）
3. Coordinator層の実装（Step 3）

### Phase 2: 統合（必須 - 6時間）

4. Store層の整理（Step 4）
5. DIコンテナの実装（Step 5）
6. 既存コードの移行（Step 6）

### Phase 3: 品質保証（推奨 - 5時間）

7. テストの実装（Step 7）
8. 段階的移行とクリーンアップ（Step 8）

## リスク管理

### 移行リスクと対策

1. **データ不整合**: 段階的移行中は新旧両方のコードを維持
2. **ダウンタイム**: フィーチャーフラグで段階的に切り替え
3. **バグの混入**: 十分なテストカバレッジを確保

### ロールバック計画

- 各フェーズごとにタグを作成
- 問題が発生した場合は前のバージョンに戻す
- データマイグレーションは可逆的に実装

## 成功基準

1. **機能面**
   - プラン削除後の不整合が解消される
   - PlanNameDisplayが適切に表示される
   - データソースが常に同期される

2. **品質面**
   - 各クラスが単一責任原則に従う
   - テストカバレッジ80%以上
   - エラーハンドリングが統一される

3. **保守性**
   - 新機能追加が容易になる
   - デバッグが簡単になる
   - ドキュメントが整備される

## まとめ

このリファクタリングにより、現在の問題を根本的に解決し、将来の拡張性と保守性を大幅に向上させます。単一責任原則に基づいた設計により、各コンポーネントの役割が明確になり、テストとデバッグが容易になります。
