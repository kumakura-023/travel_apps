# 旅行計画アプリ バージョン管理ルール

## 📋 概要

このドキュメントは、旅行計画アプリのバージョン管理に関するルールを定義しています。
AI開発チームでの並行開発を考慮し、コンフリクトを最小限に抑え、安定したリリースプロセスを実現することを目的としています。

## 📌 バージョン体系

### セマンティックバージョニング（Semantic Versioning）の採用

```
MAJOR.MINOR.PATCH
```

- **MAJOR（メジャー）**: 破壊的変更（Backward Compatibility を壊す変更）
- **MINOR（マイナー）**: 新機能追加（Backward Compatible）
- **PATCH（パッチ）**: バグフィックス（Backward Compatible）

### 現在のバージョン基準

```json
{
  "version": "1.0.0"
}
```

**初回リリース（v1.0.0）を基準とし、以降は以下のルールに従う**

## 🔄 バージョンアップルール

### 📊 変更規模とバージョン番号の対応

```
X.Y.Z (MAJOR.MINOR.PATCH)
│ │ └── 3桁目：基本機能が変わらない修正
│ └──── 2桁目：機能自体に影響がある変更（3桁目は0にリセット）
└────── 1桁目：破壊的変更（2,3桁目は0にリセット）
```

### PATCH バージョンアップ（3桁目変更: 1.0.0 → 1.0.1 → 1.0.2）

**🎯 変更の性質**: 基本的な機能が変わらない修正
**📏 変更範囲**: 既存の動作を維持したまま品質向上

**対象となる変更:**

- バグ修正（機能仕様は変更しない）
- セキュリティパッチ
- パフォーマンス最適化（機能に影響なし）
- タイポ・文言修正
- 軽微なUI調整（レイアウト・色・サイズ等）
- 内部コードのリファクタリング（外部影響なし）
- ログ出力の改善
- エラーハンドリングの改善

**例:**

```typescript
// v1.0.0 - バグ有り
const calculateDistance = (point1: LatLng, point2: LatLng): number => {
  return Math.sqrt(point1.lat + point2.lat); // 間違った計算
};

// v1.0.1 - バグ修正（機能仕様は同じ）
const calculateDistance = (point1: LatLng, point2: LatLng): number => {
  const R = 6371; // 地球の半径
  // 正しいヒュベニの公式実装
  return calculateHaversineDistance(point1, point2);
};

// v1.0.2 - パフォーマンス改善（機能仕様は同じ）
const calculateDistance = (point1: LatLng, point2: LatLng): number => {
  // キャッシュ機能追加でパフォーマンス向上
  return memoizedHaversineDistance(point1, point2);
};
```

### MINOR バージョンアップ（2桁目変更: 1.0.5 → 1.1.0 → 1.2.0）

**🎯 変更の性質**: 機能自体に影響がある変更
**📏 変更範囲**: 新機能追加・既存機能拡張（後方互換性維持）
**🔄 リセットルール**: 3桁目を0にリセット

**対象となる変更:**

- 新機能の追加
- 既存機能の拡張（新しいオプション・パラメータ追加）
- 新しいコンポーネント・画面の追加
- 新しいAPIエンドポイントの追加
- 既存UIの大幅な改善・再設計
- 新しい設定オプションの追加
- データベースの非破壊的なスキーマ追加

**例:**

```typescript
// v1.0.5 から v1.1.0 への変更
// v1.0.x
interface PlaceService {
  searchNearby(location: LatLng): Promise<Place[]>;
}

// v1.1.0 - 新機能追加（3桁目リセット）
interface PlaceService {
  searchNearby(location: LatLng): Promise<Place[]>;
  searchByRadius(location: LatLng, radius: number): Promise<Place[]>; // 新機能
  searchByCategory(category: string): Promise<Place[]>; // 新機能
}

// v1.2.0 - さらなる機能拡張
interface PlaceService {
  searchNearby(location: LatLng): Promise<Place[]>;
  searchByRadius(location: LatLng, radius: number): Promise<Place[]>;
  searchByCategory(category: string): Promise<Place[]>;
  // 既存機能の拡張（オプションパラメータ追加）
  searchNearby(location: LatLng, options?: SearchOptions): Promise<Place[]>;
}
```

