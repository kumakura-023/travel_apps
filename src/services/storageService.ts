import { v4 as uuidv4 } from 'uuid';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

const STORAGE_KEY_PREFIX = 'travel_plan_';
const ACTIVE_PLAN_KEY = 'active_plan_id';

/**
 * 保存済みプランのキーを返す
 */
function getPlanStorageKey(id: string) {
  return `${STORAGE_KEY_PREFIX}${id}`;
}

/**
 * 新しい空のプランを作成
 */
export function createEmptyPlan(name: string = '新しいプラン'): TravelPlan {
  const now = new Date();
  return {
    id: uuidv4(),
    name,
    description: '',
    places: [],
    labels: [],
    totalCost: 0,
    startDate: now,
    endDate: now,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}

/**
 * プランを保存（作成 or 更新）
 */
export function savePlan(plan: TravelPlan) {
  const payload = serializePlan({ ...plan, updatedAt: new Date() });
  localStorage.setItem(getPlanStorageKey(plan.id), payload);
  // アクティブプランとして記録
  localStorage.setItem(ACTIVE_PLAN_KEY, plan.id);
}

/**
 * 指定IDのプランを取得
 */
export function loadPlan(id: string): TravelPlan | null {
  const raw = localStorage.getItem(getPlanStorageKey(id));
  if (!raw) return null;
  try {
    return deserializePlan(raw);
  } catch (e) {
    console.error('プランの読み込みに失敗しました', e);
    return null;
  }
}

/**
 * すべてのプランを取得
 */
export function getAllPlans(): TravelPlan[] {
  const plans: TravelPlan[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const plan = deserializePlan(raw);
      plans.push(plan);
    } catch (e) {
      console.warn('プランのデシリアライズに失敗', e);
    }
  }
  // 作成日の降順
  return plans.sort((a, b) => (b.createdAt.getTime() - a.createdAt.getTime()));
}

/**
 * プランを削除
 */
export function deletePlan(id: string) {
  localStorage.removeItem(getPlanStorageKey(id));
  const activeId = localStorage.getItem(ACTIVE_PLAN_KEY);
  if (activeId === id) {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  }
}

/**
 * プランを複製
 */
export function duplicatePlan(sourceId: string, newName?: string): TravelPlan | null {
  const source = loadPlan(sourceId);
  if (!source) return null;
  const copy: TravelPlan = {
    ...source,
    id: uuidv4(),
    name: newName ?? `${source.name}_コピー`,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: false,
  };
  savePlan(copy);
  return copy;
}

/**
 * アクティブプランIDを取得
 */
export function getActivePlanId(): string | null {
  return localStorage.getItem(ACTIVE_PLAN_KEY);
}

/**
 * アクティブプランを取得
 */
export function getActivePlan(): TravelPlan | null {
  const id = getActivePlanId();
  if (!id) return null;
  return loadPlan(id);
}

/**
 * アクティブプランを設定
 */
export function setActivePlan(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_PLAN_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  }
}

/**
 * Cloud / Local を切り替えてプランを保存
 */
export async function savePlanHybrid(
  plan: TravelPlan,
  options: { mode: 'cloud' | 'local'; uid?: string }
) {
  if (options.mode === 'cloud') {
    if (!options.uid) throw new Error('uid is required for cloud save');
    const { savePlanCloud } = await import('./planCloudService');
    return savePlanCloud(options.uid, plan);
  }
  return savePlan(plan);
}

/**
 * Cloud / Local からアクティブプランを取得
 */
export async function loadActivePlanHybrid(
  options: { mode: 'cloud' | 'local'; uid?: string }
): Promise<TravelPlan | null> {
  if (options.mode === 'cloud') {
    if (!options.uid) throw new Error('uid is required for cloud load');
    const { loadActivePlan } = await import('./planCloudService');
    return loadActivePlan(options.uid);
  }
  return getActivePlan();
} 