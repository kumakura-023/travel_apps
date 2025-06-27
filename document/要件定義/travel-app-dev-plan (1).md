## 🎯 各ステップの完了基準

各ステップ実行後、以下を確認してから次へ進む：

1. **エラーなく動作する**（コンソールエラーがない）
2. **UIが洗練されている**（Google Maps 基準）
3. **レスポンシブ対応**（スマホ/タブレット/PC全てで快適）
4. **アニメーションが滑らか**（60fps維持）
5. **ユーザビリティが高い**（直感的な操作）
6. **パフォーマンスが良い**（Lighthouse スコア 90以上）

---

## 💡 AI への追加指示テンプレート

### 問題が発生した場合の修正依頼：
```
[エラー内容をペースト]
上記のエラーを修正してください。
また、より Google Maps に近い洗練された UI に改善してください。
ブラウザの開発者ツールでの警告も解消してください。
```

### 機能追加の依頼：
```
[現在のステップ] が完成しました。
さらに以下の機能を追加してください：
- [追加したい機能]
既存のコードを壊さないよう、慎重に統合してください。
レスポンシブデザインを維持してください。
```

### デザイン改善の依頼：
```
現在のUIをより洗練されたものにしてください：
- Material Design 3 の最新ガイドラインに準拠
- Google Maps Webアプリと同等の品質
- アニメーションとマイクロインタラクションの追加
- ダークモード対応（可能であれば）
```

### パフォーマンス改善の依頼：
```
Lighthouse でパフォーマンスを測定したところ、
以下の問題が見つかりました：
[Lighthouse の結果をペースト]
これらを改善し、スコアを90以上にしてください。
```

---

## 🚀 デプロイ手順

完成後、以下の手順でデプロイ：

### Vercel の場合：
1. GitHub にプッシュ
2. Vercel でプロジェクトをインポート
3. 環境変数を設定（VITE_GOOGLE_MAPS_API_KEY）
4. デプロイ実行

### Netlify の場合：
1. ビルドコマンド: `npm run build`
2. 公開ディレクトリ: `dist`
3. 環境変数を設定
4. デプロイ実行

### 本番環境の Google Maps API 設定：
1. Google Cloud Console でAPIキーを作成
2. HTTPリファラーを制限（本番URL のみ許可）
3. 必要なAPI を有効化：
   - Maps JavaScript API
   - Places API
   - Directions API

---

## 📊 想定される完成品の仕様

### 技術仕様
- **フレームワーク**: React 18 + TypeScript
- **ビルドサイズ**: < 500KB (gzip)
- **初回ロード**: < 3秒（3G環境）
- **対応ブラウザ**: Chrome, Firefox, Safari, Edge（最新2バージョン）
- **対応デバイス**: スマホ、タブレット、デスクトップ

### 機能仕様
- **地点登録数**: 最大100地点/計画
- **計画保存数**: 最大20計画（LocalStorage制限）
- **オフライン**: 基本機能は動作可能
- **共有**: URLによる読み取り専用共有

### UX仕様
- **操作性**: Google Maps と同等の直感的な操作
- **レスポンス**: 全ての操作が100ms以内に反応
- **アニメーション**: 60fps を維持
- **アクセシビリティ**: WCAG 2.1 レベルAA準拠

---

## 🎨 デザインシステム

### カラーパレット
```css
:root {
  /* Primary Colors */
  --primary-blue: #1a73e8;
  --primary-blue-dark: #1557b0;
  --primary-blue-light: #4285f4;
  
  /* Secondary Colors */
  --success-green: #188038;
  --warning-yellow: #f9ab00;
  --error-red: #d33b27;
  
  /* Neutral Colors */
  --gray-900: #202124;
  --gray-700: #5f6368;
  --gray-500: #9aa0a6;
  --gray-300: #dadce0;
  --gray-100: #f1f3f4;
  --white: #ffffff;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
  --shadow-md: 0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15);
  --shadow-lg: 0 2px 3px 0 rgba(60,64,67,.3), 0 6px 10px 4px rgba(60,64,67,.15);
}
```

### タイポグラフィ
```css
/* Google Sans を優先、なければシステムフォント */
font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* サイズ */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
```