### MAJOR バージョンアップ（1桁目変更: 1.5.3 → 2.0.0 → 3.0.0）

**🎯 変更の性質**: 破壊的変更
**📏 変更範囲**: 既存コードの動作を壊す可能性がある変更
**🔄 リセットルール**: 2,3桁目を0にリセット

**対象となる変更:**

- APIインターフェースの破壊的変更
- 既存機能の削除・廃止
- 関数・メソッドのシグネチャ変更
- データベーススキーマの重大な変更
- 設計思想・アーキテクチャの大幅な変更
- 既存データフォーマットの非互換変更
- 依存関係の大幅な変更（React 17→18等）

**例:**

```typescript
// v1.5.3 から v2.0.0 への変更
// v1.x.x
interface PlaceRepository {
  findByCategory(category: string): Place[];
  savePlace(place: Place): void;
}

// v2.0.0 - 破壊的変更（2,3桁目リセット）
interface PlaceRepository {
  // 戻り値をPromiseに変更（破壊的変更）
  findByCategory(
    category: CategoryEnum,
    filters: FilterOptions,
  ): Promise<Place[]>;
  // 戻り値追加（破壊的変更）
  savePlace(place: Place): Promise<string>; // IDを返すように変更
  // 削除された機能
  // findAll(): Place[] <- この機能は削除
}
```

## 🔄 バージョン変更のフローチャート

```
変更内容を確認
│
├─ 既存コードが動かなくなる？
│  └─ YES → MAJOR (1桁目+1, 2,3桁目=0)
│
├─ 新機能・機能拡張・UI大幅変更？
│  └─ YES → MINOR (2桁目+1, 3桁目=0)
│
└─ バグ修正・軽微な改善のみ？
   └─ YES → PATCH (3桁目+1)
```

## 📋 バージョンアップ判定チェックリスト

### ✅ PATCH判定チェック

- [ ] 既存の機能仕様に変更はない
- [ ] 新しい機能は追加していない
- [ ] UIの大幅な変更はない
- [ ] APIの変更はない
- [ ] データ形式の変更はない

### ✅ MINOR判定チェック

- [ ] 新機能を追加した
- [ ] 既存機能を拡張した（後方互換性維持）
- [ ] 新しいUIコンポーネントを追加した
- [ ] 新しい設定オプションを追加した
- [ ] 既存コードの動作に影響はない

### ✅ MAJOR判定チェック

- [ ] 既存のAPIを変更・削除した
- [ ] 既存のデータ形式を変更した
- [ ] 既存コードの修正が必要になる
- [ ] 依存関係を大幅に変更した
- [ ] アーキテクチャを大幅に変更した

## 🌲 ブランチ戦略

### メインブランチ

```
master (main) - 本番リリース用安定ブランチ
└── develop - 開発統合ブランチ
    ├── feature/JIRA-123-place-search - 機能開発ブランチ
    ├── feature/JIRA-124-route-optimization - 機能開発ブランチ
    └── hotfix/JIRA-125-critical-bug-fix - 緊急修正ブランチ
```

### ブランチ命名規則

```bash
# 機能開発
feature/[issue-number]-[brief-description]
例: feature/JIRA-123-place-search-enhancement

# バグ修正
bugfix/[issue-number]-[brief-description]
例: bugfix/JIRA-124-route-calculation-fix

# 緊急修正（本番環境の重大なバグ）
hotfix/[issue-number]-[brief-description]
例: hotfix/JIRA-125-security-vulnerability

# リリース準備
release/v[version-number]
例: release/v1.2.0
```

## 🏷️ タグ付けルール

### リリースタグ

```bash
# セマンティックバージョニングに従ったタグ
v1.0.0    # メジャーリリース
v1.1.0    # マイナーリリース
v1.1.1    # パッチリリース

# プレリリースタグ
v1.2.0-alpha.1    # アルファ版
v1.2.0-beta.1     # ベータ版
v1.2.0-rc.1       # リリース候補
```

### タグ作成コマンド

```bash
# アノテーションタグの作成
git tag -a v1.0.0 -m "Release version 1.0.0"

# タグをリモートにプッシュ
git push origin v1.0.0
```

## 📝 チェンジログ管理

