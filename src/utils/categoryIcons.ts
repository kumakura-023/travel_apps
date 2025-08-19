import { PlaceCategory } from "../types";

// カテゴリパスのマップ（UI表示用）
const pathMap: Record<PlaceCategory, string> = {
  hotel:
    "M12 2C8.13 2 5 5.13 5 9v11h2v-9h10v9h2V9c0-3.87-3.13-7-7-7zm-3 8h2v2H9v-2zm0 4h2v2H9v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z", // bed icon
  restaurant:
    "M8 2v2h8V2h2v6h-2v2c0 1.1-.9 2-2 2v8h-2v-8c-1.1 0-2-.9-2-2V8H8V2h2z",
  sightseeing:
    "M12 2a7 7 0 100 14 7 7 0 000-14zm0 2.18a4.82 4.82 0 110 9.64 4.82 4.82 0 010-9.64z",
  shopping: "M6 2l1.5 1.5h9L18 2h2v2H4V2h2zm0 5h12l-1 11H7L6 7z",
  transport:
    "M4 16c0 1.1.9 2 2 2v2h2v-2h8v2h2v-2c1.1 0 2-.9 2-2V6c0-3-3-4-8-4S4 3 4 6v10z",
  other: "M12 2C8.13 2 5 5.13 5 9c0 7 7 13 7 13s7-6 7-13c0-3.87-3.13-7-7-7z",
};

export function getCategoryIcon(
  category: PlaceCategory,
  saved = false,
): google.maps.Icon {
  const size = 40;
  const colorMap: Record<PlaceCategory, string> = {
    hotel: "#EC4899", // マゼンタピンク（旅行アプリらしい温かみのある色）
    restaurant: "#F97316", // オレンジ（現在より少し明るく）
    sightseeing: "#3B82F6", // 明るい青（観光地らしい爽やかな色）
    shopping: "#A855F7", // 明るい紫（ショッピングらしい華やかな色）
    transport: "#6B7280", // グレー（現在と同様）
    other: "#EF4444", // 明るい赤（より鮮やか）
  };

  const color = colorMap[category];
  const savedPath =
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";
  const path = saved ? savedPath : pathMap[category];

  return {
    path,
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 3,
    strokeColor: "#ffffff",
    scale: saved ? 1.3 : 1,
    anchor: new google.maps.Point(size / 2, size),
  } as unknown as google.maps.Icon;
}

export function getCategoryColor(category: PlaceCategory) {
  const colorMap: Record<PlaceCategory, string> = {
    hotel: "#EC4899", // マゼンタピンク（旅行アプリらしい温かみのある色）
    restaurant: "#F97316", // オレンジ（現在より少し明るく）
    sightseeing: "#3B82F6", // 明るい青（観光地らしい爽やかな色）
    shopping: "#A855F7", // 明るい紫（ショッピングらしい華やかな色）
    transport: "#6B7280", // グレー（現在と同様）
    other: "#EF4444", // 明るい赤（より鮮やか）
  };
  return colorMap[category];
}

// UI表示用のカテゴリパスを取得
export function getCategoryPath(category: PlaceCategory): string {
  return pathMap[category];
}

// カテゴリの表示名を取得
export function getCategoryDisplayName(category: PlaceCategory): string {
  const displayNameMap: Record<PlaceCategory, string> = {
    hotel: "ホテル",
    restaurant: "レストラン",
    sightseeing: "観光スポット",
    shopping: "ショッピング",
    transport: "交通",
    other: "その他",
  };
  return displayNameMap[category];
}

// カテゴリの絵文字を取得
export function getCategoryEmoji(category: PlaceCategory): string {
  const emojiMap: Record<PlaceCategory, string> = {
    hotel: "🏨",
    restaurant: "🍽️",
    sightseeing: "🎯",
    shopping: "🛍️",
    transport: "🚉",
    other: "📍",
  };
  return emojiMap[category];
}
