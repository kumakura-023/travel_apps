import { useCallback, useRef } from 'react';

export function useGoogleMaps() {
  // module-level singleton ref so all hook invocations share same Map instance
  // eslint-disable-next-line prefer-const
  let sharedMap: google.maps.Map | null = (globalThis as any).__TRAVEL_MAP_INSTANCE__ || null;

  if (!(globalThis as any).__TRAVEL_MAP_INSTANCE__) {
    (globalThis as any).__TRAVEL_MAP_INSTANCE__ = sharedMap;
  }

  // we still keep a local ref for convenience pointing to sharedMap
  const mapRef = useRef<google.maps.Map | null>(sharedMap);

  const setMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    (globalThis as any).__TRAVEL_MAP_INSTANCE__ = map;
  }, []);

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (!mapRef.current) {
      const globalMap = (globalThis as any).__TRAVEL_MAP_INSTANCE__ as google.maps.Map | undefined;
      if (globalMap) {
        mapRef.current = globalMap;
      } else {
        return;
      }
    }
    const position = { lat, lng } as google.maps.LatLngLiteral;
    mapRef.current.panTo(position);
    if (zoom) {
      mapRef.current.setZoom(zoom);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(mapRef.current.getZoom()! + 1);
  }, []);

  const zoomOut = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(mapRef.current.getZoom()! - 1);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    if (!mapRef.current) return;
    mapRef.current.panBy(dx, dy);
  }, []);

  return {
    map: mapRef.current,
    setMap,
    panTo,
    zoomIn,
    zoomOut,
    panBy,
  } as const;
} 