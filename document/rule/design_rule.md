# 旅行計画アプリ 統合デザインシステム

## 🎨 デザイン原則

### 基本理念
**「Clarity, Deference, Depth」** - Appleの設計原則を踏襲
- **Clarity（明瞭性）**: 情報の階層を明確に、直感的な操作を実現
- **Deference（控えめ）**: コンテンツを主役に、UIは控えめに
- **Depth（奥行き）**: レイヤーと動きで階層構造を表現

### ブランドパーソナリティ
**「楽しさ」と「洗練」の融合**
- 旅のワクワク感を色彩で表現
- Appleの洗練されたインタラクション
- 親しみやすさと高品質の両立

## 🎨 カラーシステム

### プライマリカラーパレット
```css
/* tailwind.config.js */
colors: {
  // 旅行アプリのブランドカラー（維持）
  'coral': {
    50: '#FFF5F5',
    100: '#FED7D7',
    200: '#FEB2B2',
    300: '#FC8181',
    400: '#F56565',
    500: '#FF6B6B', // Primary
    600: '#E53E3E',
    700: '#C53030',
    800: '#9B2C2C',
    900: '#742A2A',
  },
  'teal': {
    50: '#E6FFFA',
    300: '#4FD1C5',
    500: '#4ECDC4', // Secondary
    700: '#2C7A7B',
  },
  
  // Apple風のシステムカラー
  'system': {
    'background': '#FFFFFF',
    'secondary-background': '#F2F2F7',
    'tertiary-background': '#FFFFFF',
    'grouped-background': '#F2F2F7',
    'separator': 'rgba(60, 60, 67, 0.12)',
    'label': '#000000',
    'secondary-label': 'rgba(60, 60, 67, 0.6)',
    'tertiary-label': 'rgba(60, 60, 67, 0.3)',
    'quaternary-label': 'rgba(60, 60, 67, 0.18)',
  },
}
```

### セマンティックカラー（Apple風）
```css
/* 動的カラー */
.dynamic-color {
  /* ライトモード */
  --color-label: rgba(0, 0, 0, 0.85);
  --color-secondary-label: rgba(0, 0, 0, 0.5);
  --color-tertiary-label: rgba(0, 0, 0, 0.25);
  --color-separator: rgba(0, 0, 0, 0.15);
  --color-fill: rgba(120, 120, 128, 0.2);
  --color-secondary-fill: rgba(120, 120, 128, 0.16);
  
  /* アクセントカラー（ブランドカラー使用） */
  --color-accent: #FF6B6B;
  --color-accent-hover: #E53E3E;
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  .dynamic-color {
    --color-label: rgba(255, 255, 255, 0.85);
    --color-secondary-label: rgba(255, 255, 255, 0.55);
    --color-tertiary-label: rgba(255, 255, 255, 0.25);
    --color-separator: rgba(255, 255, 255, 0.15);
    --color-fill: rgba(120, 120, 128, 0.36);
    --color-secondary-fill: rgba(120, 120, 128, 0.32);
  }
}
```

## 📝 タイポグラフィ（SF Pro風）

### フォントシステム
```css
/* System Font Stack */
fontFamily: {
  'system': [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans JP',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
  ],
  'display': ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  'text': ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
}

/* Dynamic Type Scale (iOS風) */
.title-large { 
  @apply text-[34px] leading-[41px] tracking-[0.374px] font-normal;
}
.title-1 { 
  @apply text-[28px] leading-[34px] tracking-[0.364px] font-normal;
}
.title-2 { 
  @apply text-[22px] leading-[28px] tracking-[0.352px] font-normal;
}
.title-3 { 
  @apply text-[20px] leading-[25px] tracking-[0.38px] font-normal;
}
.headline { 
  @apply text-[17px] leading-[22px] tracking-[-0.408px] font-semibold;
}
.body { 
  @apply text-[17px] leading-[22px] tracking-[-0.408px] font-normal;
}
.callout { 
  @apply text-[16px] leading-[21px] tracking-[-0.32px] font-normal;
}
.subheadline { 
  @apply text-[15px] leading-[20px] tracking-[-0.24px] font-normal;
}
.footnote { 
  @apply text-[13px] leading-[18px] tracking-[-0.078px] font-normal;
}
.caption-1 { 
  @apply text-[12px] leading-[16px] tracking-[0px] font-normal;
}
.caption-2 { 
  @apply text-[11px] leading-[13px] tracking-[0.066px] font-normal;
}
```

