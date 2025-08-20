# VoyageSketch

旅行計画に特化したマップWebアプリです。Google Mapsを使用して候補地の管理、移動時間の確認、ルート検索などの機能を提供します。

## ✨ 主な機能

- 📍 **地点管理**: Google Places検索で候補地を追加・編集
- 🗂️ **カテゴリ分類**: ホテル、レストラン、観光地などでアイコン表示
- ⏱️ **移動時間表示**: 起点からの移動時間を可視化
- 🚗 **ルート検索**: 2地点間の最適ルートを表示
- 💰 **コスト管理**: 予想費用を記録して予算管理
- 📱 **PWA対応**: インストール可能でオフラインでも利用可能
- 🌙 **レスポンシブ**: デスクトップ・タブレット・スマホに対応

## 🚀 セットアップ

### 前提条件

- Node.js 18以上
- Google Maps API キー

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd travel_app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env`ファイルを作成し、Google Maps API キーを設定：

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 4. Google Maps API の設定

Google Cloud Consoleで以下のAPIを有効化：

- Maps JavaScript API
- Places API
- Directions API

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてアプリにアクセスできます。

## 📦 ビルドとデプロイ

### 本番用ビルド

```bash
npm run build
```

### デプロイ

#### Vercel

1. GitHub にプッシュ
2. Vercel でプロジェクトをインポート
3. 環境変数 `VITE_GOOGLE_MAPS_API_KEY` を設定
4. デプロイ実行

#### Netlify

1. ビルドコマンド: `npm run build`
2. 公開ディレクトリ: `dist`
3. 環境変数を設定
4. デプロイ実行

## 🎯 使い方

### 基本的な操作

1. **地点の追加**: 上部の検索バーで場所を検索し、「候補地に追加」をクリック
2. **地点の編集**: マーカーをクリックして詳細パネルを開き、名前やメモを編集
3. **移動時間確認**: 移動時間タブで起点を選択し、他の地点までの時間を表示
4. **ルート検索**: Ctrl+クリック（デスクトップ）で2地点間のルートを表示
5. **リスト表示**: リストタブで候補地を一覧表示し、カテゴリフィルターを使用

### キーボードショートカット（デスクトップ）

- `Ctrl/⌘ + F`: 検索バーにフォーカス
- `Esc`: 検索をクリア / モーダルを閉じる
- `+/-`: ズームイン/アウト
- `?`: キーボードショートカット一覧を表示
- `Ctrl/⌘ + S`: 現在の変更を保存

## 🛠️ 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **地図**: Google Maps JavaScript API
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **PWA**: Workbox (vite-plugin-pwa)

## 📁 プロジェクト構造

```
src/
├── components/          # UIコンポーネント
├── hooks/              # カスタムフック
├── store/              # Zustand ストア
├── services/           # ビジネスロジック
├── types/              # TypeScript型定義
├── utils/              # ユーティリティ関数
└── adapters/           # 外部API アダプター
```

## 🔧 PWA アイコンの設定

PWA として動作させるには、以下のアイコンファイルを `public/` ディレクトリに配置してください：

- `pwa-192x192.png` (192x192px)
- `pwa-512x512.png` (512x512px)
- `favicon.ico`
- `apple-touch-icon.png` (180x180px)
- `masked-icon.svg` (モノクロSVG)

## 🌟 パフォーマンス最適化

- **バンドル分割**: vendor、maps、utilsに分離
- **マーカークラスタリング**: 15個以上の地点で自動クラスタリング
- **Service Worker**: Google Maps APIのキャッシュ
- **Lazy Loading**: コンポーネントの遅延読み込み

## 🔒 セキュリティ

- HTTPSリダイレクト
- セキュリティヘッダー設定
- XSS攻撃防止
- Google Maps APIキーの制限設定推奨

## 🐛 トラブルシューティング

### Google Maps API エラー

1. APIキーが正しく設定されているか確認
2. 請求先アカウントが設定されているか確認
3. 必要なAPIが有効化されているか確認

### ビルドエラー

```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# 型チェック
npm run type-check
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

バグ報告や機能要求は Issue でお知らせください。プルリクエストも歓迎します。

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [トラブルシューティングガイド](./docs/troubleshooting.md)
2. [よくある質問](./docs/faq.md)
3. GitHub Issues
