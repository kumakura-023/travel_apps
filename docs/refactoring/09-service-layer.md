# サービス層の境界明確化

## 現状の問題点

### サービス層の曖昧な境界
現在のアーキテクチャでは、サービス層とストア層、UI層の境界が不明確：

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Components    │────│     Services     │────│     Stores      │
│                 │    │                  │    │                 │
│ ・直接ストア呼出│    │ ・一部ビジネス   │    │ ・状態 + ロジック│
│ ・ビジネスロジック│    │ ・ストア操作     │    │ ・永続化         │
│ ・データ変換    │    │ ・UI状態管理     │    │ ・計算処理       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 具体的な問題例
```typescript
// PlanManager.tsx - UIコンポーネントなのにビジネスロジックが混在
const handleCreateNewPlan = async () => {
  if (!user) return; // 認証ロジック
  
  const newPlan = createEmptyPlan('新しいプラン'); // ドメインロジック
  const payload = serializePlan(newPlan); // データ変換ロジック
  
  try {
    const planId = await createNewPlan(user, newPlan.name, payload); // サービス呼出
    usePlanStore.getState().listenToPlan(planId); // ストア直接操作
    
    setTimeout(() => {
      usePlanListStore.getState().refreshPlans(); // 別ストア操作
    }, 500);
  } catch (error) {
    alert('プランの作成に失敗しました'); // エラーハンドリング
  }
};

// services/storageService.ts - 複数の責任が混在
export async function savePlanHybrid(plan: TravelPlan, config: SaveConfig) {
  // バリデーション（ドメインロジック）
  if (!plan.id) throw new Error('Plan ID is required');
  
  // データ変換（アプリケーションロジック）
  const serialized = serializePlan(plan);
  
  // 永続化（インフラストラクチャ）
  if (config.mode === 'local') {
    localStorage.setItem(`plan_${plan.id}`, JSON.stringify(serialized));
  } else {
    await firestore.collection('plans').doc(plan.id).set(serialized);
  }
  
  // UI状態更新（プレゼンテーション）
  toast.success('プランが保存されました');
}
```

### 責任の混在問題
1. **コンポーネントにビジネスロジック**: データ変換、バリデーション等
2. **サービスにUI制御**: トースト表示、ストア直接操作
3. **ストアにビジネスロジック**: 計算処理、データ変換
4. **インフラにドメインロジック**: バリデーション、ビジネスルール

## 目標とする設計

### クリーンアーキテクチャによる明確な層分離

```
┌─────────────────┐
│ Presentation    │ ← UI表示、ユーザー操作のみ
├─────────────────┤
│ Application     │ ← ユースケース、フロー制御
├─────────────────┤
│ Domain          │ ← ビジネスルール、ドメインモデル
├─────────────────┤
│ Infrastructure  │ ← データアクセス、外部API
└─────────────────┘
```

#### 各層の責任
1. **Presentation Layer**: UI表示、イベントハンドリング
2. **Application Layer**: ユースケース実行、トランザクション制御
3. **Domain Layer**: ビジネスルール、ドメインモデル
4. **Infrastructure Layer**: データ永続化、外部サービス連携

## 実装手順

### Step 1: ドメイン層の定義
```typescript
// src/domain/entities/Plan.ts
export class Plan {
  constructor(
    public readonly id: PlanId,
    public readonly name: PlanName,
    public readonly description: string,
    public readonly places: Place[],
    public readonly labels: Label[],
    public readonly settings: PlanSettings,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
  
  // ドメインロジックのみ
  getTotalCost(): number {
    return this.places.reduce((sum, place) => sum + place.estimatedCost.value, 0)
  }
  
  addPlace(place: Place): Plan {
    // ビジネスルールの検証
    if (this.places.length >= 100) {
      throw new DomainError('プランには最大100箇所まで追加できます')
    }
    
    if (this.places.some(p => p.id.equals(place.id))) {
      throw new DomainError('同じ場所は重複して追加できません')
    }
    
    return new Plan(
      this.id,
      this.name,
      this.description,
      [...this.places, place],
      this.labels,
      this.settings,
      this.createdAt,
      new Date()
    )
  }
  
  updateName(newName: PlanName): Plan {
    return new Plan(
      this.id,
      newName,
      this.description,
      this.places,
      this.labels,
      this.settings,
      this.createdAt,
      new Date()
    )
  }
  
  // 不変性の保証
  static create(name: string, description?: string): Plan {
    return new Plan(
      PlanId.generate(),
      new PlanName(name),
      description || '',
      [],
      [],
      PlanSettings.default(),
      new Date(),
      new Date()
    )
  }
}

// バリューオブジェクト
export class PlanName {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainError('プラン名は必須です')
    }
    if (value.length > 100) {
      throw new DomainError('プラン名は100文字以内で入力してください')
    }
  }
}
```

