import { OverlayView } from '@react-google-maps/api';
import { MapLabel } from '../types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLabelsStore } from '../store/labelsStore';
import { usePlacesStore } from '../store/placesStore';

interface Props {
  label: MapLabel;
  map: google.maps.Map | null;
  onEdit: () => void;
  onMove: (pos: { lat: number; lng: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
}

export default function LabelOverlay({ label, map, onEdit, onMove, onResize }: Props) {
  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(map?.getZoom() ?? 14);
  const start = useRef<{ clientX: number; clientY: number; world: google.maps.Point | null }>({
    clientX: 0,
    clientY: 0,
    world: null,
  });

  // リンクされた候補地を取得
  const linkedPlace = useMemo(() => 
    label.linkedPlaceId ? places.find(place => place.id === label.linkedPlaceId) : null,
    [label.linkedPlaceId, places]
  );

  const resizeStart = useRef<{ clientX: number; clientY: number; width: number; height: number }>(
    {
      clientX: 0,
      clientY: 0,
      width: label.width,
      height: label.height,
    },
  );

  const deleteLabel = useLabelsStore((s) => s.deleteLabel);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const handleResizeMove = (ev: MouseEvent) => {
      ev.stopPropagation();
      const dx = ev.clientX - resizeStart.current.clientX;
      const dy = ev.clientY - resizeStart.current.clientY;
      const newWidth = Math.max(60, resizeStart.current.width + dx);
      const newHeight = Math.max(28, resizeStart.current.height + dy);
      onResize({ width: newWidth, height: newHeight });
    };
    const stopResize = () => setResizing(false);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [resizing, onResize]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (ev: MouseEvent) => {
      if (!map) return;
      const proj = map.getProjection();
      if (!proj || !start.current.world) return;

      const zoom = map.getZoom() || 0;
      const scale = 2 ** zoom;

      const dx = (ev.clientX - start.current.clientX) / scale;
      const dy = (ev.clientY - start.current.clientY) / scale;

      const newWorld = new google.maps.Point(
        start.current.world.x + dx,
        start.current.world.y + dy,
      );

      const latLng = proj.fromPointToLatLng(newWorld);
      if (!latLng) return;
      onMove({ lat: latLng.lat(), lng: latLng.lng() });
    };
    const stop = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [dragging, map, onMove]);

  useEffect(() => {
    if (!map) return;
    const zoomListener = map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() ?? 14);
    });
    setCurrentZoom(map.getZoom() ?? 14);
    return () => {
      google.maps.event.removeListener(zoomListener);
    };
  }, [map]);

  useEffect(() => {
    // hide controls when click outside label overlay
    const handleDocClick = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowControls(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => {
      document.removeEventListener('click', handleDocClick);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
    if (!map) return;
    const proj = map.getProjection();
    if (!proj) return;
    start.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      world: proj.fromLatLngToPoint(new google.maps.LatLng(label.position.lat, label.position.lng)),
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      width: label.width,
      height: label.height,
    };
  };

  const scale = Math.pow(2, currentZoom - 14);
  const MIN_ZOOM_VISIBLE = 12;

  if (currentZoom < MIN_ZOOM_VISIBLE) return null;

  return (
    <OverlayView position={label.position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        ref={containerRef}
        className={`glass-effect rounded-lg shadow-elevation-2 select-none cursor-move 
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
          transform: 'translate(8px,-8px)',
          borderLeftColor: linkedPlace ? '#FF6B6B' : '#4ECDC4',
          borderLeftWidth: '3px',
        }}
        onDoubleClick={onEdit}
        onClick={(e) => {
          e.stopPropagation();
          setShowControls(true);
        }}
        onMouseDown={handleMouseDown}
      >
        {showControls && (
          <span
            className="absolute -top-2 -right-2 w-5 h-5 bg-coral-500 text-white 
                       caption-1 flex items-center justify-center rounded-full cursor-pointer
                       hover:bg-coral-600 active:scale-95 transition-all duration-150 ease-ios-default
                       shadow-elevation-2"
            style={{ transform: `scale(${Math.min(scale, 1.2)})` }}
            onClick={(e) => {
              e.stopPropagation();
              deleteLabel(label.id);
            }}
          >
            ✕
          </span>
        )}
        
        {/* label text */}
        <div className="flex items-center gap-1 px-3 py-2">
          {linkedPlace && (
            <svg 
              className="w-3 h-3 text-coral-500 flex-shrink-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ transform: `scale(${Math.min(scale, 1.2)})` }}
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
        
        {showControls && (
          <span
            className="absolute w-3 h-3 bg-teal-500 bottom-0 right-0 
                       translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm
                       hover:bg-teal-600 transition-colors duration-150 ease-ios-default
                       shadow-elevation-1"
            onMouseDown={handleResizeMouseDown}
            style={{ transform: `scale(${Math.min(scale, 1.2)}) translate(50%, 50%)` }}
          />
        )}
      </div>
    </OverlayView>
  );
} 