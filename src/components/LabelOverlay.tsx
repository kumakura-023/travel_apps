import { OverlayView } from '@react-google-maps/api';
import { MapLabel } from '../types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLabelsStore } from '../store/labelsStore';
import { usePlacesStore } from '../store/placesStore';
import { MdDragIndicator } from 'react-icons/md'; // 移動ハンドルのアイコン

interface Props {
  label: MapLabel;
  map: google.maps.Map | null;
  onEdit: () => void;
  onMove: (pos: { lat: number; lng: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
}

export default function LabelOverlay({ label, map, onEdit, onMove, onResize }: Props) {
  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(map?.getZoom() ?? 14);
  
  const dragStartRef = useRef<{ clientX: number; clientY: number; world: google.maps.Point | null }>({ clientX: 0, clientY: 0, world: null });
  const resizeStartRef = useRef<{ clientX: number; clientY: number; width: number; height: number }>({ clientX: 0, clientY: 0, width: label.width, height: label.height });
  const lastTapTimeRef = useRef(0);

  const deleteLabel = useLabelsStore((s) => s.deleteLabel);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // リンクされた候補地を取得
  const linkedPlace = useMemo(() => 
    label.linkedPlaceId ? places.find(place => place.id === label.linkedPlaceId) : null,
    [label.linkedPlaceId, places]
  );

  // PointerEventハンドラー
  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      if (isResizing) {
        ev.stopPropagation();
        const dx = (ev.clientX - resizeStartRef.current.clientX) / 2; // 感度調整
        const dy = (ev.clientY - resizeStartRef.current.clientY) / 2;
        const newWidth = Math.max(60, resizeStartRef.current.width + dx);
        const newHeight = Math.max(28, resizeStartRef.current.height + dy);
        onResize({ width: newWidth, height: newHeight });
      } else if (isDragging) {
        if (!map) return;
        const proj = map.getProjection();
        if (!proj || !dragStartRef.current.world) return;
        const zoom = map.getZoom() || 0;
        const scale = 2 ** zoom;
        const dx = (ev.clientX - dragStartRef.current.clientX) / scale;
        const dy = (ev.clientY - dragStartRef.current.clientY) / scale;
        const newWorld = new google.maps.Point(dragStartRef.current.world.x + dx, dragStartRef.current.world.y + dy);
        const latLng = proj.fromPointToLatLng(newWorld);
        if (latLng) onMove({ lat: latLng.lat(), lng: latLng.lng() });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isResizing, map, onMove, onResize]);

  // ズーム追従
  useEffect(() => {
    if (!map) return;
    const zoomListener = map.addListener('zoom_changed', () => setCurrentZoom(map.getZoom() ?? 14));
    setCurrentZoom(map.getZoom() ?? 14);
    return () => google.maps.event.removeListener(zoomListener);
  }, [map]);

  // 外部クリックでコントロールを非表示
  useEffect(() => {
    const handleDocClick = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowControls(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // 開始ハンドラー
  const handleDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    if (!map) return;
    const proj = map.getProjection();
    if (!proj) return;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      world: proj.fromLatLngToPoint(new google.maps.LatLng(label.position.lat, label.position.lng)),
    };
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      width: label.width || 120,
      height: label.height || 40,
    };
  };

  // ダブルタップ処理
  const handlePointerDown = (e: React.PointerEvent) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) { // 300ms以内ならダブルタップ
      onEdit();
    } else {
      setShowControls(true);
    }
    lastTapTimeRef.current = now;
    e.stopPropagation();
  };

  const scale = Math.pow(2, currentZoom - 14);
  const MIN_ZOOM_VISIBLE = 12;

  if (currentZoom < MIN_ZOOM_VISIBLE) return null;

  return (
    <OverlayView position={label.position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        ref={containerRef}
        className={`glass-effect rounded-lg shadow-elevation-2 select-none 
                   flex items-center justify-center relative
                   hover:shadow-elevation-3 transition-all duration-150 ease-ios-default
                   border border-white/30 ${
                     linkedPlace 
                       ? 'bg-gradient-to-br from-coral-500/15 to-coral-500/8' 
                       : 'bg-gradient-to-br from-teal-500/10 to-teal-500/5'
                   }`}
        style={{
          fontSize: label.fontSize * scale,
          fontFamily: label.fontFamily,
          color: label.color,
          width: label.width * scale,
          height: label.height * scale,
          pointerEvents: 'auto',
          transform: 'translate(-50%, -50%)', // 中央揃え
          borderLeftColor: linkedPlace ? '#FF6B6B' : '#4ECDC4',
          borderLeftWidth: '3px',
        }}
        onPointerDown={handlePointerDown}
      >
        {showControls && (
          <>
            {/* 削除ボタン */}
            <button
              className="absolute -top-2 -right-2 w-5 h-5 bg-coral-500 text-white 
                         caption-1 flex items-center justify-center rounded-full cursor-pointer
                         hover:bg-coral-600 active:scale-95 transition-all duration-150 ease-ios-default
                         shadow-elevation-2"
              style={{ transform: `scale(${Math.min(1 / scale, 1.2)})` }}
              onPointerDown={(e) => { e.stopPropagation(); deleteLabel(label.id); }}
            >
              ✕
            </button>
            {/* リサイズハンドル */}
            <div
              className="absolute w-3 h-3 bg-teal-500 bottom-0 right-0 
                         cursor-se-resize rounded-sm hover:bg-teal-600 transition-colors 
                         duration-150 ease-ios-default shadow-elevation-1"
              onPointerDown={handleResizeStart}
              style={{ transform: `scale(${Math.min(1 / scale, 1.2)}) translate(50%, 50%)` }}
            />
            {/* 移動ハンドル */}
            <div
              className="absolute -bottom-2 -left-2 w-5 h-5 bg-blue-500 text-white 
                         flex items-center justify-center rounded-full cursor-move
                         hover:bg-blue-600 active:scale-95 transition-all duration-150 ease-ios-default
                         shadow-elevation-2"
              onPointerDown={handleDragStart}
              style={{ transform: `scale(${Math.min(1 / scale, 1.2)})` }}
            >
              <MdDragIndicator />
            </div>
          </>
        )}
        
        {/* ラベルテキスト */}
        <div className="flex items-center gap-1 px-3 py-2">
          {linkedPlace && (
            <svg 
              className="w-3 h-3 text-coral-500 flex-shrink-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ transform: `scale(${Math.min(1 / scale, 1.2)})` }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          )}
          <span 
            className="footnote font-medium tracking-tight text-center leading-tight truncate"
            title={linkedPlace ? `${linkedPlace.name}にリンク: ${label.text}` : label.text}
          >
            {label.text || 'メモ'}
          </span>
        </div>
      </div>
    </OverlayView>
  );
} 