### Step 2: アプリケーション層（ユースケース）
```typescript
// src/application/usecases/CreatePlanUseCase.ts
export class CreatePlanUseCase {
  constructor(
    private planRepository: PlanRepository,
    private userRepository: UserRepository,
    private eventPublisher: EventPublisher
  ) {}
  
  async execute(command: CreatePlanCommand): Promise<CreatePlanResult> {
    // 認証確認
    const user = await this.userRepository.findById(command.userId)
    if (!user) {
      throw new ApplicationError('ユーザーが見つかりません')
    }
    
    // ビジネスルール確認
    const existingPlans = await this.planRepository.findByUserId(command.userId)
    if (existingPlans.length >= 50) {
      throw new ApplicationError('プランは最大50個まで作成できます')
    }
    
    // ドメインオブジェクト作成
    const plan = Plan.create(command.name, command.description)
    
    // 永続化
    await this.planRepository.save(plan, command.userId)
    
    // イベント発行
    await this.eventPublisher.publish(new PlanCreatedEvent(plan.id, command.userId))
    
    return new CreatePlanResult(plan.id.value, plan.name.value)
  }
}

// コマンドオブジェクト
export class CreatePlanCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly description?: string
  ) {}
}

export class CreatePlanResult {
  constructor(
    public readonly planId: string,
    public readonly planName: string
  ) {}
}
```

### Step 3: リポジトリインターフェース（ドメイン層）
```typescript
// src/domain/repositories/PlanRepository.ts
export interface PlanRepository {
  findById(id: PlanId, userId: string): Promise<Plan | null>
  findByUserId(userId: string): Promise<Plan[]>
  save(plan: Plan, userId: string): Promise<void>
  delete(id: PlanId, userId: string): Promise<void>
}

// src/domain/repositories/UserRepository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}
```

### Step 4: インフラストラクチャ層の実装
```typescript
// src/infrastructure/repositories/FirestorePlanRepository.ts
export class FirestorePlanRepository implements PlanRepository {
  constructor(private firestore: Firestore) {}
  
  async findById(id: PlanId, userId: string): Promise<Plan | null> {
    const doc = await this.firestore
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(id.value)
      .get()
    
    if (!doc.exists) return null
    
    const data = doc.data()!
    return this.toDomainEntity(data)
  }
  
  async save(plan: Plan, userId: string): Promise<void> {
    const data = this.toFirestoreDocument(plan)
    
    await this.firestore
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(plan.id.value)
      .set(data)
  }
  
  private toDomainEntity(data: any): Plan {
    // Firestoreデータからドメインエンティティへの変換
    return new Plan(
      new PlanId(data.id),
      new PlanName(data.name),
      data.description,
      data.places.map(this.toPlaceEntity),
      data.labels.map(this.toLabelEntity),
      this.toPlanSettings(data.settings),
      data.createdAt.toDate(),
      data.updatedAt.toDate()
    )
  }
  
  private toFirestoreDocument(plan: Plan): any {
    // ドメインエンティティからFirestoreドキュメントへの変換
    return {
      id: plan.id.value,
      name: plan.name.value,
      description: plan.description,
      places: plan.places.map(this.fromPlaceEntity),
      labels: plan.labels.map(this.fromLabelEntity),
      settings: this.fromPlanSettings(plan.settings),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    }
  }
}
```

