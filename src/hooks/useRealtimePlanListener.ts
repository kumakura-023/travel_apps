import { useEffect } from 'react';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { syncDebugUtils } from '../utils/syncDebugUtils';

export function useRealtimePlanListener(
  user: any,
  isInitializing: boolean,
  lastCloudSaveTimestamp: number | null,
  setIsRemoteUpdateInProgress: (flag: boolean) => void,
  onSelfUpdateFlag?: () => boolean // 自己更新フラグを取得するコールバック
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
        
        // フラグベースの自己更新判定（タイムスタンプ差による判定を廃止）
        const isSelfUpdate = onSelfUpdateFlag ? onSelfUpdateFlag() : false;
        
        // フォールバック: フラグが無い場合は既存のタイムスタンプ判定を使用（より厳格化）
        let fallbackSelfUpdate = false;
        if (!onSelfUpdateFlag && lastCloudSaveTimestamp) {
          const currentCloudSaveTimestamp = lastCloudSaveTimestamp || 0;
          const timeDiff = Math.abs(remoteTimestamp - currentCloudSaveTimestamp);
          // 自己更新判定をさらに厳格化（500ms以内のみ）
          fallbackSelfUpdate = timeDiff < 500;
        }
        
        const finalIsSelfUpdate = isSelfUpdate || fallbackSelfUpdate;

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
            lastCloudSaveTimestamp,
            isSelfUpdateFlag: isSelfUpdate,
            fallbackSelfUpdate,
            finalIsSelfUpdate,
            remotePlaces: updated.places.length,
            remoteLabels: updated.labels.length,
            localPlaces: usePlanStore.getState().plan?.places.length || 0,
            localLabels: usePlanStore.getState().plan?.labels.length || 0
          });
        }

        if (finalIsSelfUpdate) {
          syncDebugUtils.log('ignore', {
            reason: '自己更新',
            remoteTimestamp,
            cloudSaveTimestamp: lastCloudSaveTimestamp || 0,
            flagBased: isSelfUpdate,
            fallbackBased: fallbackSelfUpdate
          });
          if (import.meta.env.DEV) {
            console.log('🔄 自己更新のため無視 (flag:', isSelfUpdate, ', fallback:', fallbackSelfUpdate, ')');
          }
          return;
        }

        syncDebugUtils.log('receive', {
          remoteTimestamp,
          cloudSaveTimestamp: lastCloudSaveTimestamp || 0,
          flagBased: isSelfUpdate,
          fallbackBased: fallbackSelfUpdate,
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
            // リモート更新完了後、少し長めに待機してからフラグをリセット
            setTimeout(() => {
              setIsRemoteUpdateInProgress(false);
              if (import.meta.env.DEV) {
                console.log('🔄 リモート更新完了、自動保存を再開');
              }
            }, 1000); // 300msから1000msに変更
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
