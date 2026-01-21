/**
 * Phase 3: エラーメッセージマッピング
 * ErrorCode → 日本語ユーザー向けメッセージ
 */

import {
  PlanErrorCode,
  PlaceErrorCode,
  RouteErrorCode,
  SyncErrorCode,
  MapErrorCode,
  AuthErrorCode,
  NetworkErrorCode,
  type ErrorCode,
} from "./ErrorCode";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ========== Plan ドメイン ==========
  [PlanErrorCode.PLAN_NOT_FOUND]:
    "プランが見つかりませんでした。削除された可能性があります。",
  [PlanErrorCode.PLAN_LOAD_FAILED]:
    "プランの読み込みに失敗しました。ネットワーク接続を確認してください。",
  [PlanErrorCode.PLAN_SAVE_FAILED]:
    "保存に失敗しました。しばらく経ってから再度お試しください。",
  [PlanErrorCode.PLAN_DELETE_FAILED]:
    "プランの削除に失敗しました。しばらく経ってから再度お試しください。",
  [PlanErrorCode.PLAN_SWITCH_FAILED]:
    "プランの切り替えに失敗しました。ページを再読み込みしてください。",
  [PlanErrorCode.PLAN_PERMISSION_DENIED]:
    "このプランにアクセスする権限がありません。",
  [PlanErrorCode.PLAN_QUOTA_EXCEEDED]:
    "プランの作成上限に達しました。不要なプランを削除してください。",
  [PlanErrorCode.PLAN_VALIDATION_FAILED]:
    "プランの内容が正しくありません。入力内容を確認してください。",

  // ========== Place ドメイン ==========
  [PlaceErrorCode.PLACE_NOT_FOUND]:
    "場所が見つかりませんでした。削除された可能性があります。",
  [PlaceErrorCode.PLACE_ADD_FAILED]:
    "場所の追加に失敗しました。しばらく経ってから再度お試しください。",
  [PlaceErrorCode.PLACE_UPDATE_FAILED]:
    "場所の更新に失敗しました。しばらく経ってから再度お試しください。",
  [PlaceErrorCode.PLACE_DELETE_FAILED]:
    "場所の削除に失敗しました。しばらく経ってから再度お試しください。",
  [PlaceErrorCode.PLACE_DUPLICATE]: "この場所は既にプランに追加されています。",
  [PlaceErrorCode.PLACE_LIMIT_EXCEEDED]:
    "プランに追加できる場所の上限に達しました。",
  [PlaceErrorCode.PLACE_INVALID_COORDINATES]:
    "無効な位置情報です。地図上の別の場所を選択してください。",

  // ========== Route ドメイン ==========
  [RouteErrorCode.ROUTE_CALCULATION_FAILED]:
    "ルート計算に失敗しました。しばらく経ってから再度お試しください。",
  [RouteErrorCode.ROUTE_NO_RESULT]:
    "ルートが見つかりませんでした。出発地または目的地を変更してください。",
  [RouteErrorCode.ROUTE_QUOTA_EXCEEDED]:
    "ルート検索の利用制限に達しました。しばらく経ってから再度お試しください。",
  [RouteErrorCode.ROUTE_INVALID_REQUEST]:
    "ルート検索リクエストが無効です。場所の選択を確認してください。",
  [RouteErrorCode.ROUTE_ZERO_RESULTS]:
    "指定された経路が見つかりませんでした。出発地または目的地を変更してください。",

  // ========== Sync ドメイン ==========
  [SyncErrorCode.SYNC_CONNECTION_LOST]:
    "接続が切断されました。自動的に再接続を試みています。",
  [SyncErrorCode.SYNC_CONFLICT]:
    "他のユーザーによる変更と競合しました。最新の状態を確認してください。",
  [SyncErrorCode.SYNC_TIMEOUT]:
    "同期がタイムアウトしました。ネットワーク接続を確認してください。",
  [SyncErrorCode.SYNC_VERSION_MISMATCH]:
    "データのバージョンが一致しません。ページを再読み込みしてください。",
  [SyncErrorCode.SYNC_PERMISSION_DENIED]:
    "同期する権限がありません。ログイン状態を確認してください。",
  [SyncErrorCode.SYNC_QUOTA_EXCEEDED]:
    "同期の頻度制限に達しました。しばらく経ってから再度お試しください。",

  // ========== Map ドメイン ==========
  [MapErrorCode.MAP_LOAD_FAILED]:
    "地図の読み込みに失敗しました。ページを再読み込みしてください。",
  [MapErrorCode.MAP_API_ERROR]:
    "地図APIでエラーが発生しました。しばらく経ってから再度お試しください。",
  [MapErrorCode.MAP_GEOCODE_FAILED]:
    "住所から位置情報の取得に失敗しました。住所を確認してください。",
  [MapErrorCode.MAP_OVERLAY_RENDER_FAILED]:
    "地図上の描画に失敗しました。ページを再読み込みしてください。",
  [MapErrorCode.MAP_INTERACTION_BLOCKED]:
    "地図の操作がブロックされました。しばらく経ってから再度お試しください。",

  // ========== Auth ドメイン ==========
  [AuthErrorCode.AUTH_UNAUTHENTICATED]:
    "ログインが必要です。ログインしてください。",
  [AuthErrorCode.AUTH_SESSION_EXPIRED]:
    "セッションが期限切れです。再度ログインしてください。",
  [AuthErrorCode.AUTH_PERMISSION_DENIED]:
    "この操作を実行する権限がありません。",

  // ========== Network ==========
  [NetworkErrorCode.NETWORK_OFFLINE]:
    "インターネットに接続されていません。接続を確認してください。",
  [NetworkErrorCode.NETWORK_TIMEOUT]:
    "通信がタイムアウトしました。ネットワーク接続を確認してください。",
  [NetworkErrorCode.NETWORK_SERVER_ERROR]:
    "サーバーエラーが発生しました。しばらく経ってから再度お試しください。",
  [NetworkErrorCode.NETWORK_RATE_LIMITED]:
    "リクエスト制限に達しました。しばらく経ってから再度お試しください。",
};

/**
 * エラーコードからユーザー向けメッセージを取得
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || "予期しないエラーが発生しました。";
}
