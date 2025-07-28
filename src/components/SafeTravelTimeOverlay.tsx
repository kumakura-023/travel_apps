import React from 'react';
import { createPortal } from 'react-dom';

interface SafeTravelTimeOverlayProps {
  circleId: string;
  position: { x: number; y: number };
  scale: number;
  content: {
    icon: string;
    label: string;
    minutes: number;
  };
  onDelete: () => void;
}

/**
 * 安全な移動時間円オーバーレイコンポーネント
 * React Portalを使用してXSS脆弱性を回避
 */
export const SafeTravelTimeOverlay: React.FC<SafeTravelTimeOverlayProps> = ({
  circleId,
  position,
  scale,
  content,
  onDelete,
}) => {
  const overlayContent = (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -100%) scale(${scale})`,
        transformOrigin: 'center bottom',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ヘッダー部分 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            background: 'linear-gradient(to right, rgb(239, 246, 255), rgba(219, 234, 254, 0.5))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgb(37, 99, 235)' }}>
              <span style={{ fontSize: '16px' }}>{content.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{content.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgb(75, 85, 99)' }}>
              <span style={{ fontSize: '12px' }}>⏰</span>
              <span style={{ fontSize: '12px' }}>{content.minutes}分</span>
            </div>
          </div>
          <button
            onClick={onDelete}
            style={{
              width: '24px',
              height: '24px',
              background: 'rgb(239, 68, 68)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'background-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              aspectRatio: '1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(220, 38, 38)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgb(239, 68, 68)';
            }}
          >
            <span style={{ fontSize: '12px' }}>✕</span>
          </button>
        </div>
        
        {/* メッセージ部分 */}
        <div style={{ padding: '8px 12px' }}>
          <p
            style={{
              fontSize: '12px',
              color: 'rgb(75, 85, 99)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            この範囲内に{content.minutes}分で移動可能
          </p>
        </div>
      </div>
    </div>
  );

  // ポータルを使用してbody直下にレンダリング
  return createPortal(overlayContent, document.body);
};