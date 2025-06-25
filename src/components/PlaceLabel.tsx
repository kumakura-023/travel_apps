import { OverlayView } from '@react-google-maps/api';
import { useState, useEffect, useRef } from 'react';
import { Place } from '../types';
import LabelEditDialog from './LabelEditDialog';
import { usePlacesStore } from '../store/placesStore';

interface Props {
  place: Place;
  zoom: number;
  map?: google.maps.Map | null;
}

export default function PlaceLabel({ place, zoom, map }: Props) {
  const updatePlace = usePlacesStore((s) => s.updatePlace);
  const [editing, setEditing] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (place.labelHidden) return null;
  if (zoom < 12) return null;

  const scale = Math.pow(2, zoom - 14);

  const labelPos = place.labelPosition ?? place.coordinates;

  const baseFontSize = place.labelFontSize ?? 10;
  const baseWidth = place.labelWidth ?? 120;
  const baseHeight = place.labelHeight ?? 32;

  const fontSize = baseFontSize * scale;
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const color = place.labelColor ?? '#202124';
  const fontFamily = place.labelFontFamily ?? 'sans-serif';

  const displayText = (place.labelText ?? place.name).length > 15 && scale <= 1
    ? `${(place.labelText ?? place.name).slice(0, 14)}…`
    : place.labelText ?? place.name;

  const handleSave = (u: Partial<import('../types').MapLabel>) => {
    updatePlace(place.id, {
      labelText: u.text ?? place.labelText ?? place.name,
      labelFontSize: u.fontSize ?? place.labelFontSize ?? 10,
      labelWidth: u.width ?? place.labelWidth ?? 120,
      labelHeight: u.height ?? place.labelHeight ?? 32,
      labelColor: u.color ?? place.labelColor ?? '#202124',
      labelFontFamily: u.fontFamily ?? place.labelFontFamily ?? 'sans-serif',
    });
  };

  // pointerEvents auto to allow double click; stop propagation to not trigger POI zoom

  // --- resize logic ---
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
      const newWidth = Math.max(40, resizeStart.current.width + dxBase);
      const newHeight = Math.max(16, resizeStart.current.height + dyBase);
      updatePlace(place.id, { labelWidth: newWidth, labelHeight: newHeight });
    };
    const stop = () => setResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // add start ref for drag
  const dragStart = useRef<{ clientX: number; clientY: number; world: google.maps.Point | null }>(
    {
      clientX: 0,
      clientY: 0,
      world: null,
    },
  );

  // effect for resizing remains; add effect for dragging
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, map]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (!map) return;
    e.stopPropagation();
    setDragging(true);
    const proj = map.getProjection();
    if (!proj) return;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      world: proj.fromLatLngToPoint(new google.maps.LatLng(labelPos.lat, labelPos.lng)),
    };
  };

  return (
    <>
      <OverlayView
        position={{ lat: labelPos.lat, lng: labelPos.lng }}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div
          ref={containerRef}
          className="bg-yellow-100 shadow rounded select-none hover:bg-yellow-200 cursor-pointer transform translate-x-2 -translate-y-2 flex items-center justify-center relative"
          style={{
            pointerEvents: 'auto',
            fontSize,
            width,
            height,
            fontFamily,
            color,
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowControls(true);
          }}
          onMouseDown={handleDragMouseDown}
        >
          {/* delete button */}
          {showControls && (
            <span
              className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full cursor-pointer"
              style={{ transform: `scale(${scale})` }}
              onClick={(e) => {
                e.stopPropagation();
                updatePlace(place.id, { labelHidden: true });
              }}
            >
              ×
            </span>
          )}
          {displayText}
          {/* resize handle */}
          {showControls && (
            <span
              className="absolute w-2 h-2 bg-blue-500 bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize"
              style={{ transform: `scale(${scale}) translate(50%, 50%)` }}
              onMouseDown={handleResizeMouseDown}
            />
          )}
        </div>
      </OverlayView>
      {editing && (
        <LabelEditDialog
          label={{
            id: place.id,
            text: place.labelText ?? place.name,
            position: { lat: place.coordinates.lat, lng: place.coordinates.lng },
            fontSize: place.labelFontSize ?? 10,
            fontFamily: place.labelFontFamily ?? 'sans-serif',
            color: place.labelColor ?? '#202124',
            width: place.labelWidth ?? 120,
            height: place.labelHeight ?? 32,
          }}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
} 