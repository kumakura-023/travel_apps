import React, { useEffect, useRef } from 'react';
import { Marker } from '@react-google-maps/api';
import { TravelCircle } from '../types/travelTime';
import { minutesToRadius, getTravelModeColor } from '../utils/travelTimeCalculator';
import { MdClose, MdDirectionsWalk, MdDirectionsCar, MdDirectionsTransit, MdAccessTime } from 'react-icons/md';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface Props {
  circle: TravelCircle;
  zoom?: number;
}

export default function TravelTimeCircle({ circle, zoom = 14 }: Props) {
  const { map } = useGoogleMaps();
  const { removeCircle, activeCircleId, setActiveCircle } = useTravelTimeMode(
    (s) => ({
      removeCircle: s.removeCircle,
      activeCircleId: s.activeCircleId,
      setActiveCircle: s.setActiveCircle,
    }),
  );

  const circleRef = useRef<google.maps.Circle | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const radius = minutesToRadius(circle.minutes, circle.mode);
  const color = getTravelModeColor(circle.mode);
  const isActive = activeCircleId === circle.id;

  // ズーム比率に応じたスケール計算（最大サイズを1/3に縮小、下限値を2倍に変更）
  const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));
  const shouldShowOverlay = zoom >= 12 && isActive;

  // 円を作成・更新
  useEffect(() => {
    if (!map) return;

    console.log(`Creating circle for ${circle.id}`);
    
    // 既存の円があれば削除
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // 新しい円を作成
    const newCircle = new google.maps.Circle({
      center: circle.center,
      radius: radius,
      fillColor: color,
      fillOpacity: 0.2,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      zIndex: 60,
      clickable: false,
      map: map,
    });

    circleRef.current = newCircle;

    // クリーンアップ関数
    return () => {
      console.log(`Cleaning up circle for ${circle.id}`);
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, circle.center.lat, circle.center.lng, radius, color, circle.id]);

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
          ">
            <!-- ヘッダー部分 -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background: linear-gradient(to right, rgb(239, 246, 255), rgba(219, 234, 254, 0.5));
            ">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; color: rgb(37, 99, 235);">
                  <span style="font-size: 16px;">${getModeIcon()}</span>
                  <span style="font-size: 14px; font-weight: 500;">${getModeLabel()}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; color: rgb(75, 85, 99);">
                  <span style="font-size: 12px;">⏰</span>
                  <span style="font-size: 12px;">${circle.minutes}分</span>
                </div>
              </div>
              <button 
                id="delete-btn-${circle.id}"
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
            
            <!-- メッセージ部分 -->
            <div style="padding: 8px 12px;">
              <p style="
                font-size: 12px;
                color: rgb(75, 85, 99);
                text-align: center;
                margin: 0;
              ">
                この範囲内に${circle.minutes}分で移動可能
              </p>
            </div>
          </div>
        `;

        // 削除ボタンのクリックイベントを追加
        const deleteBtn = this.div.querySelector(`#delete-btn-${circle.id}`);
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
          new google.maps.LatLng(circle.center.lat, circle.center.lng)
        );

        if (position) {
          this.div.style.left = position.x - 75 + 'px'; // 中央揃え
          this.div.style.top = position.y - 110 + 'px'; // マーカーの上に表示
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
  }, [map, shouldShowOverlay, circle.center, circle.minutes, circle.id, scale]);

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      if (circleRef.current) {
        console.log(`Component unmounting, removing circle ${circle.id}`);
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [circle.id]);

  const handleDelete = () => {
    console.log(`=== DELETE BUTTON CLICKED ===`);
    console.log(`Target circle ID: ${circle.id}`);
    
    try {
      // オーバーレイを削除
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      
      // 円を削除
      if (circleRef.current) {
        console.log(`Removing circle from map...`);
        circleRef.current.setMap(null);
        circleRef.current = null;
        console.log(`Circle removed from map successfully`);
      }
      
      // アクティブ状態をクリア
      setActiveCircle(null);
      
      // ストアから削除
      removeCircle(circle.id);
      console.log(`Circle removed from store: ${circle.id}`);
      
    } catch (error) {
      console.error(`Error in handleDelete:`, error);
    }
  };

  // 移動手段のアイコンを取得（テキスト版）
  const getModeIcon = () => {
    switch (circle.mode) {
      case 'walking':
        return '🚶';
      case 'driving':
        return '🚗';
      case 'transit':
        return '🚇';
      default:
        return '🚶';
    }
  };

  // 移動手段のラベルを取得
  const getModeLabel = () => {
    switch (circle.mode) {
      case 'walking':
        return '徒歩';
      case 'driving':
        return '車';
      case 'transit':
        return '公共交通機関';
      default:
        return '徒歩';
    }
  };

  return (
    <Marker
      position={circle.center}
      onClick={(e: google.maps.MapMouseEvent) => {
        console.log(`Marker clicked for ${circle.id}`);
        console.log(`Current isActive: ${isActive}, setting to: ${!isActive}`);
        // Google MapsのデフォルトInfoWindowを防ぐ
        if (e) {
          e.stop?.();
          const domEvent = e.domEvent;
          if (domEvent) {
            domEvent.stopPropagation();
            domEvent.preventDefault();
          }
        }
        setActiveCircle(isActive ? null : circle.id);
      }}
      onRightClick={(e: google.maps.MapMouseEvent) => {
        console.log(`Right click on marker ${circle.id} - deleting directly`);
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
      icon={{
        url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png',
        scaledSize: new google.maps.Size(27, 43),
        anchor: new google.maps.Point(13, 43),
      }}
      options={{
        clickable: true,
      }}
    />
  );
} 