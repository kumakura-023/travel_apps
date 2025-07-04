# Git コミットメッセージ規約

## 🎯 目的
- **バージョン (ver) と変更概要を明確にする**ことで、履歴を一目で把握できるようにする
- AI エージェントがコミット履歴を自動解析しやすい構造を提供する
- 他のルール (version_rule.md, code_rule.md など) と整合性を取る

---

## 📝 コミットメッセージ基本フォーマット
```
[v<MAJOR>.<MINOR>.<PATCH>] <type>(<scope>): <subject>

<body>

<footer>
```
| 要素 | 説明 | 必須 |
|------|------|------|
| `v<MAJOR>.<MINOR>.<PATCH>` | セマンティックバージョン。必ず角括弧 `[]` で囲む。 | ✔ |
| `type` | 変更の種類。下表参照。 | ✔ |
| `scope` | 影響範囲 (モジュール/機能名)。小文字ケバブケース。 | ✖ (無い場合は省略可) |
| `subject` | 50 文字以内で変更概要を簡潔に記述。末尾にピリオドは付けない。 | ✔ |
| `body` | 箇条書きで詳細説明。72 文字毎に改行。 | ✖ |
| `footer` | 関連 Issue, JIRA, PR などを `Closes #123` 形式で記載。 | ✖ |

### `type` 一覧
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: フォーマット (コードの動作変更なし)
- `refactor`: リファクタリング (機能追加・バグ修正なし)
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: ビルド、依存、CI など運用面の変更
- `revert`: 変更の取り消し

---

## 🔄 バージョン番号の決定ルール
1. **PATCH** (`vX.Y.Z+1`)
   - バグ修正・軽微な改善・ドキュメント修正
2. **MINOR** (`vX.Y+1.0`)
   - 後方互換性を保った新機能追加・機能拡張
3. **MAJOR** (`vX+1.0.0`)
   - 破壊的変更 (API 変更・既存機能削除 等)

> バージョン判定は `version_rule.md` のフローチャートに従うこと。

---

## 📚 例
### 1. 新機能追加 (MINOR)
```
[v1.2.0] feat(route-search): 高速経路検索ロジックを追加

- Dijkstra アルゴリズムを directionsService に導入
- 計算結果のキャッシュ機構を実装

Closes #202
```

### 2. バグ修正 (PATCH)
```
[v1.2.1] fix(place-list): 無限スクロール時の重複表示を修正

- useInfiniteScroll フックの初期化ロジックを修正
```

### 3. 破壊的変更 (MAJOR)
```
[v2.0.0] feat(api): GraphQL エンドポイントに全面移行

BREAKING CHANGE: REST API エンドポイントを削除
```

---

## 🚦 コミット作成フロー
1. 変更内容を確認し、**バージョン種別 (PATCH / MINOR / MAJOR)** を決定
2. `package.json` の `version` を更新 (必要な場合)
3. 変更ファイルをステージング
   ```bash
   git add .
   ```
4. 下記テンプレートを呼び出し (Alias 推奨)
   ```bash
   git commit
   ```
5. プッシュ
   ```bash
   git push origin <current-branch>
   ```

---

## 🛠️ テンプレート (commit-msg)
```txt
[v<バージョン>] <type>(<scope>): <subject>

<body>

<footer>
```
エディタでコミットを作成する際に自動で挿入されるよう、 `.git/hooks/commit-msg` や Git クライアントのテンプレート機能を設定する。

---

## 🤖 AI エージェント利用ポイント
- **バージョンタグ** で変更履歴を機械的に並べ替えやすい
- **type / scope** で変更カテゴリと対象領域を特定可能
- **subject** を要約として利用し、プルリクエストタイトルの自動生成に活用可能

---

**最終更新**: 2024-XX-XX 