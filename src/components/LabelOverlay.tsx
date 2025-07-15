import { OverlayView } from '@react-google-maps/api';
import { MapLabel } from '../types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLabelsStore } from '../store/labelsStore';
import { usePlacesStore } from '../store/placesStore';
import { useUIStore } from '../store/uiStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { setGlobalScrollLock } from '../utils/scrollLock';

interface Props {
  label: MapLabel;
  map: google.maps.Map | null;
  onEdit: () => void;
  onMove: (pos: { lat: number; lng: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
}

type InteractionMode = 'idle' | 'dragging' | 'resizing' | 'editing';

export default function LabelOverlay({ label, map, onEdit, onMove, onResize }: Props) {
  const { isMobile } = useDeviceDetect();
  const setMapInteraction = useUIStore((s) => s.setMapInteraction);

  const [mode, setMode] = useState<InteractionMode>('idle');
  const [currentZoom, setCurrentZoom] = useState<number>(map?.getZoom() ?? 14);

  const interactionStartRef = useRef({
    clientX: 0,
    clientY: 0,
    world: null as google.maps.Point | null,
    width: label.width,
    height: label.height,
    moved: false,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef(0);

  const deleteLabel = useLabelsStore((s) => s.deleteLabel);

  const linkedPlace = useMemo(
    () => (label.linkedPlaceId ? usePlacesStore.getState().getFilteredPlaces().find((p) => p.id === label.linkedPlaceId) : null),
    [label.linkedPlaceId],
  );

  // Unified interaction management (map lock, scroll lock, event listeners)
  useEffect(() => {
    const isInteracting = mode !== 'idle';
    setMapInteraction(!isInteracting);
    setGlobalScrollLock(isInteracting);

    const handlePointerMove = (ev: PointerEvent) => {
      if (mode === 'resizing') {
        ev.stopPropagation();
        const dx = ev.clientX - interactionStartRef.current.clientX;
        const dy = ev.clientY - interactionStartRef.current.clientY;
        const newWidth = Math.max(60, interactionStartRef.current.width + dx);
        const newHeight = Math.max(28, interactionStartRef.current.height + dy);
        onResize({ width: newWidth, height: newHeight });
        interactionStartRef.current.moved = true;
      } else if (mode === 'dragging') {
        if (!map) return;
        const proj = map.getProjection();
        if (!proj || !interactionStartRef.current.world) return;
        const zoom = map.getZoom() || 0;
        const scale = 2 ** zoom;
        const dx = (ev.clientX - interactionStartRef.current.clientX) / scale;
        const dy = (ev.clientY - interactionStartRef.current.clientY) / scale;
        const newWorld = new google.maps.Point(interactionStartRef.current.world.x + dx, interactionStartRef.current.world.y + dy);
        const latLng = proj.fromPointToLatLng(newWorld);
        if (latLng) onMove({ lat: latLng.lat(), lng: latLng.lng() });
        interactionStartRef.current.moved = true;
      }
    };

    const handlePointerUp = () => {
      // Trigger sync on operation end
      if (interactionStartRef.current.moved) {
        if (mode === 'dragging') {
            // onMove is already called during move, but we can call it one last time if needed
        } else if (mode === 'resizing') {
            // onResize is also called during resize
        }
      }
      setMode('idle');
    };

    if (isInteracting) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }

    // Exit editing mode when map is clicked
    let mapClickListener: google.maps.MapsEventListener | null = null;
    if (mode === 'editing') {
      mapClickListener = map?.addListener('click', () => {
        setMode('idle');
      });
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      mapClickListener?.remove();
    };
  }, [mode, map, onMove, onResize, setMapInteraction]);

  // Zoom listener
  useEffect(() => {
    if (!map) return;
    const zoomListener = map.addListener('zoom_changed', () => setCurrentZoom(map.getZoom() ?? 14));
    setCurrentZoom(map.getZoom() ?? 14);
    return () => google.maps.event.removeListener(zoomListener);
  }, [map]);

  // --- Event Handlers ---

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    interactionStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      world: map?.getProjection()?.fromLatLngToPoint(new google.maps.LatLng(label.position.lat, label.position.lng)) || null,
      width: label.width || 120,
      height: label.height || 40,
      moved: false,
    };

    if (isMobile) {
      longPressTimerRef.current = setTimeout(() => {
        setMode('editing'); // Enter editing mode first
        longPressTimerRef.current = null;
      }, 500);
    } else {
      setMode('dragging'); // Desktop starts dragging immediately
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setMode('dragging'); // If moved before long press timer, start dragging
    }
  };

  const handleContainerPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      // It was a tap
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        onEdit(); // Double tap
      }
      lastTapTimeRef.current = now;
    }
    // Drag/resize end is handled by the global pointerup listener
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    interactionStartRef.current = {
      ...interactionStartRef.current,
      clientX: e.clientX,
      clientY: e.clientY,
      width: label.width || 120,
      height: label.height || 40,
    };
    setMode('resizing');
  };

  const scale = Math.pow(2, currentZoom - 14);
  const MIN_ZOOM_VISIBLE = 12;

  if (currentZoom < MIN_ZOOM_VISIBLE) return null;

  const controlsVisible = mode === 'editing' || !isMobile;

  return (
    <OverlayView position={label.position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        className={`glass-effect rounded-lg shadow-elevation-2 select-none 
                   flex items-center justify-center relative transition-all duration-150 ease-ios-default
                   border-2 ${mode !== 'idle' ? 'border-blue-500' : 'border-white/30'}
                   ${linkedPlace ? 'bg-gradient-to-br from-coral-500/15 to-coral-500/8' : 'bg-gradient-to-br from-teal-500/10 to-teal-500/5'}
                   ${mode === 'dragging' || (isMobile && mode === 'editing') ? 'cursor-move' : ''}`}
        style={{
          fontSize: label.fontSize * scale,
          fontFamily: label.fontFamily,
          color: label.color,
          width: label.width * scale,
          height: label.height * scale,
          pointerEvents: 'auto',
          transform: 'translate(-50%, -50%)',
        }}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
      >
        {controlsVisible && (
          <>
            <button
              className="absolute -top-3 -right-3 w-6 h-6 bg-coral-500 text-white 
                         caption-1 flex items-center justify-center rounded-full cursor-pointer
                         hover:bg-coral-600 active:scale-95 transition-all duration-150 ease-ios-default
                         shadow-elevation-2"
              style={{ transform: `scale(${Math.min(1 / scale, 1.5)})` }}
              onPointerDown={(e) => {
                e.stopPropagation();
                deleteLabel(label.id);
              }}
            >
              ✕
            </button>
            <div
              className="absolute -bottom-3 -right-3 w-6 h-6 bg-teal-500 
                         cursor-se-resize rounded-full hover:bg-teal-600 transition-colors 
                         duration-150 ease-ios-default shadow-elevation-1"
              onPointerDown={handleResizePointerDown}
              style={{ transform: `scale(${Math.min(1 / scale, 1.5)})` }}
            />
          </>
        )}

        <div className="flex items-center gap-1 px-3 py-2 overflow-hidden">
          {linkedPlace && (
            <svg
              className="w-3 h-3 text-coral-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: `scale(${Math.min(1 / scale, 1.2)})` }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
          <span
            className="footnote font-medium tracking-tight text-center leading-tight"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={linkedPlace ? `${linkedPlace.name}にリンク: ${label.text}` : label.text}
          >
            {label.text || 'メモ'}
          </span>
        </div>
      </div>
    </OverlayView>
  );
}