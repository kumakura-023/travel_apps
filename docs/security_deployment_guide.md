# VoyageSketch セキュリティデプロイメントガイド

## 実装完了項目

### ✅ 高優先度（完了）

1. **環境変数の適切な管理**
   - `.env.example` ファイルを作成
   - 環境変数を安全に管理する `src/config/environment.ts` を実装
   - Firebase と Google Maps API の設定を一元化

2. **console.log の削除**
   - `src/firebase.ts` から本番環境での API キー出力を削除

3. **Firebase セキュリティルール**
   - `firestore.rules` を作成し、適切なアクセス制御を実装
   - `firestore.indexes.json` でインデックスを定義

### ✅ 中優先度（完了）

1. **XSS 対策**
   - `SafeRouteOverlay.tsx` - React Portal を使用した安全なオーバーレイ
   - `SafeTravelTimeOverlay.tsx` - React Portal を使用した安全なオーバーレイ
   - ※実際の RouteDisplay.tsx と TravelTimeCircle.tsx への適用は別途必要

2. **CSP ヘッダー**
   - `index.html` に Content Security Policy メタタグを追加

3. **エラーハンドリング**
   - `src/utils/errorHandler.ts` を作成
   - ユーザーフレンドリーなエラーメッセージ機能を実装

## デプロイ前のチェックリスト

### 1. 環境変数の設定

```bash
# .env ファイルが Git にコミットされていないことを確認
git status

# .env ファイルが .gitignore に含まれていることを確認
cat .gitignore | grep .env
```

### 2. APIキーの制限設定

#### Google Maps API キー
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「APIとサービス」→「認証情報」
3. 該当の API キーをクリック
4. 「アプリケーションの制限」で「HTTPリファラー」を選択
5. 許可するサイトを追加：
   - `https://yourdomain.com/*`
   - `https://www.yourdomain.com/*`

#### Firebase プロジェクト
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト設定 → 全般
3. 「承認済みドメイン」にドメインを追加

### 3. Firebase セキュリティルールのデプロイ

```bash
# Firebase CLI をインストール
npm install -g firebase-tools

# Firebase にログイン
firebase login

# プロジェクトを初期化
firebase init

# Firestore ルールをデプロイ
firebase deploy --only firestore:rules

# インデックスをデプロイ
firebase deploy --only firestore:indexes
```

### 4. 本番ビルドの確認

```bash
# 本番ビルドを作成
npm run build

# ビルドサイズを確認
du -sh dist/

# 環境変数が適切に設定されているか確認
grep -r "VITE_" dist/ # 何も表示されないことを確認
```

### 5. セキュリティヘッダーの確認

デプロイ後、以下のツールでセキュリティヘッダーを確認：
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## デプロイメントプラットフォーム別設定

### Vercel

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

環境変数の設定：
1. Vercel ダッシュボード → Settings → Environment Variables
2. 各環境変数を追加（.env.example を参照）

### Netlify

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

環境変数の設定：
1. Netlify ダッシュボード → Site settings → Environment variables
2. 各環境変数を追加

## 今後の対応推奨項目

### 1. XSS 対策の完全適用
現在作成した `SafeRouteOverlay.tsx` と `SafeTravelTimeOverlay.tsx` を実際のコンポーネントに適用：

```typescript
// RouteDisplay.tsx の修正例
import { SafeRouteOverlay } from './SafeRouteOverlay';

// innerHTML を使用している部分を置き換え
{shouldShowOverlay && (
  <SafeRouteOverlay
    routeId={route.id}
    position={overlayPosition}
    scale={scale}
    content={{
      icon: getTravelModeIcon(),
      label: getTravelModeLabel(),
      duration: route.durationText,
      distance: route.distanceText,
    }}
    onDelete={handleDelete}
  />
)}
```

### 2. 定期的なセキュリティ監査

```bash
# npm の脆弱性チェック
npm audit

# 修正可能な脆弱性を自動修正
npm audit fix

# 依存関係の更新
npm update
```

### 3. モニタリングの設定

- Google Cloud Console で API の使用状況を監視
- Firebase Console で認証エラーやデータベースアクセスを監視
- エラー追跡サービス（Sentry など）の導入を検討

## 緊急時の対応

### APIキーが漏洩した場合
1. 即座に該当の API キーを無効化
2. 新しい API キーを生成
3. 環境変数を更新
4. アプリケーションを再デプロイ

### 不正アクセスが検知された場合
1. Firebase セキュリティルールで一時的にアクセスを制限
2. ログを確認して影響範囲を特定
3. 必要に応じてユーザーに通知
4. セキュリティルールを強化

## まとめ

本ガイドに従ってセキュリティ強化を実装することで、VoyageSketch アプリケーションの安全性が大幅に向上します。特に高優先度の項目はすべて実装済みのため、あとは適切なデプロイメント設定を行うだけで本番環境での運用が可能です。

継続的なセキュリティ向上のため、定期的な監査とアップデートを忘れずに実施してください。