### アニメーション
```css
/* 基本のイージング */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-deceleration: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-acceleration: cubic-bezier(0.4, 0.0, 1, 1);

/* デュレーション */
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 400ms;
```

---

## 🔧 トラブルシューティング

### よくある問題と解決策

1. **Google Maps API エラー**
   - APIキーの確認
   - 請求先アカウントの設定
   - API の有効化確認

2. **ビルドエラー**
   - node_modules 削除して再インストール
   - TypeScript の型エラーを確認
   - 環境変数の設定確認

3. **パフォーマンス問題**
   - マーカーが多い場合はクラスタリング
   - 画像の最適化
   - 不要な再レンダリングの削除

4. **レイアウト崩れ**
   - CSS Grid/Flexbox の確認
   - viewport メタタグの確認
   - rem/em 単位の使用

---

## 📝 開発のベストプラクティス

1. **コンポーネント設計**
   - 単一責任の原則
   - Props の型定義を必須
   - カスタムフックで状態管理

2. **状態管理**
   - Zustand でグローバル状態
   - React Query でサーバー状態（将来）
   - useReducer で複雑なローカル状態

3. **スタイリング**
   - Tailwind のユーティリティファースト
   - CSS Modules で複雑なスタイル
   - CSS変数でテーマ管理

4. **テスト（将来の拡張）**
   - Vitest でユニットテスト
   - React Testing Library で統合テスト
   - Playwright でE2Eテスト

---

これで完全な開発計画になったよ！各ステップのプロンプトをAIに投げていけば、プロ品質の旅行計画Webアプリが作れるはず。

特にWebアプリ版として改善した点：
- **レスポンシブ対応**: PC/タブレット/スマホ全てで最適な表示
- **PWA対応**: インストール可能でオフラインでも動作
- **デプロイ対応**: Vercel/Netlifyですぐに公開可能
- **パフォーマンス**: Webアプリとして最適化された設計

何か他に追加したい機能や、特定の部分についてもっと詳しく知りたいことがあれば教えて！# 旅行計画Webアプリ - AI駆動開発計画

## 開発方針
ブラウザで動作する旅行計画Webアプリを作成します。
各ステップで AI に以下のプロンプトをコピペするだけで、段階的にアプリが完成します。
各プロンプトは独立しており、前のコードを含めて完全なファイルを生成します。

## 技術スタック
- **フロントエンド**: React + TypeScript（SPA）
- **地図**: Google Maps JavaScript API
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **データ保存**: LocalStorage（将来的にFirebase対応可）
- **ホスティング**: Vercel/Netlify（静的サイト）

---

## 🚀 Step 1: プロジェクト初期設定

### プロンプト
```
React + TypeScript + Vite で旅行計画Webアプリのプロジェクトを作成してください。

要件:
1. ブラウザで動作するSPA（シングルページアプリケーション）
2. Google Maps JavaScript API を使用
3. Tailwind CSS でスタイリング  
4. Zustand で状態管理
5. レスポンシブデザイン（デスクトップ/タブレット/スマホ対応）
6. 以下のプロジェクト構造を作成:
   - src/
     - components/
     - hooks/
     - store/
     - types/
     - utils/
     - App.tsx
     - main.tsx

必要なパッケージ:
- @react-google-maps/api
- zustand
- react-icons
- tailwindcss

以下のファイルを生成してください:
1. package.json
2. tsconfig.json
3. tailwind.config.js
4. index.html (viewport設定、PWA対応のmeta tags含む)
5. .env.example (VITE_GOOGLE_MAPS_API_KEY用)
6. src/App.tsx (Google Maps を表示する基本的なコンポーネント)
7. src/types/index.ts (基本的な型定義)

地図は東京駅を中心に表示し、以下の要件を満たしてください:
- フルスクリーンで地図を表示
- マウスホイールでズーム
- ドラッグで移動
- デスクトップでもモバイルでも快適に操作できる
- Google Maps のようなシンプルで洗練されたデザイン
```

### 動作確認
- `npm install` → `npm run dev`
- ブラウザで http://localhost:5173 を開いて地図が表示される
- マウス操作とタッチ操作の両方で地図を操作できる

---

## 🗺️ Step 2: 検索バーと基本UI

