import MapContainer from './MapContainer';

/**
 * Map コンポーネント（後方互換性のためのエイリアス）
 * 実際の実装は MapContainer に移行済み
 * 
 * リファクタリング完了後:
 * - 単一責任原則の適用
 * - インターフェース依存の実装
 * - 疎結合な設計の採用
 */

interface Props {
  children?: React.ReactNode;
  showLabelToggle?: boolean;
}

export default function Map({ children, showLabelToggle = true }: Props) {
  return (
    <MapContainer
      showLabelToggle={showLabelToggle}
    >
      {children}
    </MapContainer>
  );
}