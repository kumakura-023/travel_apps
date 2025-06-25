import { PlaceCategory } from '../types';

export function classifyCategory(types: readonly string[] | undefined): PlaceCategory {
  if (!types) return 'other';
  const has = (...t: string[]) => t.some((k) => types.includes(k));
  if (has('lodging', 'hotel', 'resort')) return 'hotel';
  if (has('restaurant', 'food', 'cafe', 'bar')) return 'restaurant';
  if (has('airport', 'bus_station', 'train_station', 'transit_station', 'subway_station')) return 'transport';
  if (has('tourist_attraction', 'museum', 'park', 'art_gallery', 'amusement_park', 'zoo')) return 'sightseeing';
  return 'other';
} 