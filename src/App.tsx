import { LoadScript } from '@react-google-maps/api';
import * as React from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import PlaceDetailPanel from './components/PlaceDetailPanel';
import TabNavigationWrapper from './components/TabNavigationWrapper';
import { TabKey } from './components/TabNavigation';

import TravelTimeControls from './components/TravelTimeControls';
import SelectionBanner from './components/SelectionBanner';
import TestPlacesButton from './components/TestPlacesButton';
import RouteSearchPanel from './components/RouteSearchPanel';
import Tutorial from './components/Tutorial';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { useRouteSearchStore } from './store/routeSearchStore';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSelectedPlaceStore } from './store/placeStore';
import { useTravelTimeStore } from './store/travelTimeStore';
import PlaceList from './components/PlaceList';
import { loadPlanFromUrl } from './utils/shareUtils';
import { usePlacesStore } from './store/placesStore';
import { useLabelsStore } from './store/labelsStore';
import PlanNameDisplay from './components/PlanNameDisplay';
import { usePlanStore } from './store/planStore';
import { getActivePlan, createEmptyPlan, setActivePlan, loadActivePlanHybrid } from './services/storageService';
import { useAuth } from './hooks/useAuth';
import { useAutoSave } from './hooks/useAutoSave';
import AuthButton from './components/AuthButton';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import SyncTestButton from './components/SyncTestButton';
import SyncDebugButton from './components/SyncDebugButton';
import { syncDebugUtils } from './utils/syncDebugUtils';
import { TravelPlan } from './types';

// LoadScript用のライブラリを定数として定義
const LIBRARIES: ('places')[] = ['places'];

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  
  console.log('App loaded, API Key:', apiKey ? 'Set' : 'Not set');
  
  if (!apiKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">設定エラー</h1>
          <p className="text-gray-700 mb-4">
            Google Maps API キーが設定されていません。
          </p>
          <p className="text-sm text-gray-600">
            .env ファイルに VITE_GOOGLE_MAPS_API_KEY を設定してください。
          </p>
        </div>
      </div>
    );
  }

  const { isDesktop } = useDeviceDetect();
  const { panTo, zoomIn, zoomOut } = useGoogleMaps();

  const searchRef = useRef<HTMLInputElement>(null);
  
  // チュートリアル・ヘルプ関連のstate
  const [showTutorial, setShowTutorial] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const clearSearch = useCallback(() => {
    if (searchRef.current) {
      const input = searchRef.current as HTMLInputElement;
      input.value = '';
      input.blur();
    }
  }, []);

  const showHelp = useCallback(() => {
    setShowKeyboardShortcuts(true);
  }, []);

  useKeyboardShortcuts({
    isDesktop,
    focusSearch,
    clearSearch,
    zoomIn,
    zoomOut,
    showHelp,
  });

  // 初回起動時のチュートリアル表示
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('travel-app-tutorial-seen');
    if (!hasSeenTutorial) {
      // 少し遅らせてチュートリアルを表示
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTutorialClose = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('travel-app-tutorial-seen', 'true');
  }, []);

  const handlePlaceSelected = (lat: number, lng: number) => {
    panTo(lat, lng, 17);
  };

  const placeOpen = !!useSelectedPlaceStore((s) => s.place);

  // Tab navigation state
  const [activeTab, setActiveTab] = React.useState<TabKey>('map');
  
  // Label mode state
  const [labelMode, setLabelMode] = React.useState(false);

  // ラベルモードのトグル機能
  const handleLabelModeToggle = useCallback(() => {
    setLabelMode(prev => !prev);
  }, []);

  // ESCキーでラベルモードを終了
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && labelMode) {
        setLabelMode(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [labelMode]);
  
  // Route search store
  const { 
    isRouteSearchOpen, 
    selectedOrigin, 
    selectedDestination,
    closeRouteSearch 
  } = useRouteSearchStore();

  // Enable/disable travel-time store based on active tab
  React.useEffect(() => {
    const store = useTravelTimeStore.getState();
    store.setEnabled(activeTab === 'travelTime');
    
    // 移動時間タブから離れる時は明示的にクリア
    if (activeTab !== 'travelTime') {
      store.clearAll();
    }
  }, [activeTab]);

  // 認証状態と初期化完了フラグを取得
  const { user, isInitializing } = useAuth();
  const planId = usePlanStore((s) => s.plan?.id);
  
  // 自動保存のタイムスタンプを管理
  const lastSavedTimestampRef = useRef<number>(0);
  
  // 保存タイムスタンプを更新する関数
  const updateLastSavedTimestamp = useCallback((timestamp: number) => {
    lastSavedTimestampRef.current = timestamp;
  }, []);

  // 自動保存フックを使用
  const plan = usePlanStore((s) => s.plan);
  const { setIsRemoteUpdateInProgress, saveImmediately, saveImmediatelyCloud, lastCloudSaveTimestamp } = useAutoSave(plan, updateLastSavedTimestamp);

  // 候補地追加時の即座同期を設定
  React.useEffect(() => {
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
      
      // デバッグログを記録
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'place_added',
        placeName: newPlace.name,
        placeId: newPlace.id,
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  // 候補地削除時の即座同期を設定
  React.useEffect(() => {
    const { setOnPlaceDeleted } = usePlacesStore.getState();
    
    setOnPlaceDeleted((updatedPlaces) => {
      if (import.meta.env.DEV) {
        console.log('🗑️ 候補地削除検知、即座同期開始:');
      }
      
      // 最新のプランを取得し、placesを更新して保存
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
      
      // デバッグログを記録
      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        reason: 'place_deleted',
        timestamp: Date.now()
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  // ラベル追加時のローカル状態更新
  React.useEffect(() => {
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
        // saveImmediately(planToSave); // 初回保存はしない
      }
    });
  }, []);

  // ラベル更新時の即座同期を設定
  React.useEffect(() => {
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
        
        // 'synced' ステータスのラベルのみクラウド同期
        if (updatedLabel.status === 'synced') {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
    });
  }, [plan, saveImmediately, saveImmediatelyCloud]);

  // ラベル削除時の即座同期を設定
  React.useEffect(() => {
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

  // プラン名・日付更新時の即座同期を設定
  React.useEffect(() => {
    const { setOnPlanUpdated } = usePlanStore.getState();

    setOnPlanUpdated((updatedPlan) => {
      if (import.meta.env.DEV) {
        console.log('📅 プラン更新検知、即座同期開始:', updatedPlan.name);
      }
      saveImmediately(updatedPlan);
      saveImmediatelyCloud(updatedPlan);
    });
  }, [saveImmediately, saveImmediatelyCloud]);

  // URL共有からの読み込み & プランロード
  // 認証初期化が完了してからプランをロード
  React.useEffect(() => {
    if (isInitializing) return; // 認証判定待ち
    (async () => {
      const planFromUrl = loadPlanFromUrl();
      if (planFromUrl) {
        usePlacesStore.setState({ places: planFromUrl.places });
        useLabelsStore.setState({ labels: planFromUrl.labels });
        usePlanStore.getState().setPlan(planFromUrl);
        return;
      }

      const current = usePlanStore.getState().plan;
      if (current) return;

      // cloud or local load
      let loaded: TravelPlan | null = null;
      if (navigator.onLine && user) {
        loaded = await loadActivePlanHybrid({ mode: 'cloud', uid: user.uid });
      }
      if (!loaded) {
        loaded = getActivePlan() || createEmptyPlan();
      }

      if (loaded) {
        usePlanStore.getState().setPlan(loaded);
        // 追加: ストアへ地点とラベルを同期
        usePlacesStore.setState({ places: loaded.places });
        useLabelsStore.setState({ labels: loaded.labels });
        setActivePlan(loaded.id);
      }
    })();
  }, [user, isInitializing]);

  // リアルタイムリスナー
  // 認証初期化が完了してからリアルタイムリスナーを登録
  React.useEffect(() => {
    if (isInitializing) return;
    if (!user) return;
    const plan = usePlanStore.getState().plan;
    if (!plan) return;

    let unsub: () => void;
    let lastProcessedTimestamp = 0; // 最後に処理したタイムスタンプ
    let processingTimeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const { listenPlan } = await import('./services/planCloudService');
      const { createSyncConflictResolver } = await import('./services/syncConflictResolver');
      
      const conflictResolver = createSyncConflictResolver();
      
      unsub = listenPlan(user.uid, plan.id, (updated) => {
        const remoteTimestamp = updated.updatedAt.getTime();
        // 現在のクラウド保存タイムスタンプを取得
        const currentCloudSaveTimestamp = lastCloudSaveTimestamp || 0;
        const timeDiff = Math.abs(remoteTimestamp - currentCloudSaveTimestamp);
        const isSelfUpdate = timeDiff < 3000; // 3秒以内を自己更新として判定（延長）

        // 同じタイムスタンプの更新は無視（ただし、初回は処理する）
        if (remoteTimestamp === lastProcessedTimestamp && lastProcessedTimestamp !== 0) {
          if (import.meta.env.DEV) {
            console.log('🔄 同じタイムスタンプのため無視:', remoteTimestamp);
          }
          return;
        }

        // 開発時のみ詳細ログ
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
            cloudSaveTimestampRef: 'N/A' // フック内の値は直接アクセスできない
          });
        }

        // デバッグログを記録
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

        // 他デバイスからの更新として記録
        syncDebugUtils.log('receive', {
          remoteTimestamp,
          cloudSaveTimestamp: currentCloudSaveTimestamp,
          timeDiff,
          remotePlaces: updated.places.length,
          remoteLabels: updated.labels.length
        });

        // 処理中のタイムアウトをクリア
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }

        // リモート更新中フラグを設定
        setIsRemoteUpdateInProgress(true);

        // 処理を遅延させて連続更新をバッチ処理
        processingTimeout = setTimeout(() => {
          try {
            // 競合解決を実行
            const currentPlan = usePlanStore.getState().plan;
            if (currentPlan) {
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

              // 競合解決ログを記録
              syncDebugUtils.log('conflict', {
                originalPlaces: currentPlan.places.length,
                remotePlaces: updated.places.length,
                resolvedPlaces: resolvedPlan.places.length,
                originalLabels: currentPlan.labels.length,
                remoteLabels: updated.labels.length,
                resolvedLabels: resolvedPlan.labels.length,
                hasChanges: JSON.stringify(currentPlan) !== JSON.stringify(resolvedPlan)
              });
              
              // 解決されたプランをストアに反映
              // 競合解決後のタイムスタンプは更新しない（無限ループ防止）
              usePlanStore.getState().setPlan(resolvedPlan);
              usePlacesStore.setState({ places: resolvedPlan.places });
              useLabelsStore.setState({ labels: resolvedPlan.labels });
            } else {
              // ローカルプランがない場合はリモートを採用
              usePlanStore.getState().setPlan(updated);
              usePlacesStore.setState({ places: updated.places });
              useLabelsStore.setState({ labels: updated.labels });
            }

            lastProcessedTimestamp = remoteTimestamp;
          } finally {
            // リモート更新中フラグを解除（遅延を短縮）
            setTimeout(() => {
              setIsRemoteUpdateInProgress(false);
              if (import.meta.env.DEV) {
                console.log('🔄 リモート更新完了、自動保存を再開');
              }
            }, 300); // 200msから300msに延長
          }
        }, 100); // 100ms遅延でバッチ処理

      });
    })();

    return () => {
      if (unsub) unsub();
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [user, planId, isInitializing, lastCloudSaveTimestamp]);

  return (
    <LoadScript googleMapsApiKey={apiKey} language="ja" region="JP" libraries={LIBRARIES}>
      {/* Navigation */}
      <TabNavigationWrapper 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        labelMode={labelMode}
        onLabelModeToggle={handleLabelModeToggle}
      />



      {/* ルート検索画面またはリストタブでは検索バーを非表示 */}
      {!isRouteSearchOpen && activeTab !== 'list' && (
        <SearchBar
          onPlaceSelected={handlePlaceSelected}
          isDesktop={isDesktop}
          inputRef={searchRef}
          onClearExternal={() => {}}
        />
      )}
      <PlaceDetailPanel />
      
      {/* 地点選択中のバナー */}
      <SelectionBanner />
      
      <Map 
        showLabelToggle={false} 
        labelMode={labelMode}
        onLabelModeChange={setLabelMode}
      />
      
      {/* リスト表示タブ */}
      {activeTab === 'list' && <PlaceList />}
      
      
      
      {/* ルート検索パネル */}
      <RouteSearchPanel 
        isOpen={isRouteSearchOpen} 
        onClose={closeRouteSearch}
        selectedOrigin={selectedOrigin || undefined}
        selectedDestination={selectedDestination || undefined}
      />

      {activeTab === 'travelTime' && <TravelTimeControls />}

      {/* プラン名表示 */}
      <PlanNameDisplay activeTab={activeTab} />

      {/* チュートリアル */}
      <Tutorial 
        isOpen={showTutorial} 
        onClose={handleTutorialClose} 
      />

      {/* キーボードショートカット */}
      <KeyboardShortcuts 
        isOpen={showKeyboardShortcuts} 
        onClose={() => setShowKeyboardShortcuts(false)} 
      />

      {/* クラウド同期インジケータ */}
      <SyncStatusIndicator onSave={updateLastSavedTimestamp} />

      
    </LoadScript>
  );
}

export default App; 