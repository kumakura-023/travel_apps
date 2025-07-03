# 共同編集機能 実装ステージ別 Vibe Coding プロンプト集

このドキュメントは、AI とのペアプログラミング（Vibe Coding）で共同編集機能を段階的に実装するための「プロンプトひな形」を提供します。  
各ステージごとに **目的・タスク** を明示し、そのフェーズを開始するときに流用できるプロンプトを示します。  
すべて日本語で記述していますが、必要に応じて翻訳・修正して使用してください。

---

## 共通前提プロンプト（冒頭に貼付）
```text
あなたは React + TypeScript + Zustand + Supabase + Yjs を用いた
旅行プランニング Web アプリの開発を支援するエキスパートです。
単一責任原則を守ったインターフェース駆動設計を徹底し、
パフォーマンスと DX を最大化してください。
以降の指示では **共同編集機能 (Collaboration)** モジュールを実装します。
```

---

## M1: Supabase 環境構築 & 認証

### 目的
Supabase プロジェクトをセットアップし、メールリンクと Google OAuth 認証を実装する。

### タスク
1. Supabase プロジェクト作成 & `.env` 設定。
2. `SupabaseClient` ラッパーと `AuthService` インターフェースを実装。
3. ログイン / ログアウト UI を既存コンポーネントに追加。

### プロンプト
```text
まず Supabase を導入し、メールリンク + Google OAuth 認証を実装したい。
1) `.env` に SUPABASE_URL, SUPABASE_ANON_KEY を追加
2) `services/AuthService.ts` インターフェースを定義
3) `SupabaseAuthAdapter` を実装
4) App.tsx にログイン判定フックを組み込み、未認証時は FullScreen ログインダイアログを表示
単一責任原則を守りつつ、ファイル構成案とコードスニペットを提案してください。
```

---

## M2: Yjs + Supabase Realtime PoC

### 目的
旅行プラン（plan）ドキュメントを Yjs で CRDT 化し、Supabase Realtime 経由で同期させる。

### タスク
1. `CollaborationService` インターフェース定義。  
2. `SupabaseCollaborationAdapter` で Yjs 更新を broadcast。  
3. 2 クライアント間でタイトルテキストのリアルタイム同期を実証。

### プロンプト
```text
Yjs と Supabase Realtime を使って簡易 PoC を作りたい。
手順:
- `CollaborationService` インターフェースを定義
- `SupabaseCollaborationAdapter` で Y.Doc 更新を publish
- 既存 `PlanNameEditModal` でタイトル同期を試験
依存ライブラリ、コード例、イベントフロー図を提示してください。
```

---

## M3: 招待・権限管理 UI

### 目的
オーナーがメール/URL/LINE 経由でユーザーを招待し、役割を変更できる UI を実装。

### タスク
1. `InvitationsService` と Supabase `plan_collaborators` テーブル CRUD。  
2. 招待 URL 生成 (JWT 署名, 24h 有効)。  
3. UI コンポーネント：`InviteDialog`, `CollaboratorList`.

### プロンプト
```text
招待 & 権限管理機能を実装したい。
1) `plan_collaborators` テーブル定義 (SQL) を設計
2) `InvitationsService` (createInvite, acceptInvite, revoke) を実装
3) `InviteDialog`, `CollaboratorList` コンポーネントを追加
4) LINE 共有のため LIFF スニペットを用意
データフローと UI モック、型定義を含めて提案してください。
```

---

## M4: オフライン編集 & マージ

### 目的
クライアントがオフライン状態でも編集でき、再接続時に自動マージされることを保証する。

### タスク
1. Yjs `IndexedDBPersistence` を組み込む。  
2. 連続編集時のローカルキャッシュ戦略策定。  
3. 再接続検知 & マージテスト。

### プロンプト
```text
オフライン編集対応を追加したい。
- Yjs IndexedDBPersistence でローカル保存
- 再接続時に Supabase sync チャンネルへバッファを flush
- 競合時の UI フィードバックを Alert で表示
実装手順とサンプルコード、ユニットテスト方針を説明してください。
```

---

## M5: テスト・受入 & β公開

### 目的
エンドツーエンドテストを通じて受入基準を満たし、Vercel に β版を公開。

### タスク
1. Playwright で E2E テスト (同時 10 クライアント)。  
2. 招待 URL 有効期限 & 403 レスポンステスト。  
3. Vercel プレビュー URL 共有 & フィードバック収集。

### プロンプト
```text
β公開前の最終テストを実施したい。
- Playwright で多重クライアント同期テストを書きたい
- 招待 URL 403 テストケースを追加
- GitHub Actions で自動テスト → Vercel デプロイをトリガー
E2E テストスクリプト例と CI 設定ファイルを提示してください。
```

---

> 次フェーズ「コメント機能 (Phase 2)」は別ドキュメントで定義予定。 