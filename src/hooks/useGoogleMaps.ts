import { useCallback, useRef, useState, useEffect } from 'react';

export function useGoogleMaps() {
  // module-level singleton ref so all hook invocations share same Map instance
  // eslint-disable-next-line prefer-const
  let sharedMap: google.maps.Map | null = (globalThis as any).__TRAVEL_MAP_INSTANCE__ || null;

  if (!(globalThis as any).__TRAVEL_MAP_INSTANCE__) {
    (globalThis as any).__TRAVEL_MAP_INSTANCE__ = sharedMap;
  }

  // we still keep a local ref for convenience pointing to sharedMap
  const mapRef = useRef<google.maps.Map | null>(sharedMap);
  
  // useState to trigger re-renders when map changes
  const [map, setMapState] = useState<google.maps.Map | null>(sharedMap);

  const setMap = useCallback((map: google.maps.Map) => {
    console.log('🔧 useGoogleMaps.setMap called with:', map);
    mapRef.current = map;
    (globalThis as any).__TRAVEL_MAP_INSTANCE__ = map;
    setMapState(map); // This triggers re-render!
    console.log('✅ Map state updated, should trigger re-renders');
  }, []);
  
  // Ensure state is in sync with global instance
  useEffect(() => {
    const globalMap = (globalThis as any).__TRAVEL_MAP_INSTANCE__ as google.maps.Map | null;
    if (globalMap && globalMap !== map) {
      console.log('🔄 Syncing map state with global instance');
      setMapState(globalMap);
    }
  }, [map]);

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    const currentMap = map || (globalThis as any).__TRAVEL_MAP_INSTANCE__;
    if (!currentMap) {
      console.log('❌ panTo: No map available');
      return;
    }
    const position = { lat, lng } as google.maps.LatLngLiteral;
    currentMap.panTo(position);
    if (zoom) {
      currentMap.setZoom(zoom);
    }
  }, [map]);

  const zoomIn = useCallback(() => {
    const currentMap = map || (globalThis as any).__TRAVEL_MAP_INSTANCE__;
    if (!currentMap) return;
    currentMap.setZoom(currentMap.getZoom()! + 1);
  }, [map]);

  const zoomOut = useCallback(() => {
    const currentMap = map || (globalThis as any).__TRAVEL_MAP_INSTANCE__;
    if (!currentMap) return;
    currentMap.setZoom(currentMap.getZoom()! - 1);
  }, [map]);

  const panBy = useCallback((dx: number, dy: number) => {
    const currentMap = map || (globalThis as any).__TRAVEL_MAP_INSTANCE__;
    if (!currentMap) return;
    currentMap.panBy(dx, dy);
  }, [map]);

  return {
    map, // Now returns the state version that triggers re-renders
    setMap,
    panTo,
    zoomIn,
    zoomOut,
    panBy,
  } as const;
} 