### プロンプト
```
前のコードに以下の機能を追加してください:

1. Google Maps 風の検索バー（Webアプリ版）
   - 画面上部に固定（position: fixed）
   - 白背景、影付き（box-shadow）
   - Places Autocomplete 対応
   - 検索アイコン付き
   - デスクトップ: 幅400px、中央配置
   - モバイル: 左右に margin 16px

2. マップコントロール
   - ズームコントロールは右下
   - 全画面表示ボタンあり（デスクトップのみ）
   - ストリートビューは非表示
   - マップタイプ切り替えは左上

3. レスポンシブ対応
   - ブレークポイント: sm(640px), md(768px), lg(1024px)
   - タッチデバイス検出してUIを調整

4. キーボードショートカット（デスクトップ）
   - Ctrl/Cmd + F: 検索フォーカス
   - Esc: 検索をクリア
   - +/-: ズームイン/アウト

以下のコンポーネントを作成:
- src/components/SearchBar.tsx
- src/components/Map.tsx
- src/hooks/useGoogleMaps.ts
- src/hooks/useDeviceDetect.ts
- src/hooks/useKeyboardShortcuts.ts

検索した場所に自動的に地図が移動し、適切なズームレベルに調整してください。
Material Design の elevation を使用して、Google Maps のような洗練された見た目にしてください。
```

---

## 📍 Step 3: 地点の追加と表示

### プロンプト
```
検索した場所を旅行の候補地として保存できる機能を追加してください:

1. データモデル
   - id, name, address, lat, lng, category, memo, cost を持つ Place 型
   - カテゴリ: hotel, restaurant, sightseeing, shopping, transport, other

2. 状態管理 (Zustand)
   - src/store/placesStore.ts を作成
   - 地点の追加、更新、削除機能

3. カスタムマーカー
   - カテゴリごとのアイコン（ホテル=ベッド、レストラン=フォーク&ナイフ等）
   - 保存した地点は大きめのアイコン（40x40px）
   - 白い縁取り（3px）で目立つように
   - ホバー時に少し大きくなるアニメーション

4. 検索結果に「追加」ボタン
   - 検索後、結果の下に「この場所を候補地に追加」ボタン
   - カテゴリ選択のドロップダウン付き

以下のファイルを作成/更新:
- src/types/index.ts (Place型の追加)
- src/store/placesStore.ts
- src/components/CustomMarker.tsx
- src/components/AddPlaceButton.tsx
- src/utils/categoryIcons.ts

アイコンは React Icons を使用し、カラフルで視認性の高いデザインにしてください。
```

---

## 💬 Step 4: 付箋表示と地点詳細

### プロンプト
```
マーカーの情報表示機能を追加してください:

1. 付箋風の情報表示
   - マーカーの右上に小さな付箋
   - 地点名を表示（最大15文字で省略）
   - 薄い黄色の背景、軽い影
   - ズームレベル 14 以上で表示
   - ホバー時（デスクトップ）またはタップ時（モバイル）に強調

2. 地点詳細パネル（レスポンシブ対応）
   - デスクトップ: 右サイドパネル（幅 400px）
   - タブレット: ボトムシート（高さ 50%）
   - モバイル: フルスクリーンモーダル
   - 内容：
     - 地点名（編集可能）
     - 住所
     - カテゴリ（変更可能）
     - メモ欄（編集可能なテキストエリア）
     - 予想コスト（数値入力、¥表示）
     - 削除ボタン（確認ダイアログ付き）
     - Google Maps で開くボタン（新しいタブ）
     - 閉じるボタン（×）

3. 編集時の自動保存
   - 入力後 1秒で自動保存
   - 保存中インジケーター表示
   - Ctrl/Cmd + S でも保存可能

4. アクセシビリティ
   - Tab キーでフォーカス移動
   - Enter キーで編集開始
   - Esc キーでパネルを閉じる

以下のファイルを作成:
- src/components/PlaceLabel.tsx
- src/components/PlaceDetailPanel.tsx (レスポンシブ対応)
- src/components/ConfirmDialog.tsx
- src/hooks/useAutoSave.ts
- src/hooks/useMediaQuery.ts
- src/utils/formatCurrency.ts

デバイスサイズに応じて最適な表示方法を選択し、
デスクトップでもモバイルでも快適に使えるようにしてください。
```

