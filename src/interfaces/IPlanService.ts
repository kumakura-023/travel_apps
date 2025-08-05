import { TravelPlan, Place, MapLabel } from '../types';

/**
 * プラン作成データ
 */
export interface PlanData {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * プラン更新データ  
 */
export interface PlanUpdateData {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  places?: Place[];
  labels?: MapLabel[];
  totalCost?: number;
}

/**
 * プランサービスのインターフェース
 * 旅行計画の作成、更新、削除、管理を担当
 */
export interface IPlanService {
  /**
   * 新しいプランを作成
   * @param data プラン作成データ
   * @returns 作成されたプラン
   */
  createPlan(data: PlanData): Promise<TravelPlan>;

  /**
   * プランを更新
   * @param id プランID
   * @param data 更新データ
   * @returns 更新されたプラン
   */
  updatePlan(id: string, data: PlanUpdateData): Promise<TravelPlan>;

  /**
   * プランを削除
   * @param id プランID
   */
  deletePlan(id: string): Promise<void>;

  /**
   * アクティブなプランを設定
   * @param id プランID
   */
  setActivePlan(id: string): Promise<void>;

  /**
   * プランを取得
   * @param id プランID
   * @returns プラン
   */
  getPlan(id: string): Promise<TravelPlan | null>;

  /**
   * すべてのプランを取得
   * @returns プランのリスト
   */
  getAllPlans(): Promise<TravelPlan[]>;

  /**
   * ユーザーのプランを取得
   * @param userId ユーザーID
   * @returns プランのリスト
   */
  getUserPlans(userId: string): Promise<TravelPlan[]>;

  /**
   * プランを複製
   * @param id 複製元のプランID
   * @param newName 新しいプランの名前
   * @returns 複製されたプラン
   */
  duplicatePlan(id: string, newName: string): Promise<TravelPlan>;

  /**
   * プランをエクスポート
   * @param id プランID
   * @returns エクスポートされたプランデータ
   */
  exportPlan(id: string): Promise<string>;

  /**
   * プランをインポート
   * @param data インポートするプランデータ
   * @returns インポートされたプラン
   */
  importPlan(data: string): Promise<TravelPlan>;
}