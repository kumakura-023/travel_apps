/**
 * 依存性注入コンテナ
 * 疎結合な設計を実現し、テスタビリティとモジュール性を向上
 */

import { MapService } from '../interfaces/MapService';
import { PlaceService } from '../interfaces/PlaceService';
import { PlaceRepository } from '../interfaces/PlaceRepository';
import { GoogleMapsServiceAdapter } from '../adapters/GoogleMapsServiceAdapter';
import { ZustandPlaceRepositoryAdapter } from '../adapters/ZustandPlaceRepositoryAdapter';

// サービスの識別子
export const SERVICE_IDENTIFIERS = {
  MAP_SERVICE: Symbol('MapService'),
  PLACE_SERVICE: Symbol('PlaceService'),
  PLACE_REPOSITORY: Symbol('PlaceRepository'),
} as const;

type ServiceIdentifier = typeof SERVICE_IDENTIFIERS[keyof typeof SERVICE_IDENTIFIERS];

/**
 * サービスコンテナのインターフェース
 */
export interface Container {
  register<T>(identifier: symbol, factory: () => T): void;
  registerSingleton<T>(identifier: symbol, factory: () => T): void;
  get<T>(identifier: symbol): T;
  has(identifier: symbol): boolean;
  clear(): void;
}

/**
 * シンプルな依存性注入コンテナの実装
 */
export class ServiceContainer implements Container {
  private services = new Map<symbol, any>();
  private factories = new Map<symbol, () => any>();
  private singletons = new Set<symbol>();

  register<T>(identifier: symbol, factory: () => T): void {
    this.factories.set(identifier, factory);
    this.singletons.delete(identifier);
  }

  registerSingleton<T>(identifier: symbol, factory: () => T): void {
    this.factories.set(identifier, factory);
    this.singletons.add(identifier);
  }

  get<T>(identifier: symbol): T {
    // シングルトンの場合、既に作成済みならそれを返す
    if (this.singletons.has(identifier) && this.services.has(identifier)) {
      return this.services.get(identifier);
    }

    const factory = this.factories.get(identifier);
    if (!factory) {
      throw new Error(`Service not registered: ${identifier.toString()}`);
    }

    const service = factory();

    // シングルトンの場合はキャッシュ
    if (this.singletons.has(identifier)) {
      this.services.set(identifier, service);
    }

    return service;
  }

  has(identifier: symbol): boolean {
    return this.factories.has(identifier);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }
}

/**
 * アプリケーション全体で使用するサービスコンテナのインスタンス
 */
export const container = new ServiceContainer();

/**
 * デフォルトサービスの登録
 */
export function registerDefaultServices(): void {
  // PlaceRepositoryをシングルトンとして登録
  container.registerSingleton(
    SERVICE_IDENTIFIERS.PLACE_REPOSITORY,
    () => new ZustandPlaceRepositoryAdapter()
  );

  // MapServiceは地図インスタンスが必要なため、
  // useGoogleMapsフック内で動的に登録される
}

/**
 * 地図サービスの動的登録（地図インスタンス取得後）
 */
export function registerMapService(mapInstance: google.maps.Map): void {
  container.register(
    SERVICE_IDENTIFIERS.MAP_SERVICE,
    () => new GoogleMapsServiceAdapter(mapInstance)
  );
}

/**
 * サービス取得のヘルパー関数
 */
export function getPlaceRepository(): PlaceRepository {
  return container.get<PlaceRepository>(SERVICE_IDENTIFIERS.PLACE_REPOSITORY);
}

export function getMapService(): MapService {
  return container.get<MapService>(SERVICE_IDENTIFIERS.MAP_SERVICE);
}

export function getPlaceService(): PlaceService {
  return container.get<PlaceService>(SERVICE_IDENTIFIERS.PLACE_SERVICE);
}

/**
 * 開発・テスト用のモックサービス登録
 */
export function registerMockServices(): void {
  // モック実装の例
  container.register(
    SERVICE_IDENTIFIERS.MAP_SERVICE,
    () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      panTo: () => {},
      getZoom: () => 14,
      setZoom: () => {},
      isLoaded: () => true,
      getCenter: () => ({ lat: 35.681236, lng: 139.767125 }),
      setCenter: () => {},
    }) as MapService
  );

  container.register(
    SERVICE_IDENTIFIERS.PLACE_SERVICE,
    () => ({
      searchPlaces: async () => [],
      getPlaceDetails: async () => null,
      getAutocompleteSuggestions: async () => [],
      searchNearbyPlaces: async () => [],
    }) as PlaceService
  );
}

// アプリケーション起動時にデフォルトサービスを登録
registerDefaultServices(); 