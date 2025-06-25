import { LoadScript } from '@react-google-maps/api';
import * as React from 'react';
import { useCallback, useRef } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import PlaceDetailPanel from './components/PlaceDetailPanel';
import MapTypeSwitcher from './components/MapTypeSwitcher';
import TabNavigation, { TabKey } from './components/TabNavigation';
import TravelTimeControls from './components/TravelTimeControls';
import TravelTimeOverlay from './components/TravelTimeOverlay';
import RouteDisplay from './components/RouteDisplay';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSelectedPlaceStore } from './store/placeStore';
import { useTravelTimeStore } from './store/travelTimeStore';

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  const { isDesktop } = useDeviceDetect();
  const { panTo, zoomIn, zoomOut } = useGoogleMaps();

  const searchRef = useRef<HTMLInputElement>(null);

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

  useKeyboardShortcuts({
    isDesktop,
    focusSearch,
    clearSearch,
    zoomIn,
    zoomOut,
  });

  const handlePlaceSelected = (lat: number, lng: number) => {
    panTo(lat, lng, 17);
  };

  const placeOpen = !!useSelectedPlaceStore((s) => s.place);

  // Tab navigation state
  const [activeTab, setActiveTab] = React.useState<TabKey>('map');

  // Enable/disable travel-time store based on active tab
  React.useEffect(() => {
    const store = useTravelTimeStore.getState();
    store.setEnabled(activeTab === 'travelTime');
    
    // 移動時間タブから離れる時は明示的にクリア
    if (activeTab !== 'travelTime') {
      store.clearAll();
    }
  }, [activeTab]);

  return (
    <LoadScript googleMapsApiKey={apiKey} language="ja" region="JP" libraries={['places']}>
      {/* Navigation */}
      <TabNavigation active={activeTab} onChange={setActiveTab} />

      <SearchBar
        onPlaceSelected={handlePlaceSelected}
        isDesktop={isDesktop}
        inputRef={searchRef}
        onClearExternal={() => {}}
      />
      <PlaceDetailPanel />
      <MapTypeSwitcher />
      <Map>
        {activeTab === 'travelTime' && (
          <>
            <TravelTimeOverlay />
            <RouteDisplay />
          </>
        )}
      </Map>

      {activeTab === 'travelTime' && <TravelTimeControls />}
    </LoadScript>
  );
}

export default App; 