---

## 🚗 Step 5: タブUIと移動時間表示

### プロンプト
```
画面下部にタブナビゲーションを追加し、移動時間機能を実装してください:

1. タブナビゲーション（レスポンシブ対応）
   - デスクトップ: 左サイドバー（幅 64px、アイコンのみ）
   - モバイル: 画面下部に固定
   - 3つのタブ：地図 | 移動時間 | リスト
   - アクティブタブは青色、アイコン付き
   - ツールチップ表示（デスクトップ）

2. 移動時間モード
   - UI配置:
     - デスクトップ: 左上にコントロールパネル
     - モバイル: 上部に固定バー
   - 機能:
     - 「起点を選択」ボタン
     - 地点クリックで起点設定
     - 移動手段選択（徒歩/車/電車）
     - 時間範囲スライダー（5-60分）
   - 可視化:
     - 指定時間圏内を半透明の円で表示
     - 圏内の登録地点に移動時間をバッジ表示
     - 圏外の地点は薄く表示

3. Directions API 統合
   - src/services/directionsService.ts
   - バッチ処理（最大25地点同時）
   - 結果のキャッシュ（5分間）
   - レート制限対応

4. 2地点間の移動時間
   - 操作方法:
     - デスクトップ: Ctrl+クリック
     - モバイル: 長押しで選択モード
   - 表示:
     - 地点間に曲線と移動時間
     - 複数ルート選択可能
   - UIフィードバック:
     - 選択中の地点をハイライト
     - 選択解除ボタン

以下のファイルを作成:
- src/components/TabNavigation.tsx (レスポンシブ)
- src/components/TravelTimeControls.tsx
- src/components/TravelTimeOverlay.tsx
- src/components/RouteDisplay.tsx
- src/services/directionsService.ts
- src/hooks/useDirections.ts

デスクトップでは効率的な操作を、
モバイルでは直感的なタッチ操作を実現してください。
```

---

## 📋 Step 6: リスト表示とコスト集計

### プロンプト
```
3つ目のタブとしてリスト表示とコスト管理機能を追加してください:

1. 候補地リスト
   - カード形式で表示
   - カテゴリアイコン、名前、メモの一部を表示
   - カテゴリフィルター（複数選択可）
   - 検索ボックス
   - クリックで地図の該当地点にフォーカス

2. コスト集計セクション
   - リスト上部に集計情報
   - 総費用を大きく表示
   - カテゴリ別の内訳（円グラフ）
   - 各地点のコスト編集可能

3. ソート機能
   - 名前順、コスト順、追加日順
   - 昇順/降順切り替え

4. 一括操作
   - 全選択/解除
   - 選択項目の一括削除

以下のファイルを作成:
- src/components/PlaceList.tsx
- src/components/PlaceListItem.tsx
- src/components/CostSummary.tsx
- src/components/CategoryFilter.tsx
- src/components/CostPieChart.tsx

Material Design のリストコンポーネントを参考に、
情報が整理された見やすいデザインにしてください。
```

---

## 💾 Step 7: データ保存と計画管理

### プロンプト
```
旅行計画の保存と管理機能を追加してください:

1. メニューボタン
   - デスクトップ: 左上のハンバーガーアイコン
   - モバイル: 右上（検索バーの横）
   - クリックでメニュー表示

2. メニュー構成（レスポンシブ）
   - デスクトップ: 左からスライドインするドロワー（幅 280px）
   - モバイル: 全画面メニュー
   - 内容:
     - 現在の計画名（編集可能）
     - 新規計画作成
     - 計画一覧
     - 設定
     - ヘルプ
     - アプリについて

3. 計画管理機能
   - データ構造:
     - 計画ID、名前、作成日、更新日、地点データ
   - 保存先:
     - LocalStorage（即座に利用可能）
     - エクスポート/インポート機能（JSON）
   - 機能:
     - 計画の複製
     - 計画の削除（確認付き）
     - 計画の検索
     - サムネイル表示（地点数、総コスト）

4. 自動保存とクラウド同期準備
   - 変更検知して3秒後に自動保存
   - 保存状態のインジケーター
   - 「最終保存: 〇分前」表示
   - Firebase対応の準備（将来の拡張用）

5. 設定画面
   - 表示設定:
     - 付箋表示のON/OFF
     - 地図スタイル（通常/衛星/地形）
     - 言語設定
   - デフォルト設定:
     - 移動手段
     - 時間圏表示範囲
   - データ管理:
     - 全データのエクスポート
     - データのクリア

6. URL共有機能（ボーナス）
   - 計画をURLで共有（読み取り専用）
   - URLにエンコードしたデータを含める

以下のファイルを作成:
- src/components/AppMenu.tsx
- src/components/PlanManager.tsx
- src/components/PlanList.tsx
- src/components/Settings.tsx
- src/services/storageService.ts
- src/hooks/useAutoSave.ts
- src/utils/planSerializer.ts
- src/utils/shareUtils.ts

ブラウザのストレージ制限を考慮し、
効率的なデータ保存を実現してください。
```

