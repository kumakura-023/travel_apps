import { serializePlan, deserializePlan } from "./planSerializer";
import { TravelPlan } from "../types";

/**
 * プランをURLにエンコードして共有リンクを作成する
 */
export function createShareUrl(plan: TravelPlan): string {
  const json = serializePlan(plan);
  const encoded = encodeURIComponent(btoa(json));
  return `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
}

/**
 * URLからplanクエリを読み込み、TravelPlanを復元する
 */
export function loadPlanFromUrl(): TravelPlan | null {
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get("plan");
  if (!planParam) return null;
  try {
    const json = atob(decodeURIComponent(planParam));
    return deserializePlan(json);
  } catch (e) {
    console.error("URLからのプラン読み込み失敗", e);
    return null;
  }
}
