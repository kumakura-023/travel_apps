import { OverlayView } from '@react-google-maps/api';
import { MapLabel } from '../types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLabelsStore } from '../store/labelsStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useUIStore } from '../store/uiStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { setGlobalScrollLock } from '../utils/scrollLock';

interface Props {
  label: MapLabel;
  map: google.maps.Map | null;
  onEdit: () => void;
  onMove: (pos: { lat: number; lng: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onMoveEnd?: (pos: { lat: number; lng: number }) => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
}

type InteractionMode = 'idle' | 'dragging' | 'resizing' | 'editing';

export default function LabelOverlay({ label, map, onEdit, onMove, onResize, onMoveEnd, onResizeEnd }: Props) {
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
  const isPointerDownRef = useRef(false);

  // 現在の位置とサイズを保持
  const currentPositionRef = useRef<{ lat: number; lng: number }>(label.position);
  const currentSizeRef = useRef<{ width: number; height: number }>({
    width: label.width,
    height: label.height
  });

  const deleteLabel = useLabelsStore((s) => s.deleteLabel);

  const linkedPlace = useMemo(
    () => (label.linkedPlaceId ? useSavedPlacesStore.getState().getFilteredPlaces().find((p) => p.id === label.linkedPlaceId) : null),
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
        
        // 現在のサイズを保存
        currentSizeRef.current = { width: newWidth, height: newHeight };
        
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
        if (latLng) {
          const newPosition = { lat: latLng.lat(), lng: latLng.lng() };
          
          // 現在の位置を保存
          currentPositionRef.current = newPosition;
          
          onMove(newPosition);
        }
        interactionStartRef.current.moved = true;
      }
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
      // 操作終了時の処理
      if (interactionStartRef.current.moved) {
        if (mode === 'dragging' && onMoveEnd) {
          // 保存された最新の位置で同期
          onMoveEnd(currentPositionRef.current);
        } else if (mode === 'resizing' && onResizeEnd) {
          // 保存された最新のサイズで同期
          onResizeEnd(currentSizeRef.current);
          // On mobile, end editing mode after resize operation
          if (isMobile) {
            setMode('idle');
            return;
          }
        }
      }
      
      // For non-mobile or non-resize operations, always set to idle
      if (!isMobile || mode !== 'editing') {
        setMode('idle');
      }
      // For mobile editing mode without resize/drag, keep editing mode active
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
      }) || null;
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      mapClickListener?.remove();
    };
  }, [mode, map, onMove, onResize]);

  // Zoom listener
  useEffect(() => {
    if (!map) return;
    const zoomListener = map.addListener('zoom_changed', () => setCurrentZoom(map.getZoom() ?? 14));
    setCurrentZoom(map.getZoom() ?? 14);
    return () => google.maps.event.removeListener(zoomListener);
  }, [map]);

  // labelの位置・サイズが外部から変更された場合にrefを更新
  useEffect(() => {
    currentPositionRef.current = label.position;
    currentSizeRef.current = { width: label.width, height: label.height };
  }, [label.position.lat, label.position.lng, label.width, label.height]);

  // --- Event Handlers ---

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.stopPropagation();
    
    // リサイズ中はメモの移動を開始しない
    if (mode === 'resizing') return;
    
    isPointerDownRef.current = true;
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
    }
    // No immediate mode change for desktop, wait for move or up
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    
    // リサイズ中はメモの移動を開始しない
    if (mode === 'resizing') return;

    if (isMobile) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        setMode('dragging'); // If moved before long press timer, start dragging
      }
    } else {
      // For desktop, if mouse moves after down, start dragging.
      // A small threshold can prevent accidental drags on click.
      const dx = Math.abs(e.clientX - interactionStartRef.current.clientX);
      const dy = Math.abs(e.clientY - interactionStartRef.current.clientY);
      if (dx > 5 || dy > 5) {
        setMode('dragging');
      }
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    isPointerDownRef.current = false;

    if (longPressTimerRef.current) { // Mobile short tap
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Check for double-click/tap on all devices
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (mode !== 'dragging') { // Prevent edit on drag-end
        onEdit();
        lastTapTimeRef.current = 0; // Reset after double-click to prevent triple-click issues
        return; // Done
      }
    }
    lastTapTimeRef.current = now;
    
    // For drag/resize, the global pointerup listener handles setting mode to 'idle'.
    // For long press editing mode on mobile, keep the mode as 'editing' to maintain button visibility
    if (mode === 'dragging') {
      // The global handler will set it to idle.
    } else if (mode === 'editing' && isMobile) {
      // Keep editing mode active on mobile to maintain button accessibility
      // Mode will be reset to 'idle' only when map is clicked (handled in useEffect)
    } else {
      // If it wasn't a drag or a double-click, it's a single click.
      // For desktop, you might want a select state.
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isPointerDownRef.current = true;
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

  // positionが未定義の場合はレンダリングしない
  if (!label.position || typeof label.position.lat !== 'number' || typeof label.position.lng !== 'number') {
    console.error('LabelOverlay: Invalid position', label);
    return null;
  }

  const controlsVisible = true; // 常にボタンを表示

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
              className="bg-coral-500 text-white 
                         caption-1 flex items-center justify-center rounded-full cursor-pointer
                         hover:bg-coral-600 active:scale-95 transition-all duration-150 ease-ios-default
                         shadow-elevation-2"
              style={{ 
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: isMobile ? '28px' : '24px',
                height: isMobile ? '28px' : '24px',
                // メモ領域に対する比率を一定に保つ
                transform: `scale(${Math.max(0.8, Math.min(1, 1 / scale))})`,
                transformOrigin: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                deleteLabel(label.id);
                // No need to reset mode as the label will be unmounted
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              ✕
            </button>
            <div
              className="bg-teal-500 
                         cursor-se-resize rounded-full hover:bg-teal-600 transition-colors 
                         duration-150 ease-ios-default shadow-elevation-1"
              onPointerDown={handleResizePointerDown}
              onTouchStart={(e) => {
                e.preventDefault(); // スクロールを防止
                e.stopPropagation();
                // タッチイベントをポインターイベントとして処理
                const touch = e.touches[0];
                const pointerEvent = {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  stopPropagation: () => e.stopPropagation(),
                } as React.PointerEvent;
                handleResizePointerDown(pointerEvent);
              }}
              style={{ 
                position: 'absolute',
                bottom: '-10px',
                right: '-10px',
                width: isMobile ? '28px' : '24px',
                height: isMobile ? '28px' : '24px',
                // メモ領域に対する比率を一定に保つ
                transform: `scale(${Math.max(0.8, Math.min(1, 1 / scale))})`,
                transformOrigin: 'center',
                // タッチ操作を無効化してスクロールを防止
                touchAction: 'none',
              }}
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