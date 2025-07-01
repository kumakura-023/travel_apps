import React, { useState } from 'react';
import { Marker } from '@react-google-maps/api';
import { usePlacesStore } from '../store/placesStore';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useLabelsStore } from '../store/labelsStore';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MapLabel } from '../types';

// コンポーネントのインポート
import PlaceCircle from './PlaceCircle';
import PlaceLabel from './PlaceLabel';
import LabelOverlay from './LabelOverlay';
import LabelEditDialog from './LabelEditDialog';
import AddLabelToggle from './AddLabelToggle';
import TravelTimeCircle from './TravelTimeCircle';
import RouteDisplay from './RouteDisplay';
import RouteMarkers from './RouteMarkers';

/**
 * 地図オーバーレイの管理を担当するコンポーネント
 * 単一責任: 地図上のオーバーレイ要素（マーカー、ラベル、ルート等）の管理のみ
 */

interface MapOverlayManagerProps {
  zoom: number;
  labelMode: boolean;
  onLabelModeChange: (mode: boolean) => void;
  showLabelToggle?: boolean;
  children?: React.ReactNode;
}

export default function MapOverlayManager({ 
  zoom, 
  labelMode, 
  onLabelModeChange, 
  showLabelToggle = true,
  children 
}: MapOverlayManagerProps) {
  const [editing, setEditing] = useState<MapLabel | null>(null);
  
  // 地図インスタンスの取得
  const { map } = useGoogleMaps();
  
  // ストアからの状態取得
  const { places: savedPlaces } = usePlacesStore();
  const { place } = useSelectedPlaceStore();
  const { labels, updateLabel } = useLabelsStore();
  const { routes } = useRouteConnectionsStore();
  const { circles } = useTravelTimeMode();

  return (
    <>
      {/* 候補地のサークルとオーバーレイ */}
      {savedPlaces.map((p) => (
        <PlaceCircle key={`place-circle-${p.id}`} place={p} zoom={zoom} />
      ))}
      
      {/* 選択中の地点のマーカー */}
      {place && place.geometry?.location && (
        <Marker
          position={{
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }}
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 48),
          }}
        />
      )}
      
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
          onMove={(pos) => updateLabel(l.id, { position: pos })}
          onResize={(size) => updateLabel(l.id, size)}
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
      
      {/* ラベル追加トグル */}
      {showLabelToggle && <AddLabelToggle onToggle={onLabelModeChange} />}
      
      {/* 子コンポーネント */}
      {children}
    </>
  );
} 