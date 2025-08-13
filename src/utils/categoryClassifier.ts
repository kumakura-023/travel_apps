import { PlaceCategory } from '../types';

export function classifyCategory(types: readonly string[] | undefined): PlaceCategory {
  if (!types) return 'other';
  
  console.log('[classifyCategory] Input types:', types);
  
  const has = (...t: string[]) => t.some((k) => types.includes(k));
  
  // より具体的なショッピング施設タイプを最優先で判定
  if (has('shopping_mall', 'department_store')) {
    console.log('[classifyCategory] Detected as shopping (priority: mall/department)');
    return 'shopping';
  }
  
  // 宿泊施設
  if (has('lodging', 'hotel', 'resort')) {
    console.log('[classifyCategory] Detected as hotel');
    return 'hotel';
  }
  
  // 交通機関
  if (has('airport', 'bus_station', 'train_station', 'transit_station', 'subway_station', 'taxi_stand')) {
    console.log('[classifyCategory] Detected as transport');
    return 'transport';
  }
  
  // 観光地
  if (has('tourist_attraction', 'museum', 'park', 'art_gallery', 'amusement_park', 'zoo', 'aquarium', 'stadium', 'church', 'temple', 'shrine', 'castle', 'monument')) {
    console.log('[classifyCategory] Detected as sightseeing');
    return 'sightseeing';
  }
  
  // その他のショッピング関連
  if (has('store', 'clothing_store', 'shoe_store', 'jewelry_store', 'book_store', 'electronics_store', 'home_goods_store', 'furniture_store', 'hardware_store', 'florist', 'gift_shop', 'toy_store', 'sports_goods_store', 'bicycle_store', 'convenience_store', 'supermarket', 'grocery_or_supermarket', 'liquor_store', 'drugstore', 'pharmacy')) {
    console.log('[classifyCategory] Detected as shopping');
    return 'shopping';
  }
  
  // レストラン・飲食（ショッピング判定の後に）
  if (has('restaurant', 'food', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery')) {
    console.log('[classifyCategory] Detected as restaurant');
    return 'restaurant';
  }
  
  console.log('[classifyCategory] Detected as other');
  return 'other';
} 