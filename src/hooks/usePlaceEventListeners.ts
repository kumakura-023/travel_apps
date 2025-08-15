import { useEffect, useRef } from 'react';
import { getEventBus } from '../services/ServiceContainer';
import { PlaceEventBus } from '../events/PlaceEvents';
import { usePlanStore } from '../store/planStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { TravelPlan } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';

/**
 * 場所関連のイベントリスナーを設定するフック
 * ストアのコールバックからイベントベースへの移行を支援
 */
export function usePlaceEventListeners(
  saveImmediately: (plan: TravelPlan) => void,
  saveImmediatelyCloud: (plan: TravelPlan) => void,
  saveWithSyncManager?: (plan: TravelPlan, operationType?: 'place_added' | 'place_deleted' | 'place_updated' | 'memo_updated' | 'plan_updated' | 'label_added' | 'label_updated' | 'label_deleted') => void
) {
  const unsubscribersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const eventBus = getEventBus();
    const placeEventBus = new PlaceEventBus(eventBus);

    // 場所追加イベントのリスナー
    const unsubscribeAdd = placeEventBus.onPlaceAdded(({ place, source }) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan && source === 'user') {
        // 重複チェック：プランに既に同じIDの場所が存在するかチェック
        const placeExists = currentPlan.places.some(p => p.id === place.id);
        if (!placeExists) {
          const planToSave: TravelPlan = {
            ...currentPlan,
            places: [...currentPlan.places, place],
            updatedAt: new Date(),
          };
          usePlanStore.getState().setPlan(planToSave);
          
          if (saveWithSyncManager) {
            saveWithSyncManager(planToSave, 'place_added');
          } else {
            saveImmediately(planToSave);
            saveImmediatelyCloud(planToSave);
          }
          
          syncDebugUtils.log('save', {
            type: 'event_based_sync',
            reason: 'place_added',
            placeName: place.name,
            placeId: place.id,
            timestamp: Date.now()
          });
        } else {
          syncDebugUtils.log('ignore', {
            type: 'event_based_sync',
            reason: 'place_already_exists',
            placeName: place.name,
            placeId: place.id,
            timestamp: Date.now()
          });
        }
      }
    });

    // 場所削除イベントのリスナー
    const unsubscribeDelete = placeEventBus.onPlaceDeleted(({ placeId, place, allPlaces }) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: allPlaces,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, 'place_deleted');
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
        
        syncDebugUtils.log('save', {
          type: 'event_based_sync',
          reason: 'place_deleted',
          placeId: placeId,
          timestamp: Date.now()
        });
      }
    });

    // 場所更新イベントのリスナー
    const unsubscribeUpdate = placeEventBus.onPlaceUpdated(({ placeId, place, changes }) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const updatedPlaces = currentPlan.places.map(p => p.id === placeId ? place : p);
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: updatedPlaces,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, 'place_updated');
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
        
        syncDebugUtils.log('save', {
          type: 'event_based_sync',
          reason: 'place_updated',
          placeId: placeId,
          changes: Object.keys(changes),
          timestamp: Date.now()
        });
      }
    });

    // リスナーを配列に追加
    unsubscribersRef.current = [
      unsubscribeAdd,
      unsubscribeDelete,
      unsubscribeUpdate,
    ];

    // クリーンアップ
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, [saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
}