### CHANGELOG.md の構造

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 新機能

### Changed

- 既存機能の変更

### Deprecated

- 非推奨になった機能

### Removed

- 削除された機能

### Fixed

- バグ修正

### Security

- セキュリティ関連の修正

## [1.1.0] - 2024-XX-XX

### Added

- 地点間ルート検索機能の追加
- 移動時間表示機能の実装

### Fixed

- マップ表示のパフォーマンス改善

## [1.0.0] - 2024-XX-XX

### Added

- 初回リリース
- 基本的な地点登録・検索機能
- Google Maps統合
```

## 🚀 リリースプロセス

### 1. 機能開発フロー

```bash
# 1. developブランチから機能ブランチ作成
git checkout develop
git pull origin develop
git checkout -b feature/JIRA-123-new-feature

# 2. 開発・テスト・コミット
git add .
git commit -m "feat: add new place search functionality

- Implement SearchService interface
- Add search result caching
- Update PlaceRepository with new search methods

Closes JIRA-123"

# 3. developへマージ
git checkout develop
git merge feature/JIRA-123-new-feature
```

### 2. リリース準備フロー

```bash
# 1. リリースブランチ作成
git checkout develop
git checkout -b release/v1.1.0

# 2. バージョン更新
# package.jsonのversionを更新
# CHANGELOG.mdを更新

# 3. 最終テスト後、masterにマージ
git checkout master
git merge release/v1.1.0

# 4. タグ作成
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin master --tags

# 5. developに反映
git checkout develop
git merge master
```

### 3. 緊急修正フロー

```bash
# 1. masterから緊急修正ブランチ作成
git checkout master
git checkout -b hotfix/JIRA-125-critical-fix

# 2. 修正・テスト
# 3. masterとdevelopの両方にマージ
git checkout master
git merge hotfix/JIRA-125-critical-fix

git checkout develop
git merge hotfix/JIRA-125-critical-fix

# 4. パッチバージョンでタグ作成
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin master --tags
```

## 🔒 AI開発チーム向け特別ルール

### 並行開発でのコンフリクト回避

1. **インターフェース優先開発**

   ```typescript
   // 先にインターフェースを定義し、複数AIが並行実装
   interface RouteService {
     calculateRoute(start: Place, end: Place): Promise<Route>;
     optimizeRoute(places: Place[]): Promise<Route>;
   }
   ```

2. **コンポーネント分離**
   ```typescript
   // 単一責任原則に従い、1つのAIが1つのコンポーネントを担当
   // RouteSearchPanel.tsx - AI_A担当
   // RouteDisplay.tsx - AI_B担当
   ```

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・補助ツール変更

**例:**

```
feat(search): add advanced place filtering

- Implement category-based filtering
- Add distance radius option
- Update SearchService interface

Closes JIRA-123
```

## 📊 バージョン履歴管理

### package.json 更新ルール

```json
{
  "name": "travel-planner-map",
  "version": "1.0.0",
  "private": true
  // ... 他の設定
}
```

**更新タイミング:**

- リリースブランチ作成時
- 手動更新（npm version コマンド使用推奨）

```bash
# パッケージバージョン更新コマンド
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

## 🛡️ 品質保証

### リリース前チェックリスト

- [ ] 全テストの通過
- [ ] TypeScript型チェックエラーなし
- [ ] ESLint警告なし
- [ ] パフォーマンステスト実行
- [ ] CHANGELOG.md更新
- [ ] バージョン番号更新
- [ ] ドキュメント更新

### 自動化推奨

```yaml
# GitHub Actions例（将来実装時の参考）
name: Release
on:
  push:
    tags:
      - "v*"
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Test
        run: |
          npm install
          npm run build
          npm test
```

## 📅 リリーススケジュール

### 定期リリースサイクル

- **マイナーリリース**: 2週間〜1ヶ月間隔
- **パッチリリース**: 必要に応じて随時
- **メジャーリリース**: 四半期〜半年間隔

### 緊急リリース

- **セキュリティ修正**: 24時間以内
- **重大なバグ**: 48時間以内
- **軽微なバグ**: 次回定期リリース

---

**このドキュメントは定期的に見直し、プロジェクトの成長に合わせて更新されます。**
