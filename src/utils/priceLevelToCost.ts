export function priceLevelToCost(
  priceLevel: number | undefined | null,
): number {
  // Google Places API price_level: 0 (無料) – 4 (高価)
  // 金額はあくまで概算。必要に応じて調整可能。
  switch (priceLevel) {
    case 0:
      return 0; // 無料
    case 1:
      return 1000; // 〜1,000円程度
    case 2:
      return 3000; // 〜3,000円程度
    case 3:
      return 10000; // 〜10,000円程度
    case 4:
      return 30000; // 〜30,000円以上
    default:
      return 0;
  }
}
