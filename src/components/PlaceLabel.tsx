import { OverlayView } from '@react-google-maps/api';
import { useState, useEffect, useRef } from 'react';
import { Place } from '../types';
import LabelEditDialog from './LabelEditDialog';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { getCategoryColor } from '../utils/categoryIcons';

interface Props {
  place: Place;
  zoom: number;
  map?: google.maps.Map | null;
}

export default function PlaceLabel({ place, zoom, map }: Props) {
  const updatePlace = useSavedPlacesStore((s) => s.updatePlace);
  const [editing, setEditing] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (place.labelHidden) return null;
  if (zoom < 12) return null;

  const scale = Math.pow(2, zoom - 14);
  const categoryColor = getCategoryColor(place.category);

  const labelPos = place.labelPosition ?? place.coordinates;

  const baseFontSize = place.labelFontSize ?? 12;
  const baseWidth = place.labelWidth ?? 140;
  const baseHeight = place.labelHeight ?? 36;

  const fontSize = baseFontSize * scale;
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const color = place.labelColor ?? 'rgba(0, 0, 0, 0.85)';
  const fontFamily = place.labelFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif';

  const displayText = (place.labelText ?? place.name).length > 15 && scale <= 1
    ? `${(place.labelText ?? place.name).slice(0, 14)}…`
    : place.labelText ?? place.name;

  const handleSave = (u: Partial<import('../types').MapLabel>) => {
    updatePlace(place.id, {
      labelText: u.text ?? place.labelText ?? place.name,
      labelFontSize: u.fontSize ?? place.labelFontSize ?? 12,
      labelWidth: u.width ?? place.labelWidth ?? 140,
      labelHeight: u.height ?? place.labelHeight ?? 36,
      labelColor: u.color ?? place.labelColor ?? 'rgba(0, 0, 0, 0.85)',
      labelFontFamily: u.fontFamily ?? place.labelFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif',
    });
  };

  // resize logic
  const resizeStart = useRef<{ clientX: number; clientY: number; width: number; height: number }>(
    {
      clientX: 0,
      clientY: 0,
      width: baseWidth,
      height: baseHeight,
    },
  );

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (ev: MouseEvent) => {
      ev.stopPropagation();
      const dxBase = (ev.clientX - resizeStart.current.clientX) / scale;
      const dyBase = (ev.clientY - resizeStart.current.clientY) / scale;
      const newWidth = Math.max(60, resizeStart.current.width + dxBase);
      const newHeight = Math.max(24, resizeStart.current.height + dyBase);
      updatePlace(place.id, { labelWidth: newWidth, labelHeight: newHeight });
    };
    const stop = () => setResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [resizing, scale]);

  useEffect(() => {
    const handleDocClick = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowControls(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      width: baseWidth,
      height: baseHeight,
    };
  };

  // drag logic
  const dragStart = useRef<{ clientX: number; clientY: number; world: google.maps.Point | null }>(
    {
      clientX: 0,
      clientY: 0,
      world: null,
    },
  );

  useEffect(() => {
    if (!dragging) return;
    if (!map) return;
    const proj = map.getProjection();
    if (!proj || !dragStart.current.world) return;

    const handleMove = (ev: MouseEvent) => {
      ev.stopPropagation();
      const zoomLevel = map.getZoom() || 0;
      const scale = 2 ** zoomLevel;
      const dx = (ev.clientX - dragStart.current.clientX) / scale;
      const dy = (ev.clientY - dragStart.current.clientY) / scale;
      const newWorld = new google.maps.Point(dragStart.current.world!.x + dx, dragStart.current.world!.y + dy);
      const latLng = proj.fromPointToLatLng(newWorld);
      if (!latLng) return;
      updatePlace(place.id, { labelPosition: { lat: latLng.lat(), lng: latLng.lng() } });
    };
    const stopDrag = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [dragging, map]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clickTime = Date.now();
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (dx > 5 || dy > 5) {
        // Drag start
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        handleDragMouseDown(e);
      }
    };

    const handleMouseUp = () => {
      if (Date.now() - clickTime < 200) {
        // Click
        setShowControls(true);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <OverlayView
        position={{ lat: labelPos.lat, lng: labelPos.lng }}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div
          ref={containerRef}
          className="glass-effect rounded-lg shadow-elevation-2 select-none cursor-pointer 
                     transform translate-x-2 -translate-y-2 flex items-center justify-center relative
                     hover:shadow-elevation-3 transition-all duration-150 ease-ios-default
                     border border-white/30"
          style={{
            pointerEvents: 'auto',
            fontSize,
            width,
            height,
            fontFamily,
            color,
            background: `linear-gradient(135deg, ${categoryColor}15, ${categoryColor}08)`,
            borderLeftColor: categoryColor,
            borderLeftWidth: '3px',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setEditing(true);
          }}
          onMouseDown={handleMouseDown}
        >
          {/* delete button */}
          {showControls && (
            <span
              className="absolute -top-2 -right-2 w-5 h-5 bg-coral-500 text-white 
                         caption-1 flex items-center justify-center rounded-full cursor-pointer
                         hover:bg-coral-600 active:scale-95 transition-all duration-150 ease-ios-default
                         shadow-elevation-2"
              style={{ transform: `scale(${Math.min(scale, 1.2)})` }}
              onClick={(e) => {
                e.stopPropagation();
                updatePlace(place.id, { labelHidden: true });
              }}
            >
              ✕
            </span>
          )}
          
          {/* label text */}
          <span className="footnote font-medium tracking-tight px-2 py-1 
                          text-center leading-tight truncate">
            {displayText}
          </span>
          
          {/* resize handle */}
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

      {/* Edit Dialog */}
      {editing && (
        <LabelEditDialog
          label={{
            id: place.id,
            text: place.labelText ?? place.name,
            fontSize: place.labelFontSize ?? 12,
            width: place.labelWidth ?? 140,
            height: place.labelHeight ?? 36,
            color: place.labelColor ?? 'rgba(0, 0, 0, 0.85)',
            fontFamily: place.labelFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif',
            position: labelPos,
          }}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
} 