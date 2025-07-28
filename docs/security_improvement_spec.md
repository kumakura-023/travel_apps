# VoyageSketch セキュリティ強化実装仕様書

## 1. 概要
本仕様書は、VoyageSketch アプリケーションで特定されたセキュリティ脆弱性を修正し、セキュリティを強化するための実装仕様を定義します。

## 2. 特定された脆弱性と対策

### 2.1 環境変数・APIキー管理

#### 現在の問題点
- ⚠️ **重大**: `.env` ファイルにAPIキーがハードコーディングされている
- ⚠️ **重大**: APIキーがクライアントサイドで露出している
- ⚠️ **中**: Firebase設定にconsole.logでAPIキーが出力されている

#### 対策
1. **環境変数の適切な管理**
   - `.env` ファイルをGitリポジトリから削除（既に.gitignoreには含まれている）
   - `.env.example` ファイルを作成し、キーの名前のみを記載
   - 本番環境では環境変数を安全に管理（Vercel、Netlify等のシークレット機能を使用）

2. **APIキーの保護**
   - Google Maps APIキーにHTTPリファラー制限を設定
   - FirebaseのAPIキーにドメイン制限を設定
   - 本番環境でのconsole.log出力を削除

### 2.2 XSS（クロスサイトスクリプティング）対策

#### 現在の問題点
- ⚠️ **中**: `RouteDisplay.tsx` と `TravelTimeCircle.tsx` でdangerouslySetInnerHTMLを使用

#### 対策
1. **innerHTML使用の削除**
   - カスタムオーバーレイをReact Portalを使用して実装
   - DOM操作を安全なReactコンポーネントに置き換え

### 2.3 データストレージのセキュリティ

#### 現在の問題点
- ⚠️ **低**: localStorageに旅行プランデータを平文で保存
- ⚠️ **低**: 機密情報（場所、メモ）が暗号化されていない

#### 対策
1. **データの暗号化**（オプション - パフォーマンスとのトレードオフ）
   - 機密性の高いデータ（個人のメモ、プライベートな場所）を暗号化
   - Web Crypto APIを使用した暗号化実装

### 2.4 Firebase セキュリティルール

#### 現在の問題点
- ⚠️ **高**: Firestoreのセキュリティルールが未確認

#### 対策
1. **適切なセキュリティルールの実装**
   ```javascript
   // firestore.rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // ユーザーは自分のデータのみアクセス可能
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // プランは所有者とメンバーのみアクセス可能
       match /plans/{planId} {
         allow read: if request.auth != null && 
           (resource.data.ownerId == request.auth.uid || 
            request.auth.uid in resource.data.members);
         allow write: if request.auth != null && 
           (resource.data.ownerId == request.auth.uid || 
            request.auth.uid in resource.data.members);
         allow create: if request.auth != null;
       }
     }
   }
   ```

### 2.5 認証・認可の強化

#### 現在の問題点
- ⚠️ **中**: 招待トークンがlocalStorageに平文で保存

#### 対策
1. **トークン管理の改善**
   - 招待トークンの有効期限設定
   - トークンの暗号化またはセッションストレージへの移動

### 2.6 外部API通信のセキュリティ

#### 現在の問題点
- ✅ すべての外部API通信はHTTPSを使用（問題なし）
- ⚠️ **低**: エラーメッセージに詳細な技術情報が含まれる可能性

#### 対策
1. **エラーハンドリングの改善**
   - 本番環境では詳細なエラー情報を隠蔽
   - ユーザーフレンドリーなエラーメッセージの表示

### 2.7 Content Security Policy (CSP)

#### 現在の問題点
- ⚠️ **中**: CSPヘッダーが設定されていない

