import React from 'react';
import { PlaceNotification } from '../store/notificationStore';
import { getCategoryColor, getCategoryDisplayName, getCategoryEmoji } from '../utils/categoryIcons';
import { BellIcon } from '@heroicons/react/24/solid';

interface PlaceNotificationOverlayProps {
  notification: PlaceNotification;
  onConfirm: () => void;
  map: google.maps.Map;
  position: { x: number; y: number };
}

export const PlaceNotificationOverlay: React.FC<PlaceNotificationOverlayProps> = ({ 
  notification, 
  onConfirm,
  position 
}) => {
  const categoryColor = getCategoryColor(notification.placeCategory);
  const categoryEmoji = getCategoryEmoji(notification.placeCategory);
  const categoryName = getCategoryDisplayName(notification.placeCategory);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        pointerEvents: 'auto',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
        minWidth: '200px',
        maxWidth: '280px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -100%) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12), 0 12px 32px rgba(0, 0, 0, 0.16)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -100%) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
    >
      {/* 通知アイコン */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        left: '-8px',
        width: '24px',
        height: '24px',
        background: '#FF6B6B',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(255, 107, 107, 0.4)',
        border: '2px solid white',
      }}>
        <BellIcon style={{ width: '12px', height: '12px', color: 'white' }} />
      </div>

      {/* 上部: カテゴリアイコンと場所名 */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: categoryColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: 'white',
          boxShadow: `0 2px 8px ${categoryColor}33`,
          flexShrink: 0,
        }}>
          {categoryEmoji}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          <span style={{ 
            fontSize: '11px',
            color: categoryColor,
            fontWeight: 600,
            letterSpacing: '-0.078px',
            opacity: 0.9,
            lineHeight: '14px',
          }}>
            {categoryName}
          </span>
          <div style={{ 
            color: 'rgba(0, 0, 0, 0.85)',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.078px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '18px',
          }}>
            {notification.placeName}
          </div>
        </div>
      </div>

      {/* 中央: 追加者情報 */}
      <div style={{
        fontSize: '13px',
        color: 'rgba(0, 0, 0, 0.65)',
        marginBottom: '12px',
        textAlign: 'center',
        padding: '8px 0',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      }}>
        <span style={{ fontWeight: 500 }}>{notification.addedBy.displayName}</span>
        <span>さんが追加しました</span>
      </div>

      {/* 下部: 確認ボタン */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        style={{
          width: '100%',
          padding: '8px 16px',
          background: '#FF6B6B',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 8px rgba(255, 107, 107, 0.25)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FF5252';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#FF6B6B';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.25)';
        }}
      >
        確認
      </button>
    </div>
  );
};