## 📐 レイアウトシステム

### 余白（Apple風の精密な間隔）
```css
/* Spacing Scale (4pt基準) */
spacing: {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
}

/* コンポーネント間隔 */
.section-padding { @apply py-10 md:py-16; }
.content-padding { @apply px-5 md:px-8; }
.card-padding { @apply p-4 md:p-5; }
.list-item-padding { @apply py-3 px-4; }
```

### セーフエリア（iOS対応）
```css
/* iPhone のノッチ・ホームインジケータ対応 */
.safe-area-inset {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.header-safe {
  @apply pt-[env(safe-area-inset-top)];
}

.footer-safe {
  @apply pb-[env(safe-area-inset-bottom)];
}
```

## 🔲 視覚効果

### 角丸（Apple風の洗練された曲線）
```css
borderRadius: {
  'none': '0',
  'sm': '6px',    // 小さなボタン、チップ
  'md': '8px',    // インプット、小カード
  'lg': '12px',   // カード、モーダル
  'xl': '16px',   // 大きなカード
  '2xl': '20px',  // シート、大モーダル
  'full': '9999px', // 完全円形
  
  /* iOS風の連続性のある角丸 */
  'ios-sm': '10px',
  'ios-md': '14px',
  'ios-lg': '18px',
  'ios-xl': '22px',
}
```

### 影とぼかし効果
```css
/* Apple風の繊細な影 */
boxShadow: {
  /* 標高別の影 */
  'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.04)',
  'elevation-2': '0 2px 8px rgba(0, 0, 0, 0.04)',
  'elevation-3': '0 5px 10px rgba(0, 0, 0, 0.08)',
  'elevation-4': '0 8px 30px rgba(0, 0, 0, 0.08)',
  'elevation-5': '0 16px 40px rgba(0, 0, 0, 0.12)',
  
  /* ブランドカラーの影（旅行アプリ用） */
  'coral-glow': '0 4px 20px rgba(255, 107, 107, 0.25)',
  'teal-glow': '0 4px 20px rgba(78, 205, 196, 0.25)',
}

/* ガラスモーフィズム（iOS風） */
.glass-effect {
  @apply bg-white/70 backdrop-blur-xl backdrop-saturate-150;
  @apply border border-white/20;
}

.glass-effect-dark {
  @apply bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150;
  @apply border border-white/10;
}
```

## 🧩 コンポーネント設計

### ボタン（iOS風）
```css
/* ベースボタン */
.btn {
  @apply relative inline-flex items-center justify-center;
  @apply font-system text-[17px] font-normal tracking-[-0.408px];
  @apply transition-all duration-100 ease-out;
  @apply select-none touch-manipulation;
  
  /* タップ時のフィードバック */
  @apply active:scale-[0.96] active:opacity-60;
}

/* プライマリボタン（ブランドカラー使用） */
.btn-primary {
  @apply btn bg-coral-500 text-white;
  @apply px-5 py-3 rounded-lg;
  @apply shadow-elevation-2 hover:shadow-elevation-3;
  @apply active:bg-coral-600;
}

/* セカンダリボタン（iOS風） */
.btn-secondary {
  @apply btn bg-system-secondary-background text-system-label;
  @apply px-5 py-3 rounded-lg;
  @apply hover:bg-gray-100;
}

/* テキストボタン（iOS風） */
.btn-text {
  @apply btn text-coral-500;
  @apply px-2 py-1;
  @apply hover:opacity-70;
}

/* システムボタン（iOS設定風） */
.btn-system {
  @apply btn w-full text-left;
  @apply px-4 py-3 rounded-lg;
  @apply bg-white hover:bg-gray-50;
  @apply flex items-center justify-between;
}
```

### カード（Material You × iOS）
```css
/* ベースカード */
.card {
  @apply bg-white rounded-xl;
  @apply shadow-elevation-2;
  @apply overflow-hidden;
}

/* インタラクティブカード */
.card-interactive {
  @apply card cursor-pointer;
  @apply transition-all duration-200 ease-out;
  @apply hover:shadow-elevation-3 hover:scale-[1.01];
  @apply active:scale-[0.99] active:shadow-elevation-1;
}

/* グラスカード（iOS風） */
.card-glass {
  @apply glass-effect rounded-xl;
  @apply shadow-elevation-2;
}

/* リストカード（iOS設定風） */
.card-list {
  @apply bg-white rounded-xl overflow-hidden;
  @apply divide-y divide-system-separator;
}

.card-list-item {
  @apply px-4 py-3 flex items-center justify-between;
  @apply hover:bg-gray-50 transition-colors duration-150;
}
```

### フォーム要素（iOS風）
```css
/* テキストフィールド */
.input {
  @apply w-full px-4 py-3;
  @apply bg-system-secondary-background;
  @apply rounded-lg border-0;
  @apply text-[17px] tracking-[-0.408px];
  @apply placeholder-system-tertiary-label;
  @apply transition-all duration-150;
  
  /* フォーカス時 */
  @apply focus:outline-none focus:ring-2 focus:ring-coral-500/30;
  @apply focus:bg-white;
}

/* スイッチ（iOS風トグル） */
.switch {
  @apply relative inline-flex h-[31px] w-[51px];
  @apply bg-gray-300 rounded-full;
  @apply transition-colors duration-200;
  @apply cursor-pointer;
}

.switch-checked {
  @apply bg-coral-500;
}

.switch-thumb {
  @apply absolute top-[2px] left-[2px];
  @apply h-[27px] w-[27px] bg-white rounded-full;
  @apply shadow-elevation-2;
  @apply transition-transform duration-200;
}

.switch-checked .switch-thumb {
  @apply translate-x-[20px];
}
```

### ナビゲーション（iOS風）
```css
/* ナビゲーションバー */
.navbar {
  @apply glass-effect;
  @apply border-b border-system-separator;
  @apply px-5 py-3;
}

.navbar-title {
  @apply text-[17px] font-semibold tracking-[-0.408px];
  @apply text-center;
}

/* タブバー（iOS風） */
.tabbar {
  @apply glass-effect;
  @apply border-t border-system-separator;
  @apply flex justify-around items-center;
  @apply px-2 py-2 safe-area-inset;
}

.tabbar-item {
  @apply flex-1 flex flex-col items-center;
  @apply py-1 px-2;
  @apply text-[10px] tracking-[0.12px];
  @apply text-system-secondary-label;
  @apply transition-all duration-150;
}

.tabbar-item-active {
  @apply text-coral-500;
}
```

### モーダル・シート（iOS風）
```css
/* モーダル背景 */
.modal-backdrop {
  @apply fixed inset-0 bg-black/40;
  @apply backdrop-blur-sm;
  @apply z-40;
}

/* ボトムシート（iOS風） */
.sheet {
  @apply fixed bottom-0 left-0 right-0;
  @apply bg-white rounded-t-2xl;
  @apply shadow-elevation-5;
  @apply z-50;
  @apply safe-area-inset;
  
  /* スワイプハンドル */
  &::before {
    @apply content-[''] absolute top-2 left-1/2 -translate-x-1/2;
    @apply w-9 h-1 bg-system-tertiary-label rounded-full;
  }
}

/* アラート（iOS風） */
.alert {
  @apply glass-effect rounded-xl;
  @apply p-5 max-w-[270px] mx-auto;
  @apply text-center;
}

.alert-title {
  @apply text-[17px] font-semibold tracking-[-0.408px];
  @apply mb-1;
}

.alert-message {
  @apply text-[13px] tracking-[-0.078px];
  @apply text-system-secondary-label;
  @apply mb-4;
}
```

## ⚡ アニメーション

### トランジション（iOS風の自然な動き）
```css
/* Easing Functions (iOS風) */
.ease-ios-default { 
  transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.ease-ios-in-out { 
  transition-timing-function: cubic-bezier(0.42, 0, 0.58, 1);
}
.ease-ios-out { 
  transition-timing-function: cubic-bezier(0.19, 0.91, 0.38, 1);
}

/* Duration */
.duration-ios-fast { transition-duration: 150ms; }
.duration-ios-base { transition-duration: 250ms; }
.duration-ios-slow { transition-duration: 350ms; }

/* スプリングアニメーション風 */
@keyframes spring-scale {
  0% { transform: scale(1); }
  30% { transform: scale(1.05); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.animate-spring {
  animation: spring-scale 0.3s ease-ios-default;
}
```

## ♿ アクセシビリティ

### Dynamic Type対応
```css
/* テキストサイズの自動調整 */
@supports (font: -apple-system-body) {
  .dynamic-type {
    font: -apple-system-body;
  }
}

/* 最小・最大サイズの制限 */
.text-scalable {
  font-size: clamp(14px, 4vw, 20px);
  line-height: 1.5;
}
```

### ハイコントラストモード
```css
@media (prefers-contrast: high) {
  .btn-primary {
    @apply bg-black text-white border-2 border-white;
  }
  
  .card {
    @apply border-2 border-black;
  }
}
```

### モーション設定
```css
/* 動きを減らす設定 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 🎯 実装例

### 完全なカードコンポーネント
```html
<!-- ホテルカード（統合デザイン） -->
<div class="card card-interactive p-5 space-y-4">
  <!-- ヘッダー -->
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h3 class="headline text-system-label">ヒルトン東京</h3>
      <p class="footnote text-system-secondary-label mt-1">
        新宿区西新宿6-6-2
      </p>
    </div>
    <span class="px-3 py-1 bg-teal-500/10 text-teal-700 
                 rounded-full caption-1 font-medium">
      ホテル
    </span>
  </div>
  
  <!-- 画像 -->
  <div class="relative -mx-5 px-5">
    <img src="/hotel.jpg" 
         class="w-full h-48 object-cover rounded-lg" 
         alt="ヒルトン東京">
    <div class="absolute top-3 right-3">
      <button class="glass-effect rounded-full p-2">
        <svg class="w-5 h-5 text-coral-500">
          <!-- heart icon -->
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 詳細情報 -->
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="flex items-center">
        <svg class="w-4 h-4 text-sunshine-500">
          <!-- star icon -->
        </svg>
        <span class="subheadline ml-1">4.5</span>
      </div>
      <span class="footnote text-system-tertiary-label">
        (234件のレビュー)
      </span>
    </div>
    <span class="headline font-semibold text-system-label">
      ¥15,000
      <span class="caption-1 text-system-secondary-label">/泊</span>
    </span>
  </div>
  
  <!-- アクション -->
  <div class="flex space-x-2 pt-2">
    <button class="btn-primary flex-1">
      予約する
    </button>
    <button class="btn-secondary px-4">
      <svg class="w-5 h-5">
        <!-- share icon -->
      </svg>
    </button>
  </div>
</div>
```

### ボトムシートの実装例
```html
<!-- iOS風ボトムシート -->
<div class="modal-backdrop"></div>
<div class="sheet">
  <div class="p-5 space-y-4">
    <h2 class="title-3 text-center">フィルター</h2>
    
    <!-- 価格帯 -->
    <div class="space-y-2">
      <label class="headline">価格帯</label>
      <div class="flex space-x-2">
        <input type="text" class="input flex-1" placeholder="最低価格">
        <span class="subheadline self-center">〜</span>
        <input type="text" class="input flex-1" placeholder="最高価格">
      </div>
    </div>
    
    <!-- カテゴリー -->
    <div class="space-y-2">
      <label class="headline">カテゴリー</label>
      <div class="card-list">
        <label class="card-list-item">
          <span class="body">ホテル</span>
          <input type="checkbox" class="checkbox">
        </label>
        <label class="card-list-item">
          <span class="body">レストラン</span>
          <input type="checkbox" class="checkbox">
        </label>
        <label class="card-list-item">
          <span class="body">アクティビティ</span>
          <input type="checkbox" class="checkbox">
        </label>
      </div>
    </div>
    
    <!-- アクションボタン -->
    <div class="flex space-x-2 pt-4">
      <button class="btn-secondary flex-1">
        リセット
      </button>
      <button class="btn-primary flex-1">
        適用
      </button>
    </div>
  </div>
</div>
```

## 📋 デザイントークン一覧

### カラートークン
| トークン名 | 値 | 用途 |
|---------|-----|-----|
| coral-500 | #FF6B6B | プライマリアクション |
| teal-500 | #4ECDC4 | セカンダリアクション |
| system-label | rgba(0,0,0,0.85) | メインテキスト |
| system-secondary-label | rgba(0,0,0,0.5) | サブテキスト |

### スペーシングトークン
| トークン名 | 値 | 用途 |
|---------|-----|-----|
| spacing-1 | 4px | 最小間隔 |
| spacing-4 | 16px | 標準間隔 |
| spacing-8 | 32px | セクション間隔 |

### 角丸トークン
| トークン名 | 値 | 用途 |
|---------|-----|-----|
| rounded-md | 8px | インプット |
| rounded-lg | 12px | カード |
| rounded-xl | 16px | モーダル |

### シャドウトークン
| トークン名 | 値 | 用途 |
|---------|-----|-----|
| elevation-1 | 0 1px 2px rgba(0,0,0,0.04) | 最小標高 |
| elevation-2 | 0 2px 8px rgba(0,0,0,0.04) | カード標準 |
| elevation-3 | 0 5px 10px rgba(0,0,0,0.08) | ホバー時 |

## 🚀 実装ガイドライン

1. **コンポーネントの優先順位**
   - 基本コンポーネントから実装（ボタン、カード、フォーム）
   - 複雑なコンポーネントは基本コンポーネントを組み合わせて構築

2. **レスポンシブ対応**
   - モバイルファーストで設計
   - タッチ操作を前提としたインタラクション設計
   - 最小タッチターゲットは44px

3. **パフォーマンス最適化**
   - 不要なアニメーションは避ける
   - GPU アクセラレーションを活用（transform, opacity）
   - 画像は適切なフォーマットと圧縮を使用

4. **アクセシビリティチェックリスト**
   - [ ] カラーコントラスト比 4.5:1 以上
   - [ ] キーボードナビゲーション対応
   - [ ] スクリーンリーダー対応
   - [ ] フォーカスインジケーターの明確化
   - [ ] モーション設定の尊重

この統合デザインシステムにより、Apple の洗練されたUIと旅行アプリの楽しさを両立させた、高品質なユーザー体験を実現できます。

---

## 🆕 デザインルール追記（2024年追加）

### プラン名・日程選択UIパターン

今回のプラン名ボタンとモーダル実装で確立した新しいデザインパターンを記録します。

#### 分離された操作UI
```css
/* 複数の操作を含むコンポーネントの設計原則 */
.multi-action-container {
  /* メインコンテナは操作不可、子要素のみ操作可能 */
  @apply pointer-events-none;
}

.multi-action-container > .action-element {
  /* 個別の操作要素のみポインターイベントを有効化 */
  @apply pointer-events-auto;
}

/* プラン名部分：テキストボタンスタイル */
.text-action-button {
  @apply hover:text-coral-500 transition-colors duration-150;
  @apply focus:outline-none focus:text-coral-500;
  @apply cursor-pointer select-none;
}

/* アイコンボタン：マイクロインタラクション */
.icon-action-button {
  @apply hover:scale-110 hover:text-coral-600;
  @apply transition-all duration-150 ease-ios-default;
  @apply focus:outline-none focus:scale-110;
  @apply cursor-pointer;
}
```

#### 日付バッジデザイン
```css
/* 階層的な情報表示バッジ */
.date-badge {
  @apply bg-coral-500/10 text-coral-600 px-3 py-1 rounded-full;
  @apply text-[14px] font-medium tracking-[-0.24px];
  @apply border border-coral-500/20;
}

.date-badge .year {
  @apply text-system-secondary-label text-[12px] mr-1;
}

.date-badge .date-range {
  @apply text-coral-600 font-semibold;
}
```

#### モーダルヘッダーパターン
```css
/* アイコン付きモーダルヘッダー */
.modal-header {
  @apply flex items-center space-x-3;
}

.modal-header-icon {
  @apply w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center;
}

.modal-header-icon svg {
  @apply w-4 h-4 text-coral-500;
}

.modal-header-title {
  @apply headline text-system-label;
}
```

#### カレンダーUIパターン
```css
/* 日本語対応カレンダー */
.calendar-grid {
  @apply grid grid-cols-7 gap-1;
}

.calendar-day-header {
  @apply text-center py-2;
  @apply caption-1 text-system-secondary-label font-medium;
}

.calendar-day-button {
  @apply w-full aspect-square flex items-center justify-center rounded-lg;
  @apply text-[15px] font-medium transition-all duration-150;
}

/* 日付の状態別スタイル */
.calendar-day-selected {
  @apply bg-coral-500 text-white shadow-elevation-2;
}

.calendar-day-in-range {
  @apply bg-coral-500/20 text-coral-600;
}

.calendar-day-available {
  @apply hover:bg-gray-100 text-system-label;
}

.calendar-day-disabled {
  @apply opacity-40 cursor-not-allowed;
}
```

#### 範囲選択フィードバック
```css
/* 選択状況表示パネル */
.selection-feedback {
  @apply bg-coral-500/10 rounded-lg p-3 border border-coral-500/20;
}

.selection-feedback-item {
  @apply flex items-center justify-between text-sm;
}

.selection-feedback-label {
  @apply text-system-secondary-label;
}

.selection-feedback-value {
  @apply text-coral-600 font-semibold;
}
```

#### リアルタイム検証UI
```css
/* 入力検証とフィードバック */
.input-with-validation {
  @apply space-y-3;
}

.input-counter {
  @apply text-right;
  @apply caption-1 text-system-tertiary-label;
}

.validation-button {
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-opacity duration-150;
}
```

#### モーダルアニメーション（追加）
```css
/* カスタムモーダルアニメーション */
@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-zoom-in {
  from { 
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-modal-fade-in {
  animation: modal-fade-in 0.2s cubic-bezier(0.19, 0.91, 0.38, 1);
}

.animate-modal-zoom-in {
  animation: modal-zoom-in 0.3s cubic-bezier(0.19, 0.91, 0.38, 1);
}
```

### 実装例

#### 分離操作UI実装例
```tsx
// プラン名と日程の分離された操作
<div className="glass-effect rounded-xl px-6 py-3 pointer-events-none">
  <div className="flex flex-col items-center space-y-1">
    {/* プラン名 - 個別クリック */}
    <button 
      className="text-action-button pointer-events-auto"
      onClick={handleNameEdit}
    >
      {planName}
    </button>
    
    {/* 日程 - 個別操作 */}
    <div className="flex items-center space-x-2 pointer-events-auto">
      <button 
        className="icon-action-button"
        onClick={handleDateEdit}
      >
        <CalendarIcon />
      </button>
      <div className="date-badge pointer-events-none">
        <span className="year">{year}</span>
        <span className="date-range">{dateRange}</span>
      </div>
    </div>
  </div>
</div>
```

#### カレンダーモーダル実装例
```tsx
// 範囲選択カレンダー
<div className="calendar-grid">
  {days.map((date) => (
    <button
      className={`calendar-day-button ${getDateState(date)}`}
      onClick={() => handleDateSelect(date)}
      disabled={isPastDate(date)}
    >
      {date.getDate()}
    </button>
  ))}
</div>

{/* 選択フィードバック */}
<div className="selection-feedback">
  <div className="selection-feedback-item">
    <span className="selection-feedback-label">出発日:</span>
    <span className="selection-feedback-value">{startDate}</span>
  </div>
</div>
```

### デザイン原則（追加）

1. **操作の分離**
   - 単一のコンポーネント内でも操作を明確に分離
   - 各操作に適切な視覚的フィードバックを提供

2. **階層的な情報表示**
   - 主要情報と補助情報を視覚的に区別
   - フォントサイズ、色、配置で情報の重要度を表現

3. **マイクロインタラクション**
   - ホバー、フォーカス、アクティブ状態に適切なフィードバック
   - Apple風のスムーズなアニメーション

4. **直感的な操作性**
   - アイコンと機能の関連性を明確に
   - 操作可能な要素であることを視覚的に示す

これらのパターンは今後のUI開発において標準として使用し、一貫性のあるユーザー体験を提供します。