import { PlaceCategory } from '../types';

export function classifyCategory(types: readonly string[] | undefined): PlaceCategory {
  if (!types) return 'other';
  const has = (...t: string[]) => t.some((k) => types.includes(k));
  if (has('lodging', 'hotel', 'resort')) return 'hotel';
  if (has('restaurant', 'food', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery')) return 'restaurant';
  if (has('airport', 'bus_station', 'train_station', 'transit_station', 'subway_station', 'taxi_stand')) return 'transport';
  if (has('tourist_attraction', 'museum', 'park', 'art_gallery', 'amusement_park', 'zoo', 'aquarium', 'stadium', 'church', 'temple', 'shrine', 'castle', 'monument')) return 'sightseeing';
  if (has('shopping_mall', 'department_store', 'store', 'clothing_store', 'shoe_store', 'jewelry_store', 'book_store', 'electronics_store', 'home_goods_store', 'furniture_store', 'hardware_store', 'florist', 'gift_shop', 'toy_store', 'sports_goods_store', 'bicycle_store', 'convenience_store', 'supermarket', 'grocery_or_supermarket', 'liquor_store', 'drugstore', 'pharmacy')) return 'shopping';
  return 'other';
} 