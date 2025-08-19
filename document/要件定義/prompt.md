📚 技術スタック
React 18 + TypeScript
Vite
Tailwind CSS（PostCSS / autoprefixer）
Zustand（状態管理）
Google Maps JavaScript API
@react-google-maps/api
Directions Service
uuid（ID 生成）
react-icons（アイコン）
✨ 機能の概要
タブナビゲーション
デスクトップ：画面右端中央に縦型のアイコンバー（地図／移動時間／リスト）。
モバイル：画面下部固定の横並びアイコンバー。
アクティブタブは青色で強調表示。
移動時間モード
起点を地図上で指定し、徒歩／車／電車で指定時間内に到達可能な円を描画。
時間範囲：5 – 60 分（5 分刻み）。
Ctrl+クリック（デスクトップ）／長押し（モバイル想定）で 2 地点間ルートと所要時間を表示。
円・ルートは削除 UI で個別に除去可能。
🎯 背景・目的
旅行プランニング時に
「地図上で移動圏を可視化して候補地を絞り込みたい」
「離れた 2 地点間の移動時間を瞬時に確認したい」
というニーズが高かったため、タブ切替式で直感的に利用できる移動時間機能を実装しました。
🧩 コンポーネント設計
コンポーネント 役割 主な Props / Hooks
TabNavigation 地図／移動時間／リストを切替えるレスポンシブタブ active, onChange
TravelTimeControls 起点選択・交通手段選択・時間スライダー UI Zustand store を内部で利用
TravelTimeOverlay 移動時間円・起点マーカー・POI バッジ描画 Zustand store, useGoogleMaps
RouteDisplay 2 地点間ルート＆所要時間バッジ表示、解除ボタン Zustand store, Directions API
AddLabelToggle 既存：ラベル追加モードトグル -
ストア / サービス
store/travelTimeStore.ts：移動時間機能の全状態を保持
services/directionsService.ts：Directions API 呼び出し＋5 分キャッシュ
hooks/useDirections.ts：複数地点の所要時間一括取得フック
✅ できること
起点の指定／再指定
徒歩・車・電車別の到達圏（円）表示
時間範囲スライダーによるリアルタイム更新
Ctrl+クリック（or 長押し）で 2 地点ルートと所要時間を表示
円・ルートのワンクリック削除
移動時間タブ以外に切替えた際の自動クリーンアップ
🚫 制限事項
Directions API の無料枠を超えるとリクエスト失敗
円はあくまで「概算半径」表示（実際の道路距離とは誤差あり）
2 地点同時ルートは 1 ペアのみ（拡張要）
モバイルの長押し選択は未実装（今後 Gesture 対応予定）
⚙️ コンポーネント使用時のオプション
TabNavigation
Prop 型 説明
active 'map' \| 'travelTime' \| 'list' アクティブタブ
onChange (tab) => void タブ変更ハンドラ
TravelTimeControls
内部で Zustand を使用するため外部 Props はなし。
表示位置・z-index は Tailwind クラスで調整可能。
TravelTimeOverlay
Zustand の origin, timeRange, mode を監視
Circle の clickable: false で POI クリックを透過
InfoWindow 内の削除ボタン → setOrigin(null) を呼び円を除去
RouteDisplay
Zustand の routePoints が 2 点揃った時のみ表示。
clearRoutePoints() でリセット。
📂 関連ファイル / ディレクトリ構造
Apply to step4.md
⚠️ 注意点
Directions API キー
.env に VITE_GOOGLE_MAPS_API_KEY を必ず設定し、
libraries=places,directions を有効にすること。
キャッシュとレート制限
directionsService.ts で 5 分 TTL のメモリキャッシュ実装済み。
25 件以上の同時リクエストはカットされるのでバッチ分割を検討。
クリーンアップ
TravelTimeOverlay がアンマウント／起点再設定時に
circle.setMap(null) を忘れるとゴースト円が残る。
必要に応じて useEffect の依存配列を確認。
アクセシビリティ
ボタンには aria-label を付与すること。
キーボード操作（Enter/Space）でも操作できるよう改善余地あり。
拡張ポイント
移動手段の追加（自転車・タクシーなど）
複数起点対応（色分け円）
円内 POI をフィルタリングしてサイドリスト表示
以上が開発・保守向けのドキュメントです。
