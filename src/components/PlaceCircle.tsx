import React, { useMemo } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { Place } from '../types';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { usePlanStore } from '../store/planStore';
import { useRouteSearchStore } from '../store/routeStoreMigration';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { getCategoryColor, getCategoryDisplayName } from '../utils/categoryIcons';
import { PlaceSimpleOverlay } from './PlaceSimpleOverlay';
import { useSelectedPlaceStore } from '../store/selectedPlaceStore';
import { FiInfo } from 'react-icons/fi';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../hooks/useAuth';

interface Props {
  place: Place;
  zoom?: number;
}

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

const getCategoryEmoji = (category: string) => {
  const iconMapping: { [key: string]: string } = {
    'hotel': '🏨', 'restaurant': '🍽️', 'sightseeing': '🎯',
    'shopping': '🛍️', 'transport': '🚉', 'other': '📍'
  };
  return iconMapping[category] || iconMapping['other'];
};

export default function PlaceCircle({ place, zoom = 14 }: Props) {
  const { deletePlace, updatePlace } = useSavedPlacesStore();
  const { plan } = usePlanStore();
  const { setSelectedOrigin, setSelectedDestination, openRouteSearch } = useRouteSearchStore();
  const { isTouchDevice } = useDeviceDetect();
  const { setPlace } = useSelectedPlaceStore();
  const { user } = useAuthStore();
  const { notifications, getNotificationsByPlan, isReadByUser } = useNotificationStore();

  // この地点に未読通知があるかチェック（自分が追加した場所は除外）
  const hasUnreadNotification = useMemo(() => {
    if (!plan || !user) return false;
    const planNotifications = getNotificationsByPlan(plan.id, user.uid);
    return planNotifications.some(n => 
      n.placeId === place.id && 
      !isReadByUser(n, user.uid) && 
      n.addedBy.uid !== user.uid // 自分が追加した場所の通知は除外
    );
  }, [plan, user, place.id, getNotificationsByPlan, isReadByUser, notifications]); // notifications配列も依存に追加

  const color = getCategoryColor(place.category);
  const shouldShowOverlay = zoom >= 15; // より高いズームレベルで詳細表示
  const shouldShowSimpleOverlay = zoom < 15 && zoom >= 6; // 簡易表示の範囲を拡大
  const scale = Math.max(0.34, Math.min(0.67, Math.pow(2, zoom - 14) / 3));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deletePlace(place.id);
  };

  const handleScheduledDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const selectedDay = e.target.value ? parseInt(e.target.value) : undefined;
    updatePlace(place.id, { scheduledDay: selectedDay });
  };

  const handleSetOrigin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrigin({ lat: place.coordinates.lat, lng: place.coordinates.lng, name: place.name });
    openRouteSearch();
  };

  const handleSetDestination = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDestination({ lat: place.coordinates.lat, lng: place.coordinates.lng, name: place.name });
    openRouteSearch();
  };

  
  const generateDayOptions = () => {
    if (!plan?.startDate) return null;
    const maxDays = plan.endDate ? Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 7;
    return Array.from({ length: maxDays }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日目</option>);
  };

  const colorRgb = React.useMemo(() => hexToRgb(color), [color]);

  return (
    <>
      {/* 簡易オーバーレイ（ズーム6〜10） - 未読通知がある場合は非表示 */}
      {shouldShowSimpleOverlay && !hasUnreadNotification && (
        <OverlayView
          position={place.coordinates}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <PlaceSimpleOverlay place={place} position={{ x: 0, y: 0 }} />
        </OverlayView>
      )}
      {/* 詳細オーバーレイ（ズーム12以上） - 未読通知がある場合は非表示 */}
      {shouldShowOverlay && !hasUnreadNotification && (
        <OverlayView
          position={place.coordinates}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-100% - 10px)) scale(${scale})`,
              transformOrigin: 'center bottom',
              pointerEvents: 'auto',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '16px',
              boxShadow: `0 8px 30px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(${colorRgb}, 0.25)`,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans JP\', sans-serif',
              minWidth: '240px',
            }}
            onClick={(e) => e.stopPropagation()} // オーバーレイ全体でイベント伝播を停止
            onMouseDown={(e) => e.stopPropagation()} // マウスダウンでも伝播を停止
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px 12px 20px',
                background: `linear-gradient(135deg, rgba(${colorRgb}, 0.08), rgba(${colorRgb}, 0.03))`,
                borderBottom: `1px solid rgba(${colorRgb}, 0.12)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px', background: color, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '14px', flexShrink: 0,
                    boxShadow: `0 2px 8px rgba(${colorRgb}, 0.3)`,
                  }}>
                    {getCategoryEmoji(place.category)}
                  </div>
                  <div style={{ color: color, fontWeight: 600 }}>
                    <span style={{ fontSize: '15px', lineHeight: '20px', letterSpacing: '-0.24px' }}>
                      {getCategoryDisplayName(place.category)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDelete}
                  onMouseDown={(e) => e.stopPropagation()} // マウスダウンでも伝播を停止
                  style={{
                    width: '28px', height: '28px', background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>✕</span>
                </button>
              </div>
              {/* Content */}
              <div style={{ padding: '16px 20px 20px 20px' }}>
                <h3 style={{
                  fontSize: '17px', lineHeight: '22px', letterSpacing: '-0.408px',
                  fontWeight: 600, margin: '0 0 8px 0', color: 'rgba(0, 0, 0, 0.85)',
                }}>
                  {place.name}
                </h3>
                {plan && (
                  <div style={{
                    margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255, 107, 114, 0.08)', padding: '8px 12px',
                    borderRadius: '8px', borderLeft: '3px solid #FF6B72',
                  }}
                  onClick={(e) => e.stopPropagation()} // コンテナ全体でイベント伝播を停止
                  onMouseDown={(e) => e.stopPropagation()} // マウスダウンでも伝播を停止
                  >
                    <span style={{ fontSize: '12px', color: '#FF6B72' }}>📅</span>
                    <label style={{ fontSize: '14px', color: '#FF6B72', fontWeight: 500, marginRight: '4px' }}>
                      訪問日:
                    </label>
                    <select
                      value={place.scheduledDay || ''}
                      onChange={handleScheduledDayChange}
                      onClick={(e) => e.stopPropagation()} // Prevent map click
                      onMouseDown={(e) => e.stopPropagation()} // マウスダウンでも伝播を停止
                      onFocus={(e) => e.stopPropagation()} // フォーカス時も伝播を停止
                      style={{
                        padding: '4px 8px', border: '1px solid rgba(255, 107, 114, 0.3)',
                        borderRadius: '6px', background: 'white', color: 'rgba(0, 0, 0, 0.85)',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        pointerEvents: 'auto', // 明示的にポインターイベントを有効化
                      }}
                    >
                      <option value="">未設定</option>
                      {generateDayOptions()}
                    </select>
                  </div>
                )}
                {place.estimatedCost > 0 && (
                  <div style={{
                    fontSize: '14px', color: '#4ECDC4', fontWeight: 500,
                    margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ fontSize: '12px' }}>💰</span>
                    予想費用: ¥{place.estimatedCost.toLocaleString()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={handleSetOrigin} onMouseDown={(e) => e.stopPropagation()} style={{ flex: 1, padding: '8px 12px', background: 'rgba(34, 197, 94, 0.9)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px' }}>🚀</span> 出発地
                  </button>
                  <button onClick={handleSetDestination} onMouseDown={(e) => e.stopPropagation()} style={{ flex: 1, padding: '8px 12px', background: 'rgba(255, 107, 107, 0.9)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px' }}>🎯</span> 目的地
                  </button>
                </div>
                {/* 詳細パネルを開くボタン */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlace({
                        place_id: place.id,
                        name: place.name,
                        formatted_address: place.address,
                        geometry: {
                          location: {
                            lat: () => place.coordinates.lat,
                            lng: () => place.coordinates.lng,
                          } as google.maps.LatLng,
                        },
                        types: [place.category],
                        photos: place.photos?.map(url => ({
                          getUrl: () => url
                        } as google.maps.places.PlacePhoto)),
                      } as google.maps.places.PlaceResult);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: `linear-gradient(135deg, rgba(${colorRgb}, 0.9), rgba(${colorRgb}, 0.8))`,
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: `0 2px 8px rgba(${colorRgb}, 0.3)`,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 4px 12px rgba(${colorRgb}, 0.4)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = `0 2px 8px rgba(${colorRgb}, 0.3)`;
                    }}
                  >
                    <FiInfo size={16} />
                    <span>詳細を見る</span>
                  </button>
                </div>
              </div>
            </div>
        </OverlayView>
      )}
    </>
  );
}