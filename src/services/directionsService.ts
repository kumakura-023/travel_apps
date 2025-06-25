import { TravelMode } from '../store/travelTimeStore';

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface TravelTimeResponse {
  durationMinutes: number;
  path: google.maps.LatLngLiteral[];
}

// Simple in-memory cache
const cache = new Map<string, { expiry: number; value: TravelTimeResponse }>();

function getCacheKey(origin: LatLngLiteral, dest: LatLngLiteral, mode: TravelMode) {
  return `${origin.lat},${origin.lng}_${dest.lat},${dest.lng}_${mode}`;
}

// Google DirectionsService instance (re-used)
let directionsService: google.maps.DirectionsService | null = null;
function getDirectionsService() {
  if (!directionsService) {
    directionsService = new google.maps.DirectionsService();
  }
  return directionsService;
}

export async function fetchTravelTime(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  mode: TravelMode = 'WALKING',
): Promise<TravelTimeResponse> {
  const key = getCacheKey(origin, destination, mode);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiry > now) {
    return cached.value;
  }

  // Wrap DirectionsService in Promise
  const service = getDirectionsService();

  const response: google.maps.DirectionsResult = await new Promise((resolve, reject) => {
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode[mode as keyof typeof google.maps.TravelMode],
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error('Directions request failed: ' + status));
        }
      },
    );
  });

  const leg = response.routes[0].legs[0];
  const durationMinutes = Math.ceil(leg.duration?.value ? leg.duration.value / 60 : 0);
  const path = response.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

  const value: TravelTimeResponse = { durationMinutes, path };
  cache.set(key, { value, expiry: now + 5 * 60 * 1000 }); // 5min TTL
  return value;
}

/**
 * Fetch travel times for up to 25 destinations in parallel (browser limit).
 */
export async function fetchTravelTimesBatch(
  origin: LatLngLiteral,
  destinations: LatLngLiteral[],
  mode: TravelMode,
): Promise<TravelTimeResponse[]> {
  // Limit to 25 as per requirement
  const limited = destinations.slice(0, 25);
  return Promise.all(limited.map((d) => fetchTravelTime(origin, d, mode)));
} 