---

## ✨ Step 8: 最終仕上げとデプロイ

### プロンプト
```
Webアプリを完成させ、本番環境にデプロイできるようにしてください:

1. パフォーマンス最適化
   - 多数のマーカー表示時のクラスタリング（@googlemaps/markerclusterer）
   - React.memo と useMemo での最適化
   - 仮想スクロール（リストが長い場合）
   - Bundle分割とLazy Loading
   - 画像の最適化（WebP対応）

2. PWA（Progressive Web App）対応
   - manifest.json の作成
   - Service Worker でオフライン対応
   - インストール可能にする
   - アイコンセット（各サイズ）
   - スプラッシュスクリーン

3. SEOとメタデータ
   - 適切なtitleとdescription
   - OGP画像
   - robots.txt
   - sitemap.xml

4. エラーハンドリングとUX
   - グローバルエラーバウンダリー
   - API エラー時の再試行
   - オフライン時の警告
   - ローディング状態の統一
   - 空状態のイラスト

5. アクセシビリティ（A11y）
   - WAI-ARIA 属性
   - キーボード完全対応
   - スクリーンリーダー対応
   - カラーコントラスト確認
   - フォーカス管理

6. 追加の便利機能
   - 地点の並べ替え（ドラッグ&ドロップ）
   - 一括選択と操作
   - 印刷用CSS（旅程表として印刷）
   - キーボードショートカット一覧
   - チュートリアル（初回起動時）

7. ビルドとデプロイ設定
   - 環境変数の管理（.env.production）
   - ビルド最適化設定
   - Vercel/Netlify用の設定ファイル
   - GitHub Actions でCI/CD
   - Sentryでエラー監視

8. ドキュメント作成
   - README.md（セットアップ手順）
   - CONTRIBUTING.md
   - 使い方ガイド（docs/）

以下のファイルを作成/更新:
- public/manifest.json
- src/serviceWorker.ts
- src/components/ErrorBoundary.tsx
- src/components/Tutorial.tsx
- src/components/KeyboardShortcuts.tsx
- .github/workflows/deploy.yml
- vercel.json or netlify.toml
- docs/user-guide.md

完成度の高い、本番環境で運用可能な
Google Maps クオリティのWebアプリに仕上げてください。

デプロイ後のURL: https://travel-planner.vercel.app
```

---

## 🎯 各ステップの完了基準

各ステップ実行後、以下を確認してから次へ進む：

1. **エラーなく動作する**
2. **UIが洗練されている**（Google Maps 基準）
3. **レスポンシブ対応**
4. **アニメーションが滑らか**
5. **ユーザビリティが高い**

---

## 💡 AI への追加指示テンプレート

問題が発生した場合の修正依頼：
```
[エラー内容をペースト]
上記のエラーを修正してください。
また、より Google Maps に近い洗練された UI に改善してください。
```

機能追加の依頼：
```
[現在のステップ] が完成しました。
さらに以下の機能を追加してください：
- [追加したい機能]
既存のコードを壊さないよう、慎重に統合してください。
```

デザイン改善の依頼：
```
現在のUIをより洗練されたものにしてください：
- Material Design 3 の最新ガイドラインに準拠
- Google Maps アプリと同等の品質
- アニメーションとマイクロインタラクションの追加
```