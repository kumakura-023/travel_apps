import { TravelPlan } from '../types';

/**
 * DateオブジェクトをISO文字列へ変換するreplacer
 */
function dateReplacer(_key: string, value: any) {
  if (value instanceof Date) {
    return (value as Date).toISOString();
  }
  return value;
}

/**
 * ISO文字列をDateに戻すreviver
 */
function dateReviver(key: string, value: any) {
  if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
}

export function serializePlan(plan: TravelPlan): string {
  const filteredPlan = {
    ...plan,
    places: plan.places.filter(p => !p.deleted),
  };
  return JSON.stringify(filteredPlan, dateReplacer, 2);
}

export function deserializePlan(json: string): TravelPlan {
  const plan = JSON.parse(json, dateReviver) as TravelPlan;

  // CHANGELOG [1.4.24] 参照: 過去バージョンでは MapLabel の位置情報が
  // { lat: number, lng: number } として保存されていた。旧データを
  // 読み込んだ際に正しい `position` オブジェクトへ変換する。
  plan.labels?.forEach((label: any) => {
    if (!label.position && label.lat !== undefined && label.lng !== undefined) {
      label.position = { lat: label.lat, lng: label.lng };
    }
    delete label.lat;
    delete label.lng;
  });

  return plan;
}
