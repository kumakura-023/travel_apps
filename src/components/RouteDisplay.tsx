import React, { useEffect, useRef } from 'react';
import { DirectionsRenderer } from '@react-google-maps/api';
import { RouteConnection } from '../types';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MdClose, MdDirectionsWalk, MdDirectionsCar, MdTrain } from 'react-icons/md';

interface Props {
  route: RouteConnection;
  zoom?: number;
}

export default function RouteDisplay({ route, zoom = 14 }: Props) {
  const { map } = useGoogleMaps();
  const { removeRoute } = useRouteConnectionsStore((s) => ({ removeRoute: s.removeRoute }));
  const overlayRef = useRef<google.maps.OverlayView | null>(null);

  // ズーム比率に応じたスケール計算
  const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
  const shouldShowOverlay = zoom >= 12;

  // ルート中点での情報オーバーレイ表示
  useEffect(() => {
    if (!map || !shouldShowOverlay) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    // 既存のオーバーレイがあれば削除
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    // ルートの中点を計算
    const midPoint = calculateMidPoint(route.originCoordinates, route.destinationCoordinates);

    // カスタムオーバーレイクラスを作成
    class RouteInfoOverlay extends google.maps.OverlayView {
      private div: HTMLDivElement | null = null;

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.cursor = 'auto';
        this.div.style.userSelect = 'none';
        this.div.style.zIndex = '1000';
        this.div.style.transform = `scale(${scale})`;
        this.div.style.transformOrigin = 'center';

        // ルート情報オーバーレイの内容
        this.div.innerHTML = `
          <div style="
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(0, 0, 0, 0.1);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-width: 180px;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              background: linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
            ">
              <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                <span style="font-size: 14px; color: rgb(37, 99, 235);">${getTravelModeIcon()}</span>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 24px; font-weight: 700; color: rgb(31, 41, 55);">
                    ${route.durationText}
                  </span>
                  <span style="font-size: 14px; color: rgb(107, 114, 128); font-weight: 500;">
                    ${route.distanceText}
                  </span>
                </div>
              </div>
              <button 
                id="delete-route-btn-${route.id}"
                style="
                  width: 20px;
                  height: 20px;
                  background: rgb(239, 68, 68);
                  color: white;
                  border: none;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  transition: background-color 0.15s;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  aspect-ratio: 1;
                "
                onmouseover="this.style.background='rgb(220, 38, 38)'"
                onmouseout="this.style.background='rgb(239, 68, 68)'"
              >
                <span style="font-size: 10px;">✕</span>
              </button>
            </div>
          </div>
        `;

        // 削除ボタンのクリックイベントを追加
        const deleteBtn = this.div.querySelector(`#delete-route-btn-${route.id}`);
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDelete();
          });
        }

        // オーバーレイをマップに追加
        const panes = this.getPanes();
        if (panes?.overlayMouseTarget) {
          panes.overlayMouseTarget.appendChild(this.div);
        }
      }

      draw() {
        if (!this.div) return;

        const projection = this.getProjection();
        if (!projection) return;

        const position = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(midPoint.lat, midPoint.lng)
        );

        if (position) {
          this.div.style.left = position.x - 70 + 'px'; // 中央揃え
          this.div.style.top = position.y - 20 + 'px'; // 中央揃え
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    }

    // オーバーレイを作成してマップに追加
    const overlay = new RouteInfoOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, shouldShowOverlay, route, scale]);

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [route.id]);

  const handleDelete = () => {
    console.log(`=== ROUTE DELETE BUTTON CLICKED ===`);
    console.log(`Target route ID: ${route.id}`);
    
    try {
      // オーバーレイを削除
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      
      // ストアから削除
      removeRoute(route.id);
      console.log(`Route removed from store: ${route.id}`);
      
    } catch (error) {
      console.error(`Error in route handleDelete:`, error);
    }
  };

  // 移動手段のアイコンを取得
  const getTravelModeIcon = () => {
    switch (route.travelMode) {
      case google.maps.TravelMode.WALKING:
        return '🚶';
      case google.maps.TravelMode.DRIVING:
        return '🚗';
      case google.maps.TravelMode.TRANSIT:
        return '🚇';
      case google.maps.TravelMode.BICYCLING:
        return '🚴';
      default:
        return '🚗';
    }
  };

  // 2地点の中点を計算
  const calculateMidPoint = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    return {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
  };

  // DirectionsRendererのオプション
  const directionsOptions = {
    suppressMarkers: true, // デフォルトのマーカーを非表示
    suppressInfoWindows: true, // デフォルトのInfoWindowを非表示
    preserveViewport: true, // ビューポートを変更しない
    polylineOptions: {
      strokeColor: '#3B82F6', // ブルー
      strokeWeight: 4,
      strokeOpacity: 0.8,
      zIndex: 100,
    },
  };

  return (
    <DirectionsRenderer
      directions={route.route}
      options={directionsOptions}
    />
  );
}

// 2地点間のルートを計算・表示するユーティリティ関数
export const createRouteConnection = async (
  originId: string,
  destinationId: string,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<RouteConnection | null> => {
  const { createRouteBetweenPlaces } = useRouteConnectionsStore.getState();
  return await createRouteBetweenPlaces(originId, destinationId, travelMode);
}; 