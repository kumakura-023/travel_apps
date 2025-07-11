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
import AuthButton from './components/AuthButton';
import SyncStatusIndicator from './components/SyncStatusIndicator';
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

  const { user } = useAuth();
  const planId = usePlanStore((s) => s.plan?.id);

  // URL共有からの読み込み & プランロード
  React.useEffect(() => {
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
  }, [user]);

  // リアルタイムリスナー
  React.useEffect(() => {
    if (!user) return;
    const plan = usePlanStore.getState().plan;
    if (!plan) return;

    let unsub: () => void;

    (async () => {
      const { listenPlan } = await import('./services/planCloudService');
      unsub = listenPlan(user.uid, plan.id, (updated) => {
        usePlanStore.getState().setPlan(updated);
        // 追加: 地点とラベルをストアに反映
        usePlacesStore.setState({ places: updated.places });
        useLabelsStore.setState({ labels: updated.labels });
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [user, planId]);

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
      
      {/* テスト用候補地追加ボタン（開発時のみ表示） */}
      {import.meta.env.DEV && <TestPlacesButton />}
      
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
      <SyncStatusIndicator />

      {/* ログインボタン（デスクトップは右上、モバイルは左上） */}
      <div
        className={`fixed top-3 z-50 ${isDesktop ? 'right-3' : 'left-3'}`}
      >
        <AuthButton />
      </div>
    </LoadScript>
  );
}

export default App; 