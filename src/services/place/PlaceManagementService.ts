import { Place } from '../../types';
import { PlaceRepository } from '../../interfaces/PlaceRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * 場所データの検証エラー
 */
export class PlaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaceValidationError';
  }
}

/**
 * イベントバスのインターフェース
 */
export interface IEventBus {
  emit(event: string, data?: any): void;
  on(event: string, handler: (data?: any) => void): void;
  off(event: string, handler: (data?: any) => void): void;
}

/**
 * 場所管理サービス
 * ビジネスロジックを管理し、ストアは純粋な状態管理のみに
 */
export class PlaceManagementService {
  constructor(
    private placeRepository: PlaceRepository,
    private eventBus: IEventBus
  ) {}

  /**
   * 場所を追加
   */
  async addPlace(data: Partial<Place>): Promise<Place> {
    // バリデーション
    this.validatePlaceData(data);
    
    // 場所を作成
    const placeData = this.createPlace(data);
    
    // リポジトリに追加
    const place = this.placeRepository.add(placeData);
    
    // 永続化
    await this.placeRepository.save();
    
    // イベントを発行
    this.eventBus.emit('place:added', place);
    
    return place;
  }

  /**
   * 場所を更新
   */
  async updatePlace(id: string, update: Partial<Place>): Promise<Place> {
    // 更新を実行
    const updatedPlace = this.placeRepository.update(id, update);
    
    if (!updatedPlace) {
      throw new Error(`Place not found: ${id}`);
    }
    
    // 永続化
    await this.placeRepository.save();
    
    // イベントを発行
    this.eventBus.emit('place:updated', updatedPlace);
    
    return updatedPlace;
  }

  /**
   * 場所を削除
   */
  async deletePlace(id: string): Promise<void> {
    // 論理削除を実行
    await this.updatePlace(id, { deleted: true });
    
    // イベントを発行
    this.eventBus.emit('place:deleted', { id });
  }

  /**
   * すべての場所を取得
   */
  async getAllPlaces(): Promise<Place[]> {
    return this.placeRepository.getAll();
  }

  /**
   * フィルタリングされた場所を取得（削除されていない場所）
   */
  async getFilteredPlaces(): Promise<Place[]> {
    const places = await this.getAllPlaces();
    return places.filter((p: Place) => !p.deleted);
  }

  /**
   * 場所をクリア
   */
  async clearPlaces(): Promise<void> {
    const places = await this.getAllPlaces();
    
    // すべての場所を論理削除
    for (const place of places) {
      await this.updatePlace(place.id, { deleted: true });
    }
    
    // イベントを発行
    this.eventBus.emit('places:cleared');
  }

  /**
   * 場所データのバリデーション
   */
  private validatePlaceData(data: Partial<Place>): void {
    if (!data.coordinates) {
      throw new PlaceValidationError('Coordinates are required');
    }
    
    if (!data.name || data.name.trim() === '') {
      throw new PlaceValidationError('Name is required');
    }
    
    if (data.coordinates.lat < -90 || data.coordinates.lat > 90) {
      throw new PlaceValidationError('Invalid latitude');
    }
    
    if (data.coordinates.lng < -180 || data.coordinates.lng > 180) {
      throw new PlaceValidationError('Invalid longitude');
    }
  }

  /**
   * 場所を作成
   */
  private createPlace(data: Partial<Place>): Omit<Place, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: data.name || '',
      address: data.address || '',
      coordinates: data.coordinates!,
      category: data.category || 'other',
      memo: data.memo || '',
      estimatedCost: data.estimatedCost || 0,
      photos: data.photos || [],
      labelHidden: data.labelHidden ?? true,
      labelPosition: data.labelPosition || data.coordinates!,
      scheduledDay: data.scheduledDay,
      labelText: data.labelText,
      labelFontSize: data.labelFontSize,
      labelWidth: data.labelWidth,
      labelHeight: data.labelHeight,
      labelColor: data.labelColor,
      labelFontFamily: data.labelFontFamily,
      deleted: data.deleted
    };
  }
}