#### 対策
1. **CSPヘッダーの実装**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; 
                  script-src 'self' 'unsafe-inline' https://maps.googleapis.com; 
                  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
                  img-src 'self' data: https: blob:; 
                  font-src 'self' https://fonts.gstatic.com; 
                  connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com;">
   ```

## 3. 実装優先順位

### 高優先度（即座に対応）
1. 環境変数の適切な管理とAPIキーの保護
2. Firebaseセキュリティルールの実装
3. console.logの削除（本番環境）

### 中優先度（次のリリースまでに対応）
1. XSS対策（innerHTML使用の削除）
2. CSPヘッダーの実装
3. 招待トークン管理の改善

### 低優先度（将来的に検討）
1. localStorageデータの暗号化
2. より詳細なエラーハンドリング

## 4. 実装チェックリスト

- [ ] `.env` ファイルの削除と `.env.example` の作成
- [ ] APIキーへの適切な制限設定
- [ ] console.log文の削除（firebase.ts:29）
- [ ] Firebaseセキュリティルールの実装とデプロイ
- [ ] innerHTML使用箇所のReactコンポーネント化
- [ ] CSPメタタグの追加（index.html）
- [ ] 本番環境でのエラーメッセージ最適化
- [ ] セキュリティテストの実施

## 5. セキュリティベストプラクティス

### 開発時の注意事項
1. 新しい外部APIを追加する際は必ずHTTPSを使用
2. ユーザー入力は常にサニタイズ/バリデーション
3. 機密情報はクライアントサイドに保存しない
4. 定期的な依存関係の更新（`npm audit`の実行）

### デプロイ時の確認事項
1. 環境変数が正しく設定されているか
2. APIキーの制限が適切に設定されているか
3. Firebaseセキュリティルールが適用されているか
4. HTTPSが強制されているか

## 6. 監視とメンテナンス

### 推奨される監視項目
1. 異常なAPI使用量の検知
2. 認証失敗の監視
3. セキュリティヘッダーの定期的な確認
4. 依存関係の脆弱性スキャン（GitHub Dependabot）

### 定期的なセキュリティレビュー
- 四半期ごとのコードセキュリティレビュー
- 年次のペネトレーションテスト（可能であれば）
- 新機能追加時のセキュリティ影響評価

## 7. 実装例

### 7.1 環境変数管理の改善

```typescript
// src/config/environment.ts
const getEnvironmentVariable = (key: string): string => {
  const value = import.meta.env[key];
  if (!value && import.meta.env.PROD) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
};

export const config = {
  googleMapsApiKey: getEnvironmentVariable('VITE_GOOGLE_MAPS_API_KEY'),
  firebase: {
    apiKey: getEnvironmentVariable('VITE_FB_API_KEY'),
    authDomain: getEnvironmentVariable('VITE_FB_AUTH_DOMAIN'),
    projectId: getEnvironmentVariable('VITE_FB_PROJECT_ID'),
    storageBucket: getEnvironmentVariable('VITE_FB_STORAGE_BUCKET'),
    messagingSenderId: getEnvironmentVariable('VITE_FB_MSG_SENDER_ID'),
    appId: getEnvironmentVariable('VITE_FB_APP_ID'),
  },
};
```

### 7.2 安全なオーバーレイ実装（React Portal使用）

```typescript
// src/components/SafeOverlay.tsx
import { createPortal } from 'react-dom';

interface SafeOverlayProps {
  position: { x: number; y: number };
  onDelete: () => void;
  content: {
    icon: string;
    label: string;
    duration: string;
    distance: string;
  };
}

export const SafeOverlay: React.FC<SafeOverlayProps> = ({ position, onDelete, content }) => {
  return createPortal(
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      className="route-info-overlay"
    >
      <div className="overlay-header">
        <div className="travel-mode">
          <span className="icon">{content.icon}</span>
          <span className="label">{content.label}</span>
        </div>
        <button onClick={onDelete} className="delete-btn">
          ✕
        </button>
      </div>
      <div className="overlay-content">
        <span className="duration">{content.duration}</span>
        <span className="distance">({content.distance})</span>
      </div>
    </div>,
    document.body
  );
};
```

### 7.3 セキュアなエラーハンドリング

```typescript
// src/utils/errorHandler.ts
export const handleError = (error: unknown, context: string): string => {
  console.error(`Error in ${context}:`, error);
  
  if (import.meta.env.PROD) {
    // 本番環境では一般的なメッセージを返す
    return 'エラーが発生しました。しばらく経ってから再度お試しください。';
  } else {
    // 開発環境では詳細なエラー情報を返す
    return error instanceof Error ? error.message : 'Unknown error occurred';
  }
};
```

## 8. まとめ

本仕様書に基づいてセキュリティ強化を実装することで、VoyageSketchアプリケーションのセキュリティレベルを大幅に向上させることができます。特に高優先度の項目については、次回のデプロイまでに必ず対応することを推奨します。

セキュリティは継続的な取り組みが必要です。定期的なレビューと更新を行い、新たな脅威に対応していくことが重要です。