import React, { useEffect, useRef } from 'react';
import { Marker } from '@react-google-maps/api';
import { Place } from '../types';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getCategoryColor, getCategoryIcon, getCategoryDisplayName } from '../utils/categoryIcons';
import { usePlacesStore } from '../store/placesStore';
import { usePlanStore } from '../store/planStore';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

interface Props {
  place: Place;
  zoom?: number;
}

export default function PlaceCircle({ place, zoom = 14 }: Props) {
  const { map } = useGoogleMaps();
  const { deletePlace, updatePlace } = usePlacesStore((s) => ({ 
    deletePlace: s.deletePlace,
    updatePlace: s.updatePlace
  }));
  const { plan } = usePlanStore();
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

        // design_ruleに沿ったReactコンポーネントの内容をHTMLとして設定
        this.div.innerHTML = `
          <div style="
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(${hexToRgb(color)}, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans JP', sans-serif;
            min-width: 240px;
            transform-origin: center bottom;
            animation: modal-zoom-in 0.3s cubic-bezier(0.19, 0.91, 0.38, 1);
          ">
            <!-- ヘッダー部分 -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 20px 12px 20px;
              background: linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.08), rgba(${hexToRgb(color)}, 0.03));
              border-bottom: 1px solid rgba(${hexToRgb(color)}, 0.12);
            ">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="
                  width: 28px;
                  height: 28px;
                  background: ${color};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 14px;
                  flex-shrink: 0;
                  box-shadow: 0 2px 8px rgba(${hexToRgb(color)}, 0.3);
                ">
                  ${getCategoryEmoji()}
                </div>
                <div style="
                  display: flex; 
                  align-items: center; 
                  gap: 8px; 
                  color: ${color};
                  font-weight: 600;
                ">
                  <span style="
                    font-size: 15px; 
                    line-height: 20px; 
                    letter-spacing: -0.24px;
                  ">${getCategoryLabel()}</span>
                </div>
              </div>
              <button 
                id="delete-btn-${place.id}"
                style="
                  width: 28px;
                  height: 28px;
                  background: rgba(239, 68, 68, 0.9);
                  color: white;
                  border: none;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
                  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  aspect-ratio: 1;
                  backdrop-filter: blur(8px);
                "
                onmouseover="this.style.background='rgba(220, 38, 38, 0.95)'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='scale(1)'"
                onmousedown="this.style.transform='scale(0.95)'"
                onmouseup="this.style.transform='scale(1.05)'"
              >
                <span style="font-size: 14px; font-weight: 500;">✕</span>
              </button>
            </div>
            
            <!-- コンテンツ部分 -->
            <div style="padding: 16px 20px 20px 20px;">
              <h3 style="
                font-size: 17px;
                line-height: 22px;
                letter-spacing: -0.408px;
                font-weight: 600;
                margin: 0 0 8px 0;
                color: rgba(0, 0, 0, 0.85);
              ">
                ${place.name}
              </h3>
              
              <!-- 日程設定 -->
              ${plan ? `
                <div style="
                  margin: 0 0 12px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  background: rgba(255, 107, 114, 0.08);
                  padding: 8px 12px;
                  border-radius: 8px;
                  border-left: 3px solid #FF6B72;
                ">
                  <span style="font-size: 12px; color: #FF6B72;">📅</span>
                  <label style="
                    font-size: 14px;
                    line-height: 20px;
                    letter-spacing: -0.24px;
                    color: #FF6B72;
                    font-weight: 500;
                    margin-right: 4px;
                  ">訪問日:</label>
                  <select 
                    id="day-selector-${place.id}"
                    style="
                      padding: 4px 8px;
                      border: 1px solid rgba(255, 107, 114, 0.3);
                      border-radius: 6px;
                      background: white;
                      color: #FF6B72;
                      font-size: 13px;
                      font-weight: 500;
                      outline: none;
                      cursor: pointer;
                      min-width: 70px;
                    "
                  >
                    <option value="">未設定</option>
                    ${generateDayOptions()}
                  </select>
                </div>
              ` : ''}
              
              ${place.estimatedCost > 0 ? `
                <div style="
                  font-size: 14px;
                  line-height: 20px;
                  letter-spacing: -0.24px;
                  color: #4ECDC4;
                  font-weight: 500;
                  margin: 0 0 16px 0;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                ">
                  <span style="font-size: 12px;">💰</span>
                  予想費用: ¥${place.estimatedCost.toLocaleString()}
                </div>
              ` : ''}
              
              <!-- ルート検索ボタン -->
              <div style="
                display: flex;
                gap: 8px;
                margin-top: 16px;
              ">
                <button 
                  id="set-origin-btn-${place.id}"
                  style="
                    flex: 1;
                    padding: 8px 12px;
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    line-height: 18px;
                    letter-spacing: -0.078px;
                    font-weight: 500;
                    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
                  "
                  onmouseover="this.style.background='rgba(22, 163, 74, 0.95)'; this.style.transform='scale(1.02)'"
                  onmouseout="this.style.background='rgba(34, 197, 94, 0.9)'; this.style.transform='scale(1)'"
                  onmousedown="this.style.transform='scale(0.98)'"
                  onmouseup="this.style.transform='scale(1.02)'"
                >
                  <span style="font-size: 11px;">🚀</span>
                  出発地
                </button>
                <button 
                  id="set-destination-btn-${place.id}"
                  style="
                    flex: 1;
                    padding: 8px 12px;
                    background: rgba(255, 107, 107, 0.9);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    line-height: 18px;
                    letter-spacing: -0.078px;
                    font-weight: 500;
                    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.25);
                  "
                  onmouseover="this.style.background='rgba(229, 62, 62, 0.95)'; this.style.transform='scale(1.02)'"
                  onmouseout="this.style.background='rgba(255, 107, 107, 0.9)'; this.style.transform='scale(1)'"
                  onmousedown="this.style.transform='scale(0.98)'"
                  onmouseup="this.style.transform='scale(1.02)'"
                >
                  <span style="font-size: 11px;">🎯</span>
                  目的地
                </button>
              </div>
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
        const deleteBtn = this.div.querySelector(`#delete-btn-${place.id}`);
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDelete();
          });
        }

        // 日程選択のイベントを追加
        const daySelector = this.div.querySelector(`#day-selector-${place.id}`) as HTMLSelectElement;
        if (daySelector) {
          // 現在の値を設定
          daySelector.value = place.scheduledDay ? place.scheduledDay.toString() : '';
          
          daySelector.addEventListener('change', (e) => {
            e.stopPropagation();
            const target = e.target as HTMLSelectElement;
            const selectedDay = target.value ? parseInt(target.value) : undefined;
            handleScheduledDayChange(selectedDay);
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
          this.div.style.left = position.x - 120 + 'px'; // 中央揃え（幅240pxの半分）
          this.div.style.top = position.y - 160 + 'px'; // マーカーの上に表示
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
      name: place.name,
    });
    openRouteSearch();
  };

  // 日程変更ハンドラー
  const handleScheduledDayChange = (day: number | undefined) => {
    updatePlace(place.id, { scheduledDay: day });
  };

  // 日程選択オプションを生成
  const generateDayOptions = () => {
    if (!plan || !plan.startDate) return '';
    
    const maxDays = plan.endDate 
      ? Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 
      : 7;
    
    const options = [];
    for (let i = 1; i <= maxDays; i++) {
      options.push(`<option value="${i}">${i}日目</option>`);
    }
    return options.join('');
  };

  const getCategoryEmoji = () => {
    const iconMapping: { [key: string]: string } = {
      'hotel': '🏨',
      'restaurant': '🍽️',
      'sightseeing': '🎯',
      'shopping': '🛍️',
      'transport': '🚉',
      'other': '📍'
    };
    return iconMapping[place.category] || iconMapping['other'];
  };

  const getCategoryLabel = () => {
    // PlaceCategory型に対応した共通関数を使用
    return getCategoryDisplayName(place.category);
  };

  // HEXカラーをRGBに変換する関数
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '0, 0, 0';
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