CLAUDE.md
このファイルは、このリポジトリでClaude Code (claude.ai/code) と作業する際のガイダンスを提供します。

基本設定
言語: 日本語で回答します
バージョン管理: version_rule.mdを参照して適切なバージョンでchangelogに修正内容を追記します
UI生成: design_rule.mdを参照してUIコンポーネントを作成します
開発パートナーシップ
私たちは一緒にプロダクションコードを構築します。実装の詳細は私が担当し、あなたはアーキテクチャのガイドと複雑性の早期発見を担当します。

コアワークフロー: リサーチ → 計画 → 実装 → 検証
すべての機能開発は以下で開始: 「コードベースを調査して、実装前に計画を作成してみるね。」

リサーチ - 既存のパターンとアーキテクチャを理解
計画 - アプローチを提案し、あなたと確認
実装 - テストとエラーハンドリングを含めて構築
検証 - 実装後は必ずフォーマッター、リンター、テストを実行
開発コマンド
コア開発:

npm run dev - 開発サーバー起動 (http://localhost:5173)
npm run build - プロダクションビルド
npm run preview - プロダクションビルドのプレビュー
npm run type-check - TypeScript型チェック実行
npm run lint - src/ディレクトリのESLint実行
テスト: 特定のテストフレームワークは設定されていません。npm run devで手動テストを実施。

アーキテクチャ概要
VoyageSketchは、依存性注入の原則とクリーンアーキテクチャで構築されたReactベースの旅行計画マップアプリケーションです。

主要なアーキテクチャパターン
依存性注入コンテナ:

src/services/ServiceContainer.tsによるコアサービス管理
インターフェースベースの設計とアダプターパターン
シングルトンまたはリクエスト単位でのサービス登録
主要サービス: MapService, PlaceService, PlaceRepository
アダプターパターン:

GoogleMapsServiceAdapter - Google Maps APIをMapServiceインターフェースでラップ
ZustandPlaceRepositoryAdapter - ZustandストアをPlaceRepositoryインターフェースでラップ
テストの容易性とAPIの切り替えを実現
状態管理:

src/store/ディレクトリ内のZustandストア
各ストアが特定のドメインを管理（places、routes、UIステートなど）
src/hooks/内のReactフックによるクリーンなコンポーネント統合
コアサービス & インターフェース
MapServiceインターフェース (src/interfaces/MapService.ts):

マップ操作の抽象化（パン、ズーム、イベント）
実装: GoogleMapsServiceAdapter
PlaceRepositoryインターフェース (src/interfaces/PlaceRepository.ts):

場所データの永続化管理
実装: ZustandPlaceRepositoryAdapter
サービス登録:

デフォルトサービスはServiceContainerで自動登録
MapServiceはGoogle Maps読み込み後に動的登録
テスト用のモックサービスも利用可能（registerMockServices()）
技術スタック
フロントエンド: React 18 + TypeScript + Vite
マッピング: Google Maps JavaScript API
状態管理: Zustand stores
スタイリング: Tailwind CSS
PWA: vite-plugin-pwa経由のWorkbox
環境設定
必要な環境変数:

VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
Google Cloud APIの必要項目:

Maps JavaScript API
Places API
Directions API
コード構成
src/
├── components/     # React UIコンポーネント
├── hooks/         # カスタムReactフック
├── store/         # Zustand状態ストア
├── services/      # ビジネスロジック & DIコンテナ
├── interfaces/    # TypeScriptインターフェース
├── adapters/      # 外部APIアダプター
├── types/         # 型定義
└── utils/         # ユーティリティ関数
開発原則
コード整理
関数は小さく、フォーカスされた状態を保つ:

セクションを説明するコメントが必要なら、関数に分割
関連する機能を明確なパッケージにグループ化
少数の大きなファイルより多数の小さなファイルを優先
アーキテクチャ原則
これは常にフィーチャーブランチ:

古いコードは完全に削除 - 非推奨化は不要
バージョン付き名前は使わない（processV2、handleNew、ClientOldなど）
明示的に要求されない限り、マイグレーションコードは書かない
「削除されたコード」のコメントは残さない - ただ削除する
暗黙より明示を優先:

賢い抽象化より明確な関数名
隠された魔法より明白なデータフロー
サービスロケーターより直接的な依存関係
効率の最大化
並列操作: 単一メッセージで複数の検索、読み取り、grepを実行 複数エージェント: 複雑なタスクを分割 - テスト用とオ実装用 類似作業のバッチ処理: 関連するファイル編集をグループ化

Go開発標準（該当する場合）
必須パターン

具体的な型 - interface{}やanyではなく - インターフェースはバグを隠す
チャネル - time.Sleep()ではなく同期に使用 - スリープは信頼できない
早期リターン - ネストを減らす - フラットなコードは読みやすい
古いコードを削除 - 置き換え時 - バージョン付き関数は作らない
fmt.Errorf("context: %w", err) - エラーチェーンを保持
テーブルテスト - 複雑なロジック用 - ケースの追加が簡単
Godoc - すべてのエクスポートされたシンボル - ドキュメントは誤用を防ぐ
問題解決
行き詰まったとき: 停止。シンプルな解決策が通常は正しい。 不確かなとき: 「このアーキテクチャについて深く考えてみるね。」 選択時: 「アプローチA（シンプル）とB（柔軟）があるけど、どちらがいい？」

実装について不確かな場合は、停止してガイダンスを求めます。

テスト戦略
コードの複雑さに応じたテストアプローチ:

複雑なビジネスロジック: テストファースト（TDD）で記述
シンプルなCRUD操作: コードファースト、その後テスト
ホットパス: 実装後にベンチマークを追加
常にセキュリティを念頭に置く: すべての入力を検証、ランダム性にはcrypto/randを使用、準備されたSQL文を使用。

パフォーマンスルール: 最適化前に測定。推測はしない。

進捗追跡
TodoWrite - タスク管理用
明確な命名 - すべてのコードで
賢い抽象化より保守可能な解決策にフォーカスします。

開発原則（document/rule/code_rule.mdより）
単一責任: 1つのクラス、1つの責任
インターフェース依存: 実装ではなく抽象に依存
疎結合: 適切な抽象化を通じて変更の影響を最小化
バンドル設定
Viteはバンドルを以下に分割:

vendor - Reactコアライブラリ
maps - Google Maps関連パッケージ
utils - Zustand、UUIDユーティリティ
