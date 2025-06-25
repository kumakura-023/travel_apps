import { useEffect, useState } from 'react';
import { fetchTravelTime } from '../services/directionsService';
import { TravelMode } from '../store/travelTimeStore';

interface LatLngLiteral {
  lat: number;
  lng: number;
}

export function useDirections(
  origin: LatLngLiteral | null,
  destinations: LatLngLiteral[],
  mode: TravelMode,
) {
  const [durations, setDurations] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!origin || destinations.length === 0) {
      setDurations([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(destinations.map((d) => fetchTravelTime(origin, d, mode)))
      .then((results) => {
        if (!cancelled) {
          setDurations(results.map((r) => r.durationMinutes));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, destinations, mode]);

  return { durations, loading, error };
} 