import React, { useEffect, useRef } from 'react';
import { DirectionsRenderer, Marker } from '@react-google-maps/api';
import { RouteConnection } from '../types';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MdClose, MdDirectionsWalk, MdDirectionsCar, MdDirectionsTransit } from 'react-icons/md';

interface Props {
  route: RouteConnection;
  zoom?: number;
}

export default function RouteDisplay({ route, zoom = 14 }: Props) {
  const { map } = useGoogleMaps();
  const { removeRoute } = useRouteConnectionsStore();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // ズーム比率に応じたスケール計算
  const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
  const shouldShowOverlay = zoom >= 12;

  // ルート中点での情報オーバーレイ表示
  useEffect(() => {
    if (!map || !shouldShowOverlay) {
      if (overlayRef.current) {
        console.log(`Removing overlay for route ${route.id} (not showing overlay)`);
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    // 既存のオーバーレイがあれば削除
    if (overlayRef.current) {
      console.log(`Removing existing overlay for route ${route.id}`);
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
            min-width: 360px;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 24px;
              background: linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
            ">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span style="font-size: 28px; color: rgb(37, 99, 235);">${getTravelModeIcon()}</span>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 48px; font-weight: 700; color: rgb(31, 41, 55);">
                    ${route.durationText}
                  </span>
                  <span style="font-size: 28px; color: rgb(107, 114, 128); font-weight: 500;">
                    ${route.distanceText}
                  </span>
                </div>
              </div>
              <button 
                id="delete-route-btn-${route.id}"
                style="
                  width: 40px;
                  height: 40px;
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
                <span style="font-size: 20px;">✕</span>
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
          this.div.style.left = position.x - 140 + 'px'; // 中央揃え（2倍サイズ対応）
          this.div.style.top = position.y - 40 + 'px'; // 中央揃え（2倍サイズ対応）
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
      console.log(`Cleanup overlay for route ${route.id}`);
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, shouldShowOverlay, route.id, route.durationText, route.distanceText, scale]);

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      console.log(`RouteDisplay unmount cleanup for route ${route.id}`);
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
        console.log(`Overlay cleaned up for route ${route.id}`);
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
        console.log(`DirectionsRenderer cleaned up for route ${route.id}`);
      }
    };
  }, [route.id]);

  const handleDelete = () => {
    console.log(`=== ROUTE DELETE BUTTON CLICKED ===`);
    console.log(`Target route ID: ${route.id}`);
    
    try {
      // オーバーレイを削除
      if (overlayRef.current) {
        console.log(`Removing overlay for route ${route.id}`);
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      
      // DirectionsRendererを削除
      if (directionsRendererRef.current) {
        console.log(`Removing DirectionsRenderer for route ${route.id}`);
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
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

  // 検索結果のルートかどうかを判定（search_origin_/search_destination_で始まる）
  const isSearchRoute = route.originId.startsWith('search_origin_') || route.destinationId.startsWith('search_destination_');
  
  // 座標が日本以外（海外）かどうかを判定
  const isInternationalRoute = route.originCoordinates.lat < 20 || route.originCoordinates.lat > 50 || 
                              route.originCoordinates.lng < 120 || route.originCoordinates.lng > 150 ||
                              route.destinationCoordinates.lat < 20 || route.destinationCoordinates.lat > 50 || 
                              route.destinationCoordinates.lng < 120 || route.destinationCoordinates.lng > 150;
  
  // DirectionsRendererのオプション
  const directionsOptions = {
    suppressMarkers: true, // デフォルトのマーカーを非表示
    suppressInfoWindows: true, // デフォルトのInfoWindowを非表示
    preserveViewport: !(isSearchRoute && isInternationalRoute), // 検索結果かつ海外の場合のみ地図を移動させる
    polylineOptions: {
      strokeColor: '#EC4899', // マゼンタピンク（高視認性で自然環境でも見やすい）
      strokeWeight: 6,
      strokeOpacity: 0.9,
      zIndex: 100,
    },
  };

  // DirectionsRendererを手動で作成・管理
  useEffect(() => {
    if (!map) return;

    console.log(`Creating DirectionsRenderer for route ${route.id}`);
    console.log(`Route type: ${isSearchRoute ? 'Search Route' : 'Candidate Route'}`);
    console.log(`International route: ${isInternationalRoute}`);
    console.log(`preserveViewport: ${directionsOptions.preserveViewport}`);
    
    // 既存のDirectionsRendererがあれば削除
    if (directionsRendererRef.current) {
      console.log(`Removing existing DirectionsRenderer for route ${route.id}`);
      directionsRendererRef.current.setMap(null);
    }

    try {
      // 新しいDirectionsRendererを作成
      const directionsRenderer = new google.maps.DirectionsRenderer(directionsOptions);
      
      console.log(`Setting map for DirectionsRenderer (route ${route.id})`);
      directionsRenderer.setMap(map);
      
      console.log(`Setting directions for route ${route.id}`, {
        hasRoutes: route.route?.routes?.length > 0,
        routesCount: route.route?.routes?.length || 0,
        originCoords: route.originCoordinates,
        destCoords: route.destinationCoordinates
      });
      
      directionsRenderer.setDirections(route.route);
      directionsRendererRef.current = directionsRenderer;
      
      console.log(`✅ DirectionsRenderer successfully created for route ${route.id}`);
      
    } catch (error) {
      console.error(`❌ Error creating DirectionsRenderer for route ${route.id}:`, error);
      console.error('Route data:', route);
      console.error('Directions options:', directionsOptions);
    }

    // クリーンアップ関数
    return () => {
      console.log(`Cleanup DirectionsRenderer for route ${route.id}`);
      if (directionsRendererRef.current) {
        try {
          directionsRendererRef.current.setMap(null);
          directionsRendererRef.current = null;
          console.log(`✅ DirectionsRenderer cleaned up for route ${route.id}`);
        } catch (error) {
          console.error(`❌ Error cleaning up DirectionsRenderer for route ${route.id}:`, error);
        }
      }
    };
  }, [map, route.id, isSearchRoute, isInternationalRoute]);

  // ルートのラインのみを表示（マーカーは RouteMarkers コンポーネントで表示）
  return null;
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