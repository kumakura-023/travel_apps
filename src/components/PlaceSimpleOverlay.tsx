import React from 'react';
import { Place } from '../types';

interface PlaceSimpleOverlayProps {
  place: Place;
  position: { x: number; y: number };
}

/**
 * マップ縮小時に表示するシンプルなオーバーレイ
 * カテゴリアイコンと場所の名前のみを表示
 */
export const PlaceSimpleOverlay: React.FC<PlaceSimpleOverlayProps> = ({ place, position }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ 
        color: place.category?.color || '#4ECDC4',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginBottom: '2px'
      }}>
        <span style={{ fontSize: '14px' }}>{place.category?.icon || '📍'}</span>
        <span style={{ fontSize: '11px', opacity: 0.8 }}>{place.category?.name || '場所'}</span>
      </div>
      <div style={{ 
        color: '#333',
        fontSize: '13px',
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {place.name}
      </div>
    </div>
  );
};