### Step 5: プレゼンテーション層の簡素化
```typescript
// src/presentation/controllers/PlanController.ts
export class PlanController {
  constructor(
    private createPlanUseCase: CreatePlanUseCase,
    private updatePlanUseCase: UpdatePlanUseCase,
    private deletePlanUseCase: DeletePlanUseCase,
    private getPlanUseCase: GetPlanUseCase
  ) {}
  
  async createPlan(request: CreatePlanRequest): Promise<CreatePlanResponse> {
    try {
      const command = new CreatePlanCommand(
        request.userId,
        request.name,
        request.description
      )
      
      const result = await this.createPlanUseCase.execute(command)
      
      return new CreatePlanResponse(true, result.planId, result.planName)
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        return new CreatePlanResponse(false, null, null, error.message)
      }
      
      // 予期しないエラー
      console.error('Unexpected error in createPlan:', error)
      return new CreatePlanResponse(false, null, null, 'システムエラーが発生しました')
    }
  }
}

// src/presentation/hooks/usePlanController.ts
export function usePlanController() {
  const controller = useRef(container.get<PlanController>('PlanController'))
  
  const createPlan = useCallback(async (name: string, description?: string) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('認証が必要です')
    
    const request = new CreatePlanRequest(user.uid, name, description)
    const response = await controller.current.createPlan(request)
    
    if (!response.success) {
      throw new Error(response.errorMessage)
    }
    
    return {
      planId: response.planId!,
      planName: response.planName!
    }
  }, [])
  
  return { createPlan }
}
```

### Step 6: 依存性注入の設定
```typescript
// src/infrastructure/di/Container.ts
export function configureContainer(): Container {
  const container = new Container()
  
  // Infrastructure
  container.registerSingleton('Firestore', () => getFirestore())
  container.registerSingleton('PlanRepository', () => 
    new FirestorePlanRepository(container.get('Firestore'))
  )
  container.registerSingleton('UserRepository', () => 
    new FirestoreUserRepository(container.get('Firestore'))
  )
  container.registerSingleton('EventPublisher', () => 
    new EventPublisher()
  )
  
  // Application
  container.registerSingleton('CreatePlanUseCase', () =>
    new CreatePlanUseCase(
      container.get('PlanRepository'),
      container.get('UserRepository'),
      container.get('EventPublisher')
    )
  )
  
  // Presentation
  container.registerSingleton('PlanController', () =>
    new PlanController(
      container.get('CreatePlanUseCase'),
      container.get('UpdatePlanUseCase'),
      container.get('DeletePlanUseCase'),
      container.get('GetPlanUseCase')
    )
  )
  
  return container
}
```

## 移行計画

### Phase 1: ドメイン層構築 (3-4日)
- ドメインエンティティとバリューオブジェクトの実装
- ビジネスルールの抽出と実装
- ドメインサービスの作成

### Phase 2: アプリケーション層構築 (3-4日)
- ユースケースの実装
- コマンド・クエリオブジェクトの作成
- アプリケーションサービスの実装

### Phase 3: インフラストラクチャ層移行 (2-3日)
- リポジトリ実装の移行
- データマッピング層の実装
- 外部サービス連携の抽象化

### Phase 4: プレゼンテーション層簡素化 (3-4日)
- コントローラー層の実装
- カスタムフックでのコントローラー使用
- コンポーネントの純粋化

### Phase 5: 依存性注入とテスト (2-3日)
- DIコンテナの設定
- レイヤーごとの単体テスト
- 統合テストの実装

## 期待される効果

### アーキテクチャの改善
- **関心の分離**: 各層が明確な責任を持つ
- **テスト容易性**: 各層を独立してテスト可能
- **保守性**: 変更の影響範囲が限定的

### ビジネスロジックの保護
- **ドメイン駆動**: ビジネスルールがドメイン層に集約
- **不変性**: ドメインオブジェクトの整合性保証
- **再利用性**: ビジネスロジックの他UI框架での利用

### 開発効率の向上
- **予測可能**: 各層の役割が明確
- **並行開発**: 層ごとに独立した開発が可能
- **拡張性**: 新機能追加時の設計指針が明確

## リスク分析

### 高リスク
- 既存コードの大幅な構造変更
- 学習コストの増大

### 中リスク
- パフォーマンスへの影響
- 開発速度の一時的低下

### 対策
- 段階的移行による影響最小化
- チーム向けの研修実施
- 十分な移行期間の確保

### テストシナリオ
- 各層の単体テスト
- レイヤー間の統合テスト
- エンドツーエンドテスト