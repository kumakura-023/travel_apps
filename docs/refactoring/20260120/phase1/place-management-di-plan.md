## Overview
PlaceManagementService を ServiceContainer に正式登録し、DI 経由で hooks / stores に差し込むためのフェーズ 1 設計を整理する。UI から直接 new/place-service 参照を排除し、依存解決を一元化する。

## Current Gaps
- PlaceManagementService を import 直結で生成しており DI ルールが崩れている
- ServiceContainer が place 系サービスのライフサイクルを追跡していない
- hooks (`usePlaces`, `useSavedPlaceEditor` など) と stores (`placeStore`, `savedPlacesStore`) が ServiceContainer を経由せずテストでモックしにくい

## Proposed Changes
### ServiceContainer registration
- ServiceContainer の `registerPlaceServices` (仮) で PlaceManagementService を singleton 化し、初期化時に API クライアント / FeatureFlags を注入
- 既存の lazy factory を移植して `container.resolve('PlaceManagementService')` で取得できるようにする
- DI マップ資料 (`docs/refactoring/phase0/di-inventory.md`) を更新し、place 系の依存経路を明示

### Helper getters
- `getPlaceManagementService(container?: ServiceContainer)` の薄いヘルパーを `src/services/di/getters/place.ts` に配置し、hooks/stores からはこのヘルパー経由で取得
- Storybook / unit test ではヘルパーに test container を渡せるよう引数をオプション化
- getter 内で `container ?? defaultContainer` を用い、プロダクションでは自動的にアプリ共通のコンテナにフォールバック

### Hook/store refactors
- `usePlaces`, `usePlaceSelection`, `useSavedPlaceEditor` など place 関連 hooks から直接 import を除き、ヘルパー呼び出しに置換
- Zustand/Recoil などの stores (`placeStore.ts`, `savedPlacesStore.ts`) でも同様にヘルパー経由で ServiceContainer からサービスを受け取る
- hooks/stores の初期化時に DI を噛ませる関係で、依存取得ロジックをカスタム初期化関数に分離してテストで差し替え可能にする

## Impact Analysis
- 依存性グラフが単純化し、place 機能のテストで ServiceContainer をモック差し替えできる
- PlaceManagementService のライフサイクルを Container が管理するため、インスタンス乱立によるキャッシュ不整合を防げる
- hooks/stores での DI 経路統一により、次フェーズのマルチ環境対応 (Web / Native) を容易にする

## Test Strategy
- DI 化後の hooks/stores unit test で `mockContainer.resolve` を使うシナリオを追加
- ServiceContainer 登録テスト: PlaceManagementService が singleton で返るか、依存が揃うかを検証
- Storybook での手動検証: place 編集 UI が従来通り動作するかを smoke check

## Rollout Plan
- ステップ 1: ServiceContainer と getter の追加。フラグや既存 import には触れず並走可能にする
- ステップ 2: hooks/stores を順次 DI 経由に置換し、各ステップで回帰テストを実施
- ステップ 3: 旧来の直接 import を linters で検出・禁止し、関連ドキュメントを更新
- ステップ 4: 影響機能 (Saved Places, Planner) の QA を完了後、フラグ無しで本番反映
