# VoyageSketch プロジェクト構造ドキュメント

## 概要

VoyageSketchは、依存性注入とクリーンアーキテクチャの原則に基づいて構築された旅行計画マップアプリケーションです。このドキュメントはプロジェクトの構造と各機能の責任範囲を明確にし、リファクタリングのガイドとして機能します。

## ドキュメント構成

### アーキテクチャ関連

- [01-architecture-overview.md](./01-architecture-overview.md) - アーキテクチャ全体像とDI設計
- [02-service-layer.md](./02-service-layer.md) - サービス層とビジネスロジック
- [03-state-management.md](./03-state-management.md) - Zustandストアと状態管理

### 機能別ドキュメント

- [04-map-feature.md](./04-map-feature.md) - 地図機能とGoogle Maps統合
- [05-place-management.md](./05-place-management.md) - 場所管理機能
- [06-plan-management.md](./06-plan-management.md) - プラン管理とクラウド同期
- [07-route-planning.md](./07-route-planning.md) - ルート計画と経路検索
- [08-ui-components.md](./08-ui-components.md) - UIコンポーネントと責任分離

### リファクタリング関連

- [09-refactoring-plan.md](./09-refactoring-plan.md) - リファクタリング計画と実装手順
- [10-code-issues.md](./10-code-issues.md) - 現在のコードの問題点と改善案

## プロジェクト基本情報

### 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **状態管理**: Zustand
- **地図**: Google Maps JavaScript API
- **データベース**: Firebase Firestore
- **認証**: Firebase Auth
- **スタイリング**: Tailwind CSS
- **PWA**: Workbox (vite-plugin-pwa)

### ディレクトリ構造

```
src/
├── adapters/        # 外部APIアダプター（Adapterパターン）
├── components/      # Reactコンポーネント
│   └── placeDetail/ # 場所詳細関連のサブコンポーネント
├── config/          # 環境設定
├── coordinators/    # ビジネスロジックの調整役
├── di/              # 依存性注入コンテナ
├── hooks/           # カスタムReactフック
├── interfaces/      # TypeScriptインターフェース定義
├── repositories/    # データ永続化層one
│   └── interfaces/  # リポジトリインターフェース
├── services/        # ビジネスロジックサービス
│   └── plan/        # プラン関連サービス
├── store/           # Zustand状態ストア
├── types/           # 共通型定義
└── utils/           # ユーティリティ関数
```

## 主要な設計パターン

### 1. 依存性注入（DI）

- `ServiceContainer`による中央集権的なサービス管理
- インターフェースベースの設計で疎結合を実現
- テスタビリティの向上

### 2. Adapterパターン

- 外部APIをアプリケーション固有のインターフェースでラップ
- 例: `GoogleMapsServiceAdapter`, `ZustandPlaceRepositoryAdapter`

### 3. Repository パターン

- データアクセスロジックの抽象化
- 例: `FirestorePlanRepository`, `LocalStoragePlanRepository`

### 4. 単一責任原則（SRP）

- 各コンポーネントとサービスは明確に定義された1つの責任を持つ
- UIコンポーネントはプレゼンテーションに専念

## 次のステップ

各ドキュメントを参照して、具体的な機能の実装詳細とリファクタリング計画を確認してください。
