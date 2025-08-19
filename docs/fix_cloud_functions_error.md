# Cloud Functions エラーの修正手順

## エラーの原因

共有URLを生成しようとした際に以下のエラーが発生しています：

```
Refused to connect to 'https://-voyagesketch.cloudfunctions.net/generateInviteToken'
because it violates the following Content Security Policy directive
```

### 問題点

1. **環境変数の未設定**: `.env` ファイルが存在せず、Firebase の projectId が空になっている
2. **CSPポリシーの更新済み**: Cloud Functions の URL は既に許可リストに追加済み

## 修正手順

### 1. .env ファイルの作成

プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下の内容を設定してください：

```bash
# .env.example をコピーして .env を作成
cp .env.example .env
```

### 2. Firebase プロジェクトIDの確認と設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. プロジェクト設定 → 全般 から以下の値を確認：

```bash
# .env ファイルに以下を設定
VITE_FB_PROJECT_ID=your-actual-project-id  # 例: voyagesketch-12345
```

**重要**: `VITE_FB_PROJECT_ID` は実際のFirebaseプロジェクトIDを設定してください。これが空または未設定の場合、Cloud FunctionsのURLが正しく構築されません。

### 3. すべての環境変数を設定

`.env` ファイルに以下のすべての環境変数を設定：

```bash
# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase（すべて必須）
VITE_FB_API_KEY=your_firebase_api_key
VITE_FB_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FB_PROJECT_ID=your-project-id  # これが重要！
VITE_FB_STORAGE_BUCKET=your-project.appspot.com
VITE_FB_MSG_SENDER_ID=your_sender_id
VITE_FB_APP_ID=your_app_id

# オプション（東京リージョンを使用する場合）
# VITE_FB_FUNCTIONS_REGION=asia-northeast1
```

### 4. 開発サーバーの再起動

環境変数を設定した後、開発サーバーを再起動してください：

```bash
# 一度停止（Ctrl+C）してから再起動
npm run dev
```

### 5. 正しいURLの確認

正しく設定されていれば、Cloud FunctionsのURLは以下のような形式になります：

- デフォルトリージョン: `https://us-central1-your-project-id.cloudfunctions.net/generateInviteToken`
- 東京リージョン: `https://asia-northeast1-your-project-id.cloudfunctions.net/generateInviteToken`

### 6. CSPポリシーについて

CSPポリシーは既に修正済みで、以下が許可されています：

- `https://*.cloudfunctions.net` - Cloud Functions
- `ws://localhost:*` - 開発環境のWebSocket
- `wss://localhost:*` - 開発環境のセキュアWebSocket

## トラブルシューティング

### 環境変数が読み込まれない場合

1. `.env` ファイルがプロジェクトのルートディレクトリにあることを確認
2. ファイル名が正確に `.env` であることを確認（拡張子なし）
3. Viteの環境変数は `VITE_` プレフィックスが必要

### それでもエラーが発生する場合

1. ブラウザのキャッシュをクリア
2. ブラウザの開発者ツールでネットワークタブを確認
3. コンソールで以下を実行して環境変数を確認：

```javascript
console.log(import.meta.env.VITE_FB_PROJECT_ID);
```

### Firebase Functions のデプロイ確認

Cloud Functions が正しくデプロイされているか確認：

```bash
firebase functions:list
```

`generateInviteToken` 関数がリストに表示されることを確認してください。

## まとめ

このエラーは主に環境変数（特に `VITE_FB_PROJECT_ID`）が設定されていないことが原因です。`.env` ファイルを作成し、すべての必要な環境変数を設定することで解決できます。
