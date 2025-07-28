import React from 'react';
import { createPortal } from 'react-dom';

interface SafeRouteOverlayProps {
  routeId: string;
  position: { x: number; y: number };
  scale: number;
  content: {
    icon: string;
    label: string;
    duration: string;
    distance: string;
  };
  onDelete: () => void;
}

/**
 * 安全なルート情報オーバーレイコンポーネント
 * React Portalを使用してXSS脆弱性を回避
 */
export const SafeRouteOverlay: React.FC<SafeRouteOverlayProps> = ({
  routeId,
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
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(78, 205, 196, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
          minWidth: '300px',
          animation: 'modal-zoom-in 0.3s cubic-bezier(0.19, 0.91, 0.38, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(78, 205, 196, 0.03))',
            borderBottom: '1px solid rgba(78, 205, 196, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #4ECDC4, #4FD1C5)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                flexShrink: 0,
              }}
            >
              {content.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '28px',
                    lineHeight: '34px',
                    letterSpacing: '0.364px',
                    fontWeight: 700,
                    color: 'rgba(0, 0, 0, 0.85)',
                  }}
                >
                  {content.duration}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    lineHeight: '20px',
                    letterSpacing: '-0.24px',
                    color: 'rgba(0, 0, 0, 0.5)',
                    fontWeight: 500,
                  }}
                >
                  ({content.distance})
                </span>
              </div>
              <span
                style={{
                  fontSize: '13px',
                  lineHeight: '18px',
                  letterSpacing: '-0.078px',
                  color: '#4ECDC4',
                  fontWeight: 500,
                }}
              >
                {content.label}ルート
              </span>
            </div>
          </div>
          <button
            onClick={onDelete}
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255, 107, 107, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 107, 107, 0.25)',
              transition: 'all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(229, 62, 62, 0.95)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 500 }}>✕</span>
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes modal-zoom-in {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(${scale * 0.85}) translateY(8px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(${scale}) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );

  // ポータルを使用してbody直下にレンダリング
  return createPortal(overlayContent, document.body);
};