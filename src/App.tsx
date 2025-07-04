import { LoadScript } from '@react-google-maps/api';
import * as React from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import PlaceDetailPanel from './components/PlaceDetailPanel';
import MapTypeSwitcher from './components/MapTypeSwitcher';
import TabNavigation, { TabKey } from './components/TabNavigation';
import TabToggleButton from './components/TabToggleButton';
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
import { getActivePlan, createEmptyPlan, setActivePlan } from './services/storageService';

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

  // URL共有からの読み込み
  React.useEffect(() => {
    const plan = loadPlanFromUrl();
    if (plan) {
      usePlacesStore.setState({ places: plan.places });
      useLabelsStore.setState({ labels: plan.labels });
      usePlanStore.getState().setPlan(plan);
      return;
    }

    // URL にプランが無い場合はローカルストレージから取得、なければ新規生成
    const current = usePlanStore.getState().plan;
    if (!current) {
      const stored = getActivePlan() || createEmptyPlan();
      usePlanStore.getState().setPlan(stored);
      setActivePlan(stored.id);
    }
  }, []);

  return (
    <LoadScript googleMapsApiKey={apiKey} language="ja" region="JP" libraries={LIBRARIES}>
      {/* Navigation */}
      <TabNavigation 
        active={activeTab} 
        onChange={setActiveTab}
        labelMode={labelMode}
        onLabelModeToggle={handleLabelModeToggle}
      />

      {/* Tab Toggle Button for mobile/tablet */}
      <TabToggleButton />

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
      {activeTab !== 'list' && <MapTypeSwitcher />}
      
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
    </LoadScript>
  );
}

export default App; 