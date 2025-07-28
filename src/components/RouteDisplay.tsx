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

  // ズーム比率に応じたスケール計算（下限値を2倍に変更）
  const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
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

        // design_ruleに沿ったルート情報オーバーレイの内容
        this.div.innerHTML = `
          <div style="
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(78, 205, 196, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans JP', sans-serif;
            min-width: 300px;
            animation: modal-zoom-in 0.3s cubic-bezier(0.19, 0.91, 0.38, 1);
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 20px;
              background: linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(78, 205, 196, 0.03));
              border-bottom: 1px solid rgba(78, 205, 196, 0.12);
            ">
              <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: linear-gradient(135deg, #4ECDC4, #4FD1C5);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
                  flex-shrink: 0;
                ">
                  ${getTravelModeIcon()}
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                  <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span style="
                      font-size: 28px;
                      line-height: 34px;
                      letter-spacing: 0.364px;
                      font-weight: 700;
                      color: rgba(0, 0, 0, 0.85);
                    ">
                      ${route.durationText}
                    </span>
                    <span style="
                      font-size: 15px;
                      line-height: 20px;
                      letter-spacing: -0.24px;
                      color: rgba(0, 0, 0, 0.5);
                      font-weight: 500;
                    ">
                      (${route.distanceText})
                    </span>
                  </div>
                  <span style="
                    font-size: 13px;
                    line-height: 18px;
                    letter-spacing: -0.078px;
                    color: #4ECDC4;
                    font-weight: 500;
                  ">
                    ${getTravelModeLabel()}ルート
                  </span>
                </div>
              </div>
              <button 
                id="delete-route-btn-${route.id}"
                style="
                  width: 32px;
                  height: 32px;
                  background: rgba(255, 107, 107, 0.9);
                  color: white;
                  border: none;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.25);
                  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  backdrop-filter: blur(8px);
                "
                onmouseover="this.style.background='rgba(229, 62, 62, 0.95)'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.background='rgba(255, 107, 107, 0.9)'; this.style.transform='scale(1)'"
                onmousedown="this.style.transform='scale(0.95)'"
                onmouseup="this.style.transform='scale(1.05)'"
              >
                <span style="font-size: 16px; font-weight: 500;">✕</span>
              </button>
            </div>
          </div>
          <style>
            @keyframes modal-zoom-in {
              from { 
                opacity: 0;
                transform: scale(0.85) translateY(8px);
              }
              to { 
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          </style>
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
          this.div.style.left = position.x - 150 + 'px'; // 中央揃え（幅300pxの半分）
          this.div.style.top = position.y - 35 + 'px'; // 中央揃え
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

  // 移動手段のラベルを取得
  const getTravelModeLabel = () => {
    switch (route.travelMode) {
      case google.maps.TravelMode.WALKING:
        return '徒歩';
      case google.maps.TravelMode.DRIVING:
        return '車';
      case google.maps.TravelMode.TRANSIT:
        return '電車';
      case google.maps.TravelMode.BICYCLING:
        return '自転車';
      default:
        return '車';
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