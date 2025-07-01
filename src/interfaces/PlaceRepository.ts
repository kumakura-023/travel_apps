import { Place } from '../types';

/**
 * 地点データ管理のインターフェース
 * Zustandストアへの依存を抽象化し、実装詳細を隠蔽
 */

export interface PlaceRepository {
  // 基本CRUD操作
  getAll(): Place[];
  getById(id: string): Place | null;
  add(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>): Place;
  update(id: string, updates: Partial<Place>): Place | null;
  delete(id: string): boolean;
  
  // 検索・フィルタリング
  findByCategory(category: string): Place[];
  findByLocation(
    center: { lat: number; lng: number },
    radiusKm: number
  ): Place[];
  search(query: string): Place[];
  
  // 一括操作
  addMultiple(places: Array<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>): Place[];
  deleteMultiple(ids: string[]): number;
  
  // 永続化
  save(): Promise<void>;
  load(): Promise<void>;
  clear(): void;
}

/**
 * 地点リポジトリの設定
 */
export interface PlaceRepositoryConfig {
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';
  autoSave?: boolean;
  maxItems?: number;
}

/**
 * 地点リポジトリの実装ファクトリー
 */
export interface PlaceRepositoryFactory {
  create(config: PlaceRepositoryConfig): PlaceRepository;
}

/**
 * 地点データの変更通知
 */
export interface PlaceChangeEvent {
  type: 'added' | 'updated' | 'deleted' | 'cleared';
  place?: Place;
  places?: Place[];
  id?: string;
  ids?: string[];
}

/**
 * 地点データの変更監視
 */
export interface PlaceRepositoryObserver {
  subscribe(callback: (event: PlaceChangeEvent) => void): () => void;
  unsubscribe(callback: (event: PlaceChangeEvent) => void): void;
} 