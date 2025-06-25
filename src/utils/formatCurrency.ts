export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '¥0';
  return `¥${amount.toLocaleString('ja-JP')}`;
} 