import React, { useState } from 'react';
import { Marker } from '@react-google-maps/api';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useSelectedPlaceStore } from '../store/selectedPlaceStore';
import { useLabelsStore } from '../store/labelsStore';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MapLabel } from '../types';
import { classifyCategory } from '../utils/categoryClassifier';
import { getCategoryColor } from '../utils/categoryIcons';

// コンポーネントのインポート
import PlaceCircle from './PlaceCircle';
import PlaceLabel from './PlaceLabel';
import LabelOverlay from './LabelOverlay';
import LabelEditDialog from './LabelEditDialog';
// import AddLabelToggle from './AddLabelToggle'; // TabNavigation に統合済み
import TravelTimeCircleBase from './TravelTimeCircle';
import RouteDisplayBase from './RouteDisplay';
import RouteMarkers from './RouteMarkers';
import PlaceMarkerCluster from './PlaceMarkerCluster';
import { withErrorBoundary } from './hoc/withErrorBoundary';

// エラーバウンダリでラップ
const RouteDisplay = withErrorBoundary(RouteDisplayBase);
const TravelTimeCircle = withErrorBoundary(TravelTimeCircleBase);

/**
 * 地図オーバーレイの管理を担当するコンポーネント
 * 単一責任: 地図上のオーバーレイ要素（マーカー、ラベル、ルート等）の管理のみ
 */

interface MapOverlayManagerProps {
  zoom: number;
  showLabelToggle?: boolean;
  children?: React.ReactNode;
}

export default function MapOverlayManager({
  zoom,
  showLabelToggle = true,
  children
}: MapOverlayManagerProps) {
  const [editing, setEditing] = useState<MapLabel | null>(null);
  
  // 地図インスタンスの取得
  const { map } = useGoogleMaps();
  
  // ストアからの状態取得
  const savedPlaces = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { place } = useSelectedPlaceStore();
  const { labels, updateLabel } = useLabelsStore();
  const { routes } = useRouteConnectionsStore();
  const { circles } = useTravelTimeMode();

  return (
    <>
      {/* マーカークラスタリング（多数の地点がある場合） */}
      <PlaceMarkerCluster zoom={zoom} threshold={15} />
      
      {/* 候補地のサークルとオーバーレイ */}
      {savedPlaces.map((p) => (
        <PlaceCircle key={`place-circle-${p.id}`} place={p} zoom={zoom} />
      ))}
      
      {/* 選択中の地点のマーカー */}
      {place && place.geometry?.location && (() => {
        // POI地点のカテゴリーを分類
        const category = classifyCategory(place.types);
        const categoryColor = getCategoryColor(category);
        
        return (
          <Marker
            position={{
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: categoryColor,
              fillOpacity: 0.9,
              strokeWeight: 3,
              strokeColor: '#ffffff',
              scale: 16, // 通常のマーカーより大きく表示
              anchor: new google.maps.Point(0, 0), // 中央に配置
            }}
            zIndex={1000} // 他のマーカーより前面に表示
          />
        );
      })()}
      
      {/* 地点の付箋ラベル */}
      {savedPlaces.map((p) => (
        <PlaceLabel key={`place-label-${p.id}`} place={p} zoom={zoom} />
      ))}
      
      {/* カスタムラベル */}
      {labels.map((l) => (
        <LabelOverlay
          key={`label-${l.id}`}
          label={l}
          map={map}
          onEdit={() => setEditing(l)}
          onMove={(pos) => {
            // ローカルの状態のみ更新（同期はしない）
            updateLabel(l.id, { position: pos }, true);
          }}
          onResize={(size) => {
            // ローカルの状態のみ更新（同期はしない）
            updateLabel(l.id, size, true);
          }}
          onMoveEnd={(pos) => {
            // 操作終了時に同期
            updateLabel(l.id, { position: pos });
          }}
          onResizeEnd={(size) => {
            // 操作終了時に同期
            updateLabel(l.id, size);
          }}
        />
      ))}
      
      {/* 移動時間圏の表示 */}
      {circles.map((c) => (
        <TravelTimeCircle 
          key={`travel-circle-${c.id}`} 
          circle={c} 
          zoom={zoom}
        />
      ))}
      
      {/* ルート検索のマーカー */}
      <RouteMarkers />

      {/* 2地点間のルート表示 */}
      {routes.map((route) => (
        <RouteDisplay
          key={`route-${route.id}`}
          route={route}
          zoom={zoom}
        />
      ))}

      {/* ラベル編集ダイアログ */}
      {editing && (
        <LabelEditDialog
          label={editing}
          onSave={(u) => updateLabel(editing.id, u)}
          onClose={() => setEditing(null)}
        />
      )}
      
      {/* ラベル追加トグルは TabNavigation に統合済み */}
      
      {/* 子コンポーネント */}
      {children}
    </>
  );
} 