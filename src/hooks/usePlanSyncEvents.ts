import { useEffect } from 'react';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanStore } from '../store/planStore';
import { TravelPlan } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';

export function usePlanSyncEvents(
  plan: TravelPlan | null,
  saveImmediately: (plan: TravelPlan) => void,
  saveImmediatelyCloud: (plan: TravelPlan) => void
) {
  useEffect(() => {
    const { setOnPlaceAdded } = usePlacesStore.getState();
    setOnPlaceAdded((newPlace) => {
      if (import.meta.env.DEV) {
        console.log('🚀 候補地追加検知、即座同期開始:', newPlace.name);
      }
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: [...currentPlan.places, newPlace],
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'place_added',
        placeName: newPlace.name,
        placeId: newPlace.id,
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  useEffect(() => {
    const { setOnPlaceDeleted } = usePlacesStore.getState();
    setOnPlaceDeleted((updatedPlaces) => {
      if (import.meta.env.DEV) {
        console.log('🗑️ 候補地削除検知、即座同期開始:');
      }
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: updatedPlaces,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'place_deleted',
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  useEffect(() => {
    const { setOnLabelAdded } = useLabelsStore.getState();
    setOnLabelAdded((newLabel) => {
      if (import.meta.env.DEV) {
        console.log('📝 ラベル追加検知（ローカルのみ）:', newLabel.text);
      }
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: [...currentPlan.labels, newLabel],
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
      }
    });
  }, []);

  useEffect(() => {
    const { setOnLabelUpdated } = useLabelsStore.getState();
    setOnLabelUpdated((updatedLabel, updatedLabels) => {
      if (import.meta.env.DEV) {
        console.log('📝 ラベル更新検知、同期開始:', updatedLabel);
      }
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: updatedLabels,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        if (updatedLabel.status === 'synced') {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  useEffect(() => {
    const { setOnLabelDeleted } = useLabelsStore.getState();
    setOnLabelDeleted((updatedLabels) => {
      if (import.meta.env.DEV) {
        console.log('🗑️ ラベル削除検知、即座同期開始:');
      }
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: updatedLabels,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        saveImmediately(planToSave);
        saveImmediatelyCloud(planToSave);
      }
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'label_deleted',
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);
}
