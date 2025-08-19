# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 今後追加予定の機能

### Changed

- 今後変更予定の機能

### Fixed

- 今後修正予定のバグ

## [1.1.0] - 2024-12-22

### Changed

- 📱 スマホ版詳細情報パネルのスクロール動作を改善
  - スクロール時の自動全画面表示機能を削除
  - ユーザーの意図的なスワイプ操作でのみ展開/縮小するように変更
  - パネル内コンテンツのスクロールが正常に動作するように修正

### Fixed

- 🚫 プルトゥリフレッシュ機能を無効化
  - 画面を下にスクロールした際の意図しない画面更新を防止
  - `overscroll-behavior: none`をCSSに追加して無効化

### Technical

- UI/UX改善によるMINORバージョンアップ
- モバイルユーザビリティの向上

## [1.0.0] - 2024-12-22

### Added

- 🗺️ Google Maps APIとの統合による地図表示機能
- 📍 地点の登録・編集・削除機能
- 🏷️ 地点へのラベル（付箋）追加機能
- 📋 地点のリスト表示とフィルタリング機能
- 🔍 地点検索機能（名前・カテゴリ別）
- 🚗 地点間のルート検索・表示機能
- ⏱️ 移動時間の計算・表示機能
- 💰 コスト計算機能（交通費・入場料等）
- 📊 コスト分析（円グラフ表示）
- 📱 レスポンシブデザイン（モバイル対応）
- 🎨 Apple風デザインシステムの採用
- 💾 ローカルストレージによるデータ永続化
- 📄 PWA対応（オフライン利用可能）
- ⌨️ キーボードショートカット対応
- 🗂️ 複数の旅行計画管理機能

### Technical Implementation

- **フロントエンド**: React 18 + TypeScript + Vite
- **状態管理**: Zustand
- **マップサービス**: Google Maps API + React Google Maps API
- **スタイリング**: Tailwind CSS
- **アーキテクチャ**: Clean Architecture（インターフェース分離）
- **コンポーネント設計**: 単一責任原則に基づく分割
- **PWA**: Service Worker + Web App Manifest

### Core Components

- `MapContainer`: 地図表示とイベント処理
- `PlaceList`: 地点一覧表示
- `RouteSearchPanel`: ルート検索UI
- `PlaceDetailPanel`: 地点詳細表示
- `PlanManager`: 旅行計画管理
- `CostSummary`: コスト分析表示

### Services & Adapters

- `GoogleMapsServiceAdapter`: Google Maps APIとの連携
- `ZustandPlaceRepositoryAdapter`: 地点データ永続化
- `ServiceContainer`: 依存性注入コンテナ
- `directionsService`: ルート計算サービス
- `storageService`: ローカルストレージ管理

### Store Management

- `placesStore`: 地点データ管理
- `planStore`: 旅行計画データ管理
- `routeSearchStore`: ルート検索状態管理
- `uiStore`: UI状態管理
- `travelTimeStore`: 移動時間データ管理
