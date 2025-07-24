import { useEffect } from 'react';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { syncDebugUtils } from '../utils/syncDebugUtils';

export function useRealtimePlanListener(
  user: any,
  isInitializing: boolean,
  lastCloudSaveTimestamp: number | null,
  setIsRemoteUpdateInProgress: (flag: boolean) => void
) {
  const planId = usePlanStore((s) => s.plan?.id);

  useEffect(() => {
    if (isInitializing) return;
    if (!user) return;
    const plan = usePlanStore.getState().plan;
    if (!plan) return;

    let unsub: () => void;
    let lastProcessedTimestamp = 0;
    let processingTimeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const { listenPlan } = await import('../services/planCloudService');
      const { createSyncConflictResolver } = await import('../services/syncConflictResolver');

      const conflictResolver = createSyncConflictResolver();

      unsub = listenPlan(plan.id, (updated) => {
        if (!updated) return;
        const remoteTimestamp = updated.updatedAt.getTime();
        const currentCloudSaveTimestamp = lastCloudSaveTimestamp || 0;
        const timeDiff = Math.abs(remoteTimestamp - currentCloudSaveTimestamp);
        // 自己更新判定を厓格化（1秒以内の差のみ自己更新として認識）
        const isSelfUpdate = timeDiff < 1000;

        // 同じタイムスタンプの重複処理を防止
        if (remoteTimestamp === lastProcessedTimestamp && lastProcessedTimestamp !== 0) {
          if (import.meta.env.DEV) {
            console.log('🔄 同じタイムスタンプのため無視:', remoteTimestamp);
          }
          return;
        }
        
        // リモート更新処理中の場合は新しい更新を無視
        const currentPlan = usePlanStore.getState().plan;
        if (!currentPlan) return;

        if (import.meta.env.DEV) {
          console.log('🔄 Firebase更新を受信:', {
            remoteTimestamp,
            currentCloudSaveTimestamp,
            timeDiff,
            isSelfUpdate,
            remotePlaces: updated.places.length,
            remoteLabels: updated.labels.length,
            localPlaces: usePlanStore.getState().plan?.places.length || 0,
            localLabels: usePlanStore.getState().plan?.labels.length || 0,
            lastCloudSaveTimestampValue: lastCloudSaveTimestamp,
            cloudSaveTimestampRef: 'N/A'
          });
        }

        if (isSelfUpdate) {
          syncDebugUtils.log('ignore', {
            reason: '自己更新',
            remoteTimestamp,
            cloudSaveTimestamp: currentCloudSaveTimestamp,
            timeDiff
          });
          if (import.meta.env.DEV) {
            console.log('🔄 自己更新のため無視');
          }
          return;
        }

        syncDebugUtils.log('receive', {
          remoteTimestamp,
          cloudSaveTimestamp: currentCloudSaveTimestamp,
          timeDiff,
          remotePlaces: updated.places.length,
          remoteLabels: updated.labels.length
        });

        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }

        setIsRemoteUpdateInProgress(true);

        processingTimeout = setTimeout(() => {
          try {
            const currentPlan = usePlanStore.getState().plan;
            if (currentPlan) {
              // データが同じ場合は競合解決をスキップ
              const currentDataHash = JSON.stringify({places: currentPlan.places, labels: currentPlan.labels});
              const remoteDataHash = JSON.stringify({places: updated.places, labels: updated.labels});
              
              if (currentDataHash === remoteDataHash) {
                if (import.meta.env.DEV) {
                  console.log('🔄 データが同じのため競合解決をスキップ');
                }
                return;
              }
              
              const resolvedPlan = conflictResolver.resolveConflict(
                currentPlan,
                updated,
                currentPlan.updatedAt,
                updated.updatedAt
              );

              if (import.meta.env.DEV) {
                console.log('🔄 競合解決完了:', {
                  originalPlaces: currentPlan.places.length,
                  remotePlaces: updated.places.length,
                  resolvedPlaces: resolvedPlan.places.length,
                  originalLabels: currentPlan.labels.length,
                  remoteLabels: updated.labels.length,
                  resolvedLabels: resolvedPlan.labels.length,
                  hasChanges: JSON.stringify(currentPlan) !== JSON.stringify(resolvedPlan)
                });
              }

              syncDebugUtils.log('conflict', {
                originalPlaces: currentPlan.places.length,
                remotePlaces: updated.places.length,
                resolvedPlaces: resolvedPlan.places.length,
                originalLabels: currentPlan.labels.length,
                remoteLabels: updated.labels.length,
                resolvedLabels: resolvedPlan.labels.length,
                hasChanges: JSON.stringify(currentPlan) !== JSON.stringify(resolvedPlan)
              });

              usePlanStore.getState().setPlan(resolvedPlan);
              usePlacesStore.setState({ places: resolvedPlan.places });
              useLabelsStore.setState({ labels: resolvedPlan.labels });
            } else {
              usePlanStore.getState().setPlan(updated);
              usePlacesStore.setState({ places: updated.places });
              useLabelsStore.setState({ labels: updated.labels });
            }

            lastProcessedTimestamp = remoteTimestamp;
          } finally {
            setTimeout(() => {
              setIsRemoteUpdateInProgress(false);
              if (import.meta.env.DEV) {
                console.log('🔄 リモート更新完了、自動保存を再開');
              }
            }, 300);
          }
        }, 100);

      });
    })();

    return () => {
      if (unsub) unsub();
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [user, planId, isInitializing, lastCloudSaveTimestamp, setIsRemoteUpdateInProgress]);
}
