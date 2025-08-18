# VoyageSketch プロジェクト概要

## プロジェクトの目的
VoyageSketchは、依存性注入の原則とクリーンアーキテクチャで構築されたReactベースの旅行計画マップアプリケーションです。

## 技術スタック
- フロントエンド: React 18 + TypeScript + Vite
- マッピング: Google Maps JavaScript API
- 状態管理: Zustand stores
- スタイリング: Tailwind CSS
- PWA: vite-plugin-pwa経由のWorkbox
- Firebase: 認証とデータ同期

## 主要なアーキテクチャパターン
1. **依存性注入コンテナ**
   - src/services/ServiceContainer.tsによるコアサービス管理
   - インターフェースベースの設計とアダプターパターン
   
2. **アダプターパターン**
   - GoogleMapsServiceAdapter - Google Maps APIをMapServiceインターフェースでラップ
   - ZustandPlaceRepositoryAdapter - ZustandストアをPlaceRepositoryインターフェースでラップ
   
3. **状態管理**
   - src/store/ディレクトリ内のZustandストア
   - 各ストアが特定のドメインを管理（places、routes、UIステートなど）

## カテゴリシステム
- PlaceCategory型: 'hotel' | 'restaurant' | 'sightseeing' | 'shopping' | 'transport' | 'other'
- 各カテゴリには専用の色、アイコン、絵文字が定義されている
- categoryIcons.tsでカテゴリ関連のユーティリティ関数を提供

## 地図オーバーレイシステム
- MapOverlayManager: 地図上の全てのオーバーレイを管理
- PlaceCircle: 個々の地点のオーバーレイ表示
- PlaceLabel: 地点のラベル表示
- PlaceSimpleOverlay: シンプルなオーバーレイ表示