import { Place } from '../types';
import { PlaceRepository, PlaceChangeEvent, PlaceRepositoryObserver } from '../interfaces/PlaceRepository';
import { useSavedPlacesStore } from '../store/savedPlacesStore';

/**
 * ZustandストアをPlaceRepositoryインターフェースに適合させるアダプター
 * 依存性の逆転原則を適用し、具象実装を抽象インターフェースでラップ
 */
export class ZustandPlaceRepositoryAdapter implements PlaceRepository, PlaceRepositoryObserver {
  private changeListeners: Set<(event: PlaceChangeEvent) => void> = new Set();

  // 基本CRUD操作
  getAll(): Place[] {
    return useSavedPlacesStore.getState().places;
  }

  getById(id: string): Place | null {
    const places = this.getAll();
    return places.find(p => p.id === id) || null;
  }

  add(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>): Place {
    const store = useSavedPlacesStore.getState();
    store.addPlace(place);
    
    // 追加されたプレースを取得
    const addedPlace = this.getAll().find(p => 
      p.coordinates.lat === place.coordinates.lat && 
      p.coordinates.lng === place.coordinates.lng &&
      p.name === place.name
    );
    
    if (addedPlace) {
      this.notifyChange({ type: 'added', place: addedPlace });
      return addedPlace;
    }
    
    throw new Error('Failed to add place');
  }

  update(id: string, updates: Partial<Place>): Place | null {
    const store = useSavedPlacesStore.getState();
    const existingPlace = this.getById(id);
    
    if (!existingPlace) {
      return null;
    }
    
    store.updatePlace(id, updates);
    const updatedPlace = this.getById(id);
    
    if (updatedPlace) {
      this.notifyChange({ type: 'updated', place: updatedPlace });
    }
    
    return updatedPlace;
  }

  delete(id: string): boolean {
    const store = useSavedPlacesStore.getState();
    const existingPlace = this.getById(id);
    
    if (!existingPlace) {
      return false;
    }
    
    store.deletePlace(id);
    this.notifyChange({ type: 'deleted', id });
    return true;
  }

  // 検索・フィルタリング
  findByCategory(category: string): Place[] {
    return this.getAll().filter(place => place.category === category);
  }

  findByLocation(center: { lat: number; lng: number }, radiusKm: number): Place[] {
    return this.getAll().filter(place => {
      const distance = this.calculateDistance(center, place.coordinates);
      return distance <= radiusKm;
    });
  }

  search(query: string): Place[] {
    const normalizedQuery = query.toLowerCase();
    return this.getAll().filter(place => 
      place.name.toLowerCase().includes(normalizedQuery) ||
      place.address.toLowerCase().includes(normalizedQuery) ||
      (place.memo && place.memo.toLowerCase().includes(normalizedQuery))
    );
  }

  // 一括操作
  addMultiple(places: Array<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>): Place[] {
    const addedPlaces: Place[] = [];
    
    for (const place of places) {
      try {
        const addedPlace = this.add(place);
        addedPlaces.push(addedPlace);
      } catch (error) {
        console.error('Failed to add place:', place, error);
      }
    }
    
    return addedPlaces;
  }

  deleteMultiple(ids: string[]): number {
    let deletedCount = 0;
    
    for (const id of ids) {
      if (this.delete(id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // 永続化（LocalStorageを使用）
  async save(): Promise<void> {
    try {
      const places = this.getAll();
      localStorage.setItem('travel-app-places', JSON.stringify(places));
    } catch (error) {
      console.error('Failed to save places:', error);
      throw error;
    }
  }

  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem('travel-app-places');
      if (stored) {
        const places: Place[] = JSON.parse(stored);
        // 既存のデータをクリアして新しいデータを設定
        this.clear();
        this.addMultiple(places);
      }
    } catch (error) {
      console.error('Failed to load places:', error);
      throw error;
    }
  }

  clear(): void {
    const store = useSavedPlacesStore.getState();
    const allPlaces = this.getAll();
    
    // 全ての地点を削除
    for (const place of allPlaces) {
      store.deletePlace(place.id);
    }
    
    this.notifyChange({ type: 'cleared' });
  }

  // 変更監視
  subscribe(callback: (event: PlaceChangeEvent) => void): () => void {
    this.changeListeners.add(callback);
    
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  unsubscribe(callback: (event: PlaceChangeEvent) => void): void {
    this.changeListeners.delete(callback);
  }

  // プライベートメソッド
  private notifyChange(event: PlaceChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in place change listener:', error);
      }
    });
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // 地球の半径（km）
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLng = this.deg2rad(point2.lng - point1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
} 