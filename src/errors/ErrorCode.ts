/**
 * Phase 3: エラーコード定義
 * ドメイン別プレフィックスによる体系的な分類
 */

// ========== Plan ドメイン (P1xxx) ==========
export enum PlanErrorCode {
  PLAN_NOT_FOUND = "P1001",
  PLAN_LOAD_FAILED = "P1002",
  PLAN_SAVE_FAILED = "P1003",
  PLAN_DELETE_FAILED = "P1004",
  PLAN_SWITCH_FAILED = "P1005",
  PLAN_PERMISSION_DENIED = "P1006",
  PLAN_QUOTA_EXCEEDED = "P1007",
  PLAN_VALIDATION_FAILED = "P1008",
}

// ========== Place ドメイン (P2xxx) ==========
export enum PlaceErrorCode {
  PLACE_NOT_FOUND = "P2001",
  PLACE_ADD_FAILED = "P2002",
  PLACE_UPDATE_FAILED = "P2003",
  PLACE_DELETE_FAILED = "P2004",
  PLACE_DUPLICATE = "P2005",
  PLACE_LIMIT_EXCEEDED = "P2006",
  PLACE_INVALID_COORDINATES = "P2007",
}

// ========== Route ドメイン (R1xxx) ==========
export enum RouteErrorCode {
  ROUTE_CALCULATION_FAILED = "R1001",
  ROUTE_NO_RESULT = "R1002",
  ROUTE_QUOTA_EXCEEDED = "R1003",
  ROUTE_INVALID_REQUEST = "R1004",
  ROUTE_ZERO_RESULTS = "R1005",
}

// ========== Sync ドメイン (S1xxx) ==========
export enum SyncErrorCode {
  SYNC_CONNECTION_LOST = "S1001",
  SYNC_CONFLICT = "S1002",
  SYNC_TIMEOUT = "S1003",
  SYNC_VERSION_MISMATCH = "S1004",
  SYNC_PERMISSION_DENIED = "S1005",
  SYNC_QUOTA_EXCEEDED = "S1006",
}

// ========== Map ドメイン (M1xxx) ==========
export enum MapErrorCode {
  MAP_LOAD_FAILED = "M1001",
  MAP_API_ERROR = "M1002",
  MAP_GEOCODE_FAILED = "M1003",
  MAP_OVERLAY_RENDER_FAILED = "M1004",
  MAP_INTERACTION_BLOCKED = "M1005",
}

// ========== Auth ドメイン (A1xxx) ==========
export enum AuthErrorCode {
  AUTH_UNAUTHENTICATED = "A1001",
  AUTH_SESSION_EXPIRED = "A1002",
  AUTH_PERMISSION_DENIED = "A1003",
}

// ========== Network (N1xxx) ==========
export enum NetworkErrorCode {
  NETWORK_OFFLINE = "N1001",
  NETWORK_TIMEOUT = "N1002",
  NETWORK_SERVER_ERROR = "N1003",
  NETWORK_RATE_LIMITED = "N1004",
}

// ========== 統合型定義 ==========
export type ErrorCode =
  | PlanErrorCode
  | PlaceErrorCode
  | RouteErrorCode
  | SyncErrorCode
  | MapErrorCode
  | AuthErrorCode
  | NetworkErrorCode;

// 文字列からの型ガード
export function isErrorCode(code: string): code is ErrorCode {
  return (
    Object.values(PlanErrorCode).includes(code as PlanErrorCode) ||
    Object.values(PlaceErrorCode).includes(code as PlaceErrorCode) ||
    Object.values(RouteErrorCode).includes(code as RouteErrorCode) ||
    Object.values(SyncErrorCode).includes(code as SyncErrorCode) ||
    Object.values(MapErrorCode).includes(code as MapErrorCode) ||
    Object.values(AuthErrorCode).includes(code as AuthErrorCode) ||
    Object.values(NetworkErrorCode).includes(code as NetworkErrorCode)
  );
}
