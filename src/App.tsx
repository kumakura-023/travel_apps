import { LoadScript } from '@react-google-maps/api';
import * as React from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import PlaceDetailPanel from './components/PlaceDetailPanel';
import TabNavigationWrapper from './components/TabNavigationWrapper';
import { TabKey } from './components/TabNavigation';

import TravelTimeControls from './components/TravelTimeControls';
import SelectionBanner from './components/SelectionBanner';
import RouteSearchPanel from './components/RouteSearchPanel';
import Tutorial from './components/Tutorial';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { useRouteSearchStore } from './store/routeStoreMigration';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTravelTimeStore } from './store/travelTimeStore';
import PlaceList from './components/PlaceList';
import MapCategoryFilter from './components/MapCategoryFilter';
import { useLabelModeStore } from './store/labelModeStore';
import PlanNameDisplay from './components/PlanNameDisplay';
import { usePlanStore } from './store/planStore';
import { useAuth } from './hooks/useAuth';
import { useAutoSave } from './hooks/useAutoSave';
import { usePlanSyncEvents } from './hooks/usePlanSyncEvents';
import { usePlaceEventListeners } from './hooks/usePlaceEventListeners';
import { usePlanInitializer } from './hooks/usePlanInitializer';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import ExternalBrowserPrompt from './components/ExternalBrowserPrompt';
import { config, validateEnvironment } from './config/environment';
import { ErrorHandler } from './errors';

// LoadScript用のライブラリを定数として定義
const LIBRARIES: ('places')[] = ['places'];

// 環境変数の検証
validateEnvironment();

// グローバルエラーハンドラーを設定
ErrorHandler.setupGlobalHandlers();

function App() {
  const apiKey = config.googleMapsApiKey;
  
  // フックは常に同じ順序で呼び出す必要がある
  const { isDesktop } = useDeviceDetect();
  const { panTo, zoomIn, zoomOut } = useGoogleMaps();

  const searchRef = useRef<HTMLInputElement>(null);
  
  // チュートリアル・ヘルプ関連のstate
  const [showTutorial, setShowTutorial] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const { plan } = usePlanStore();
  
  // Tab navigation state
  const [activeTab, setActiveTab] = React.useState<TabKey>('map');
  
  
  // Route search store
  const { 
    isRouteSearchOpen, 
    selectedOrigin, 
    selectedDestination,
    closeRouteSearch 
  } = useRouteSearchStore();
  
  // 認証状態と初期化完了フラグを取得
  useAuth();

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

  const handleTutorialClose = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('travel-app-tutorial-seen', 'true');
  }, []);

  const handlePlaceSelected = (lat: number, lng: number) => {
    panTo(lat, lng, 17);
  };

  // 保存タイムスタンプを更新する関数
  const updateLastSavedTimestamp = useCallback((timestamp: number) => {
    // timestamp管理用（未使用警告を避ける）
    console.log('Timestamp updated:', timestamp);
  }, []);

  // 自動保存フックを使用
  const { saveImmediately, saveImmediatelyCloud, saveWithSyncManager } = useAutoSave(plan, updateLastSavedTimestamp);

  // 新しいプラン初期化フックを使用
  usePlanInitializer();

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

  // ESCキーでラベルモードを終了
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useLabelModeStore.getState().labelMode) {
        useLabelModeStore.getState().toggleLabelMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enable/disable travel-time store based on active tab
  React.useEffect(() => {
    const store = useTravelTimeStore.getState();
    store.setEnabled(activeTab === 'travelTime');
    
    // 移動時間タブから離れる時は明示的にクリア
    if (activeTab !== 'travelTime') {
      store.clearAll();
    }
  }, [activeTab]);

  usePlanSyncEvents(plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager);
  
  // 新しいイベントベースのリスナーも設定
  usePlaceEventListeners(saveImmediately, saveImmediatelyCloud, saveWithSyncManager);

  // APIキーが設定されていない場合の早期リターン
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

  return (
    <LoadScript googleMapsApiKey={apiKey} language="ja" region="JP" libraries={LIBRARIES}>
      {/* Navigation */}
      <TabNavigationWrapper
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />



      {/* ルート検索画面またはリストタブでは検索バーを非表示 */}
      {!isRouteSearchOpen && activeTab !== 'list' && (
        <SearchBar
          onPlaceSelected={handlePlaceSelected}
          inputRef={searchRef}
          onClearExternal={() => {}}
        />
      )}
      
      {/* マップタブでのみカテゴリフィルターを表示 */}
      {!isRouteSearchOpen && activeTab === 'map' && (
        <div className="fixed top-[4.5rem] left-4 right-4 z-40 max-w-md mx-auto">
          <MapCategoryFilter />
        </div>
      )}
      
      <PlaceDetailPanel />
      
      {/* 地点選択中のバナー */}
      <SelectionBanner />
      
      <MapContainer
        showLabelToggle={false}
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

      {/* アプリ内ブラウザでログインできない場合の案内 */}
      <ExternalBrowserPrompt />

      
    </LoadScript>
  );
}

export default App; 