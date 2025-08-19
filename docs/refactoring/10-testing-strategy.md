# テスト戦略の策定

## 現状の問題点

### テストの不在

現在のプロジェクトには体系的なテストが存在しない状況：

```typescript
// package.json - テストフレームワークが設定されていない
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --report-unused-disable-directives --max-warnings 0"
    // "test": "???" <- テストスクリプトなし
  }
}

// CLAUDE.md より
// テスト: 特定のテストフレームワークは設定されていません。npm run devで手動テストを実施。
```

### 手動テストの限界

- **回帰テストの困難性**: 機能変更時の影響確認が手動
- **品質の不安定性**: 開発者によるテスト内容の差
- **リファクタリングリスク**: 安全にコードを変更できない
- **デバッグコストの増大**: 問題発見が遅れる

### リファクタリングでのテスト必要性

今回の大規模リファクタリングでは、以下のテストが必須：

1. **既存機能の動作保証**: リファクタリング前後で同じ動作
2. **新設計の検証**: 分離されたコンポーネントの正常動作
3. **統合テスト**: レイヤー間の正しい連携
4. **パフォーマンステスト**: 性能劣化の検知

## 目標とする設計

### テストピラミッド戦略

```
        ┌─────────────────┐
        │  E2E Tests      │ ← 少数（重要フロー）
        │  (Playwright)   │
        ├─────────────────┤
        │ Integration     │ ← 中程度（API連携）
        │ Tests (Vitest)  │
        ├─────────────────┤
        │ Unit Tests      │ ← 多数（ビジネスロジック）
        │ (Vitest + RTL)  │
        └─────────────────┘
```

#### テスト戦略

1. **Unit Tests (70%)**: ビジネスロジック、ドメインモデル
2. **Integration Tests (20%)**: サービス間連携、API通信
3. **E2E Tests (10%)**: 重要なユーザーフロー

#### カバレッジ目標

- **ドメイン層**: 95%以上（ビジネスロジック）
- **アプリケーション層**: 90%以上（ユースケース）
- **プレゼンテーション層**: 80%以上（UI動作）
- **インフラストラクチャ層**: 70%以上（データアクセス）

## 実装手順

### Step 1: テスト環境の構築

```json
// package.json - テスト関連の依存関係追加
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "playwright": "^1.40.0",
    "msw": "^2.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

```typescript
// vite.config.ts - テスト設定
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/**/*.d.ts",
        "src/**/*.stories.tsx",
      ],
    },
  },
});
```

### Step 2: テストユーティリティの作成

```typescript
// src/test/utils/testUtils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// モックプロバイダー
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

```typescript
// src/test/mocks/handlers.ts - MSWハンドラー
import { http, HttpResponse } from "msw";

export const handlers = [
  // プラン取得API
  http.get("/api/plans/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "テストプラン",
      places: [],
      labels: [],
    });
  }),

  // プラン作成API
  http.post("/api/plans", async ({ request }) => {
    const plan = await request.json();
    return HttpResponse.json({
      ...plan,
      id: "generated-id",
      createdAt: new Date().toISOString(),
    });
  }),
];
```

### Step 3: ドメイン層のテスト

```typescript
// src/domain/entities/__tests__/Plan.test.ts
import { describe, it, expect } from "vitest";
import { Plan, PlanName, DomainError } from "../Plan";
import { Place } from "../Place";

describe("Plan Entity", () => {
  describe("create", () => {
    it("should create a plan with valid name", () => {
      const plan = Plan.create("テストプラン");

      expect(plan.name.value).toBe("テストプラン");
      expect(plan.places).toHaveLength(0);
      expect(plan.labels).toHaveLength(0);
    });

    it("should throw error for empty name", () => {
      expect(() => Plan.create("")).toThrow(DomainError);
      expect(() => Plan.create("   ")).toThrow(DomainError);
    });

    it("should throw error for too long name", () => {
      const longName = "a".repeat(101);
      expect(() => Plan.create(longName)).toThrow(DomainError);
    });
  });

  describe("addPlace", () => {
    it("should add place to plan", () => {
      const plan = Plan.create("テストプラン");
      const place = new Place(/* ... */);

      const updatedPlan = plan.addPlace(place);

      expect(updatedPlan.places).toHaveLength(1);
      expect(updatedPlan.places[0]).toBe(place);
      expect(updatedPlan.updatedAt).not.toBe(plan.updatedAt);
    });

    it("should throw error when adding duplicate place", () => {
      const plan = Plan.create("テストプラン");
      const place = new Place(/* ... */);

      const planWithPlace = plan.addPlace(place);

      expect(() => planWithPlace.addPlace(place)).toThrow(DomainError);
    });

    it("should throw error when exceeding place limit", () => {
      let plan = Plan.create("テストプラン");

      // 100箇所追加
      for (let i = 0; i < 100; i++) {
        const place = new Place(/* unique place */);
        plan = plan.addPlace(place);
      }

      const additionalPlace = new Place(/* ... */);
      expect(() => plan.addPlace(additionalPlace)).toThrow(DomainError);
    });
  });

  describe("getTotalCost", () => {
    it("should calculate total cost correctly", () => {
      let plan = Plan.create("テストプラン");

      const place1 = new Place(/* cost: 1000 */);
      const place2 = new Place(/* cost: 2000 */);

      plan = plan.addPlace(place1).addPlace(place2);

      expect(plan.getTotalCost()).toBe(3000);
    });

    it("should return 0 for plan with no places", () => {
      const plan = Plan.create("テストプラン");
      expect(plan.getTotalCost()).toBe(0);
    });
  });
});
```

### Step 4: アプリケーション層のテスト

```typescript
// src/application/usecases/__tests__/CreatePlanUseCase.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreatePlanUseCase } from "../CreatePlanUseCase";
import { CreatePlanCommand } from "../CreatePlanCommand";
import { PlanRepository } from "../../domain/repositories/PlanRepository";
import { UserRepository } from "../../domain/repositories/UserRepository";
import { EventPublisher } from "../../domain/events/EventPublisher";

describe("CreatePlanUseCase", () => {
  let useCase: CreatePlanUseCase;
  let mockPlanRepository: PlanRepository;
  let mockUserRepository: UserRepository;
  let mockEventPublisher: EventPublisher;

  beforeEach(() => {
    mockPlanRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
      save: vi.fn(),
    };

    mockEventPublisher = {
      publish: vi.fn(),
    };

    useCase = new CreatePlanUseCase(
      mockPlanRepository,
      mockUserRepository,
      mockEventPublisher,
    );
  });

  it("should create plan successfully", async () => {
    // Arrange
    const userId = "user-123";
    const user = { id: userId, name: "Test User" };
    const existingPlans = [];

    vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
    vi.mocked(mockPlanRepository.findByUserId).mockResolvedValue(existingPlans);
    vi.mocked(mockPlanRepository.save).mockResolvedValue();
    vi.mocked(mockEventPublisher.publish).mockResolvedValue();

    const command = new CreatePlanCommand(userId, "新しいプラン");

    // Act
    const result = await useCase.execute(command);

    // Assert
    expect(result.planName).toBe("新しいプラン");
    expect(mockPlanRepository.save).toHaveBeenCalledOnce();
    expect(mockEventPublisher.publish).toHaveBeenCalledOnce();
  });

  it("should throw error when user not found", async () => {
    // Arrange
    vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

    const command = new CreatePlanCommand("invalid-user", "テストプラン");

    // Act & Assert
    await expect(useCase.execute(command)).rejects.toThrow(
      "ユーザーが見つかりません",
    );
  });

  it("should throw error when plan limit exceeded", async () => {
    // Arrange
    const userId = "user-123";
    const user = { id: userId, name: "Test User" };
    const existingPlans = new Array(50); // 既に50個のプラン

    vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
    vi.mocked(mockPlanRepository.findByUserId).mockResolvedValue(existingPlans);

    const command = new CreatePlanCommand(userId, "テストプラン");

    // Act & Assert
    await expect(useCase.execute(command)).rejects.toThrow(
      "プランは最大50個まで作成できます",
    );
  });
});
```

### Step 5: プレゼンテーション層のテスト

```typescript
// src/components/__tests__/PlanManager.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils/testUtils'
import PlanManager from '../PlanManager'
import { usePlanData } from '../../hooks/usePlanData'

// カスタムフックのモック
vi.mock('../../hooks/usePlanData')

describe('PlanManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display plan information', () => {
    // Arrange
    const mockPlanData = {
      plan: {
        id: '1',
        name: 'テストプラン',
        placeCount: 5,
        labelCount: 3,
        totalCost: 15000
      },
      isLoading: false,
      createPlan: vi.fn(),
      updatePlanName: vi.fn(),
      deletePlan: vi.fn(),
      duplicatePlan: vi.fn()
    }

    vi.mocked(usePlanData).mockReturnValue(mockPlanData)

    // Act
    render(<PlanManager />)

    // Assert
    expect(screen.getByText('テストプラン')).toBeInTheDocument()
    expect(screen.getByText('場所数: 5')).toBeInTheDocument()
    expect(screen.getByText('ラベル数: 3')).toBeInTheDocument()
    expect(screen.getByText('総費用: ¥15,000')).toBeInTheDocument()
  })

  it('should handle plan creation', async () => {
    // Arrange
    const mockCreatePlan = vi.fn().mockResolvedValue()
    const mockPlanData = {
      plan: null,
      isLoading: false,
      createPlan: mockCreatePlan,
      updatePlanName: vi.fn(),
      deletePlan: vi.fn(),
      duplicatePlan: vi.fn()
    }

    vi.mocked(usePlanData).mockReturnValue(mockPlanData)

    // Act
    render(<PlanManager />)
    const createButton = screen.getByText('新規プランを作成')
    fireEvent.click(createButton)

    // Assert
    await waitFor(() => {
      expect(mockCreatePlan).toHaveBeenCalledWith('新しいプラン')
    })
  })

  it('should display loading state', () => {
    // Arrange
    const mockPlanData = {
      plan: null,
      isLoading: true,
      createPlan: vi.fn(),
      updatePlanName: vi.fn(),
      deletePlan: vi.fn(),
      duplicatePlan: vi.fn()
    }

    vi.mocked(usePlanData).mockReturnValue(mockPlanData)

    // Act
    render(<PlanManager />)

    // Assert
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should display error message', () => {
    // Arrange
    const mockPlanData = {
      plan: null,
      isLoading: false,
      error: 'プランの読み込みに失敗しました',
      createPlan: vi.fn(),
      updatePlanName: vi.fn(),
      deletePlan: vi.fn(),
      duplicatePlan: vi.fn()
    }

    vi.mocked(usePlanData).mockReturnValue(mockPlanData)

    // Act
    render(<PlanManager />)

    // Assert
    expect(screen.getByText('プランの読み込みに失敗しました')).toBeInTheDocument()
  })
})
```

### Step 6: 統合テスト

```typescript
// src/test/integration/planFlow.test.ts
import { describe, it, expect } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "../mocks/handlers";

const server = setupServer(...handlers);

describe("Plan Integration Tests", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should complete plan creation flow", async () => {
    // テスト用のユーザーでログイン
    const user = await loginTestUser();

    // プラン作成
    const planService = container.get<UnifiedPlanService>("PlanService");
    const result = await planService.createPlan(user.uid, "テストプラン");

    expect(result.success).toBe(true);
    expect(result.plan?.name).toBe("テストプラン");

    // プランにplace追加
    const place = createTestPlace();
    await planService.addPlace(result.plan!.id, place);

    // プランを取得して確認
    const retrievedPlan = await planService.getPlan(result.plan!.id, user.uid);
    expect(retrievedPlan?.places).toHaveLength(1);
  });
});
```

### Step 7: E2Eテスト

```typescript
// tests/e2e/planManagement.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Plan Management", () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto("/login");
    await page.fill("[data-testid=email]", "test@example.com");
    await page.fill("[data-testid=password]", "password");
    await page.click("[data-testid=login-button]");
    await page.waitForURL("/dashboard");
  });

  test("should create new plan", async ({ page }) => {
    // プラン作成ボタンをクリック
    await page.click("[data-testid=create-plan-button]");

    // プラン名を入力
    await page.fill("[data-testid=plan-name-input]", "E2Eテストプラン");
    await page.click("[data-testid=create-button]");

    // 作成されたプランが表示されることを確認
    await expect(page.locator("[data-testid=plan-name]")).toHaveText(
      "E2Eテストプラン",
    );
  });

  test("should add place to plan", async ({ page }) => {
    // マップ上の地点をクリック
    await page.click("[data-testid=map-container]", {
      position: { x: 400, y: 300 },
    });

    // Place追加フォームが表示される
    await expect(page.locator("[data-testid=add-place-form]")).toBeVisible();

    // Place情報を入力
    await page.fill("[data-testid=place-name-input]", "テスト場所");
    await page.selectOption(
      "[data-testid=place-category-select]",
      "restaurant",
    );
    await page.click("[data-testid=save-place-button]");

    // Placeが地図上に表示されることを確認
    await expect(page.locator("[data-testid=place-marker]")).toBeVisible();
  });
});
```

## 移行計画

### Phase 1: テスト環境構築 (1-2日)

- Vitest, React Testing Library, Playwright の設定
- テストユーティリティとモックの作成
- CI/CDパイプラインへの統合

### Phase 2: ドメイン層テスト (2-3日)

- エンティティとバリューオブジェクトのテスト
- ビジネスルールの検証
- ドメインサービスのテスト

### Phase 3: アプリケーション層テスト (2-3日)

- ユースケースのテスト
- サービス間連携のテスト
- エラーハンドリングのテスト

### Phase 4: プレゼンテーション層テスト (3-4日)

- コンポーネントの動作テスト
- カスタムフックのテスト
- ユーザーインタラクションのテスト

### Phase 5: 統合・E2Eテスト (2-3日)

- API統合テストの実装
- 重要フローのE2Eテスト
- パフォーマンステスト

## 期待される効果

### 品質の向上

- **回帰防止**: 既存機能の動作保証
- **バグ早期発見**: 開発段階での問題検知
- **仕様の明確化**: テストコードによる動作仕様

### 開発効率の向上

- **安全なリファクタリング**: テストによる動作保証
- **デバッグ時間短縮**: 問題箇所の特定が容易
- **チーム開発**: 他開発者の変更に対する安心感

### メンテナンス性の向上

- **ドキュメントとしての役割**: テストコードが仕様書になる
- **変更容易性**: テストがあることで変更に対する恐怖が軽減
- **レビュー効率化**: テストによる動作確認

## リスク分析

### 中リスク

- テスト作成による開発時間の増加
- テストメンテナンスのコスト

### 低リスク

- 学習コストの発生
- ツール設定の複雑性

### 対策

- 段階的なテスト導入
- チーム向けのテスト研修
- テストカバレッジの段階的向上

### 成功指標

- カバレッジ目標達成 (ドメイン層95%以上)
- CI/CDでのテスト自動実行
- リファクタリング中のバグ検出数
