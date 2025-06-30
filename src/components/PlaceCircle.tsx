import React, { useEffect, useRef } from 'react';
import { Marker } from '@react-google-maps/api';
import { Place } from '../types';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getCategoryColor, getCategoryIcon } from '../utils/categoryIcons';
import { usePlacesStore } from '../store/placesStore';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

interface Props {
  place: Place;
  zoom?: number;
}

export default function PlaceCircle({ place, zoom = 14 }: Props) {
  const { map } = useGoogleMaps();
  const { deletePlace } = usePlacesStore((s) => ({ deletePlace: s.deletePlace }));
  const { 
    selectionState, 
    startSelection, 
    completeSelection, 
    cancelSelection,
    isPlaceSelected 
  } = useRouteConnectionsStore();
  const { setSelectedOrigin, setSelectedDestination, openRouteSearch } = useRouteSearchStore();
  const { isTouchDevice } = useDeviceDetect();

  const circleRef = useRef<google.maps.Circle | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  
  const color = getCategoryColor(place.category);
  const isSelected = isPlaceSelected(place.id);
  const isInSelectionMode = selectionState.isSelecting;

  // ズーム比率に応じたスケール計算（最大サイズを1/3に縮小）
  const scale = Math.max(0.17, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
  const shouldShowOverlay = zoom >= 12;

  // 円を作成・更新
  useEffect(() => {
    if (!map) return;

    console.log(`Creating place circle for ${place.id}`);
    
    // 既存の円があれば削除
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // 新しい円を作成
    const newCircle = new google.maps.Circle({
      center: { lat: place.coordinates.lat, lng: place.coordinates.lng },
      radius: 120,
      strokeColor: color,
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.15,
      clickable: false,
      zIndex: 50,
      map: map,
    });

    circleRef.current = newCircle;

    // クリーンアップ関数
    return () => {
      console.log(`Cleaning up place circle for ${place.id}`);
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, place.coordinates.lat, place.coordinates.lng, place.category, place.id, color]);

  // カスタムオーバーレイ（削除ボタン）を作成・更新
  useEffect(() => {
    if (!map || !shouldShowOverlay) {
      // 非表示条件またはマップがない場合はオーバーレイを削除
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

    // カスタムオーバーレイクラスを作成
    class CustomOverlay extends google.maps.OverlayView {
      private div: HTMLDivElement | null = null;

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.cursor = 'auto';
        this.div.style.userSelect = 'none';
        this.div.style.zIndex = '1000';
        this.div.style.transform = `scale(${scale})`;
        this.div.style.transformOrigin = 'center bottom';

        // Reactコンポーネントの内容をHTMLとして設定
        this.div.innerHTML = `
          <div style="
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(0, 0, 0, 0.1);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-width: 200px;
          ">
            <!-- ヘッダー部分 -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background: linear-gradient(to right, rgba(${hexToRgb(color)}, 0.1), rgba(${hexToRgb(color)}, 0.05));
            ">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="
                  width: 24px;
                  height: 24px;
                  background: ${color};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 12px;
                  flex-shrink: 0;
                ">
                  ${getCategoryEmoji()}
                </div>
                <div style="
                  display: flex; 
                  align-items: center; 
                  gap: 6px; 
                  color: ${color};
                  font-weight: 500;
                ">
                  <span style="font-size: 14px;">${getCategoryLabel()}</span>
                </div>
              </div>
              <button 
                id="delete-btn-${place.id}"
                style="
                  width: 24px;
                  height: 24px;
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
                <span style="font-size: 12px;">✕</span>
              </button>
            </div>
            
            <!-- コンテンツ部分 -->
            <div style="padding: 12px;">
              <h3 style="
                font-size: 14px;
                font-weight: 600;
                margin: 0 0 4px 0;
                color: rgb(31, 41, 55);
              ">
                ${place.name}
              </h3>
              <p style="
                font-size: 12px;
                color: rgb(107, 114, 128);
                margin: 0 0 8px 0;
                line-height: 1.4;
              ">
                ${place.address}
              </p>
              ${place.estimatedCost > 0 ? `
                <div style="
                  font-size: 12px;
                  color: rgb(59, 130, 246);
                  font-weight: 500;
                  margin: 0 0 8px 0;
                ">
                  予想費用: ¥${place.estimatedCost.toLocaleString()}
                </div>
              ` : ''}
              
              <!-- ルート検索ボタン -->
              <div style="
                display: flex;
                gap: 6px;
                margin-top: 8px;
              ">
                <button 
                  id="set-origin-btn-${place.id}"
                  style="
                    flex: 1;
                    padding: 6px 8px;
                    background: rgb(34, 197, 94);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: background-color 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                  "
                  onmouseover="this.style.background='rgb(22, 163, 74)'"
                  onmouseout="this.style.background='rgb(34, 197, 94)'"
                >
                  <span style="font-size: 10px;">🚀</span>
                  出発地
                </button>
                <button 
                  id="set-destination-btn-${place.id}"
                  style="
                    flex: 1;
                    padding: 6px 8px;
                    background: rgb(239, 68, 68);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: background-color 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                  "
                  onmouseover="this.style.background='rgb(220, 38, 38)'"
                  onmouseout="this.style.background='rgb(239, 68, 68)'"
                >
                  <span style="font-size: 10px;">🎯</span>
                  目的地
                </button>
              </div>
            </div>
          </div>
        `;

        // 削除ボタンのクリックイベントを追加
        const deleteBtn = this.div.querySelector(`#delete-btn-${place.id}`);
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDelete();
          });
        }

        // 出発地設定ボタンのクリックイベントを追加
        const setOriginBtn = this.div.querySelector(`#set-origin-btn-${place.id}`);
        if (setOriginBtn) {
          setOriginBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSetOrigin();
          });
        }

        // 目的地設定ボタンのクリックイベントを追加
        const setDestinationBtn = this.div.querySelector(`#set-destination-btn-${place.id}`);
        if (setDestinationBtn) {
          setDestinationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSetDestination();
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
          new google.maps.LatLng(place.coordinates.lat, place.coordinates.lng)
        );

        if (position) {
          this.div.style.left = position.x - 100 + 'px'; // 中央揃え（幅200pxの半分）
          this.div.style.top = position.y - 140 + 'px'; // マーカーの上に表示
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
    const overlay = new CustomOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, shouldShowOverlay, place.coordinates, place.name, place.address, place.category, place.estimatedCost, place.id, scale]);

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      if (circleRef.current) {
        console.log(`Place component unmounting, removing circle ${place.id}`);
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [place.id]);

  const handleDelete = () => {
    console.log(`handleDelete called for place ${place.id}`);
    
    try {
      // オーバーレイを削除
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      
      // 円を削除
      if (circleRef.current) {
        console.log(`Removing place circle from map...`);
        circleRef.current.setMap(null);
        circleRef.current = null;
        console.log(`Place circle removed from map successfully`);
      }
      
      // マップから要素を削除完了
      
      // ストアから削除
      deletePlace(place.id);
      console.log(`Place removed from store: ${place.id}`);
      
    } catch (error) {
      console.error(`Error in place handleDelete:`, error);
    }
  };

  // 出発地として設定
  const handleSetOrigin = () => {
    console.log(`Setting origin: ${place.name}`);
    setSelectedOrigin({
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
      name: place.name
    });
    openRouteSearch();
  };

  // 目的地として設定
  const handleSetDestination = () => {
    console.log(`Setting destination: ${place.name}`);
    setSelectedDestination({
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
      name: place.name
    });
    openRouteSearch();
  };

  // カテゴリの絵文字を取得
  const getCategoryEmoji = () => {
    switch (place.category) {
      case 'restaurant':
        return '🍽️';
      case 'hotel':
        return '🏨';
      case 'sightseeing':
        return '🏛️';
      case 'transport':
        return '🚌';
      case 'shopping':
        return '🛍️';
      case 'other':
      default:
        return '📍';
    }
  };

  // カテゴリのラベルを取得
  const getCategoryLabel = () => {
    switch (place.category) {
      case 'restaurant':
        return 'レストラン';
      case 'hotel':
        return 'ホテル';
      case 'sightseeing':
        return '観光地';
      case 'transport':
        return '交通';
      case 'shopping':
        return 'ショッピング';
      case 'other':
      default:
        return 'その他';
    }
  };

  // 16進数カラーをRGBに変換
    const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `${r}, ${g}, ${b}`;
    }
    return '128, 128, 128'; // フォールバック
  };

  const handleClick = (e: google.maps.MapMouseEvent) => {
    console.log(`Place marker clicked for ${place.id}`);
    
    // Google MapsのデフォルトInfoWindowを防ぐ
    if (e) {
      e.stop?.();
      const domEvent = e.domEvent;
      if (domEvent) {
        domEvent.stopPropagation();
        domEvent.preventDefault();
        
        // 2地点間移動時間表示機能の地点選択
        if (isInSelectionMode) {
          console.log('Completing selection...');
          completeSelection(place.id);
          return;
        }
        
        // Ctrl+クリックで地点選択を開始
        const isCtrlClick = !isTouchDevice && 'ctrlKey' in domEvent && (domEvent as any).ctrlKey;
        if (isCtrlClick) {
          console.log('Starting selection...');
          startSelection(place.id, 'ctrl-click');
          return;
        }
      }
    }
    
    console.log('Normal click - no special action');
  };

  // 選択状態に応じてマーカーの外観を変更
  const getMarkerIcon = () => {
    // カテゴリ色を取得
    const categoryColor = getCategoryColor(place.category);
    
    // シンプルなサークルマーカーに変更
    const baseIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: categoryColor,
      fillOpacity: isSelected ? 0.9 : 0.7,
      strokeWeight: isSelected ? 3 : 2,
      strokeColor: isSelected ? '#FFD700' : '#ffffff',
      scale: isSelected ? 10 : 8,
    };

    return baseIcon;
  };

  return (
    <Marker
      position={place.coordinates}
      onClick={handleClick}
      onRightClick={(e: google.maps.MapMouseEvent) => {
        console.log(`Right click on place marker ${place.id} - deleting directly`);
        // Google MapsのデフォルトInfoWindowを防ぐ
        if (e) {
          e.stop?.();
          const domEvent = e.domEvent;
          if (domEvent) {
            domEvent.stopPropagation();
            domEvent.preventDefault();
          }
        }
        handleDelete();
      }}
      icon={getMarkerIcon()}
      options={{
        clickable: true,
        // 選択状態を視覚的に表現
        zIndex: isSelected ? 1000 : 500,
      }}
    />
  );
} 