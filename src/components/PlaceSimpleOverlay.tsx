import React from 'react';
import { Place } from '../types';
import { getCategoryColor, getCategoryDisplayName, getCategoryEmoji } from '../utils/categoryIcons';

interface PlaceSimpleOverlayProps {
  place: Place;
  position: { x: number; y: number };
}

/**
 * マップ縮小時に表示するシンプルなオーバーレイ
 * カテゴリアイコンと場所の名前のみを表示
 */
export const PlaceSimpleOverlay: React.FC<PlaceSimpleOverlayProps> = ({ place, position }) => {
  const categoryColor = getCategoryColor(place.category);
  const categoryEmoji = getCategoryEmoji(place.category);
  const categoryName = getCategoryDisplayName(place.category);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        // Apple風のガラスモーフィズム効果
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        // 洗練された角丸とパディング
        padding: '8px 12px',
        borderRadius: '12px', // iOS風の角丸
        // Apple風の繊細な影
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 20px rgba(0, 0, 0, 0.08)',
        // 細いボーダーでエッジを強調
        border: '1px solid rgba(255, 255, 255, 0.2)',
        // インタラクション無効化
        pointerEvents: 'none',
        // アニメーション対応
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        // Apple風のフォント設定
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
      }}
    >
      {/* カテゴリ情報 */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px'
      }}>
        {/* カテゴリアイコン（バッジ風） */}
        <div style={{
          width: '20px',
          height: '20px',
          background: categoryColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: 'white',
          boxShadow: `0 2px 8px ${categoryColor}33`,
          flexShrink: 0,
        }}>
          {categoryEmoji}
        </div>
        {/* カテゴリ名 */}
        <span style={{ 
          fontSize: '11px',
          color: categoryColor,
          fontWeight: 600,
          letterSpacing: '-0.078px', // caption-1相当
          opacity: 0.9,
        }}>
          {categoryName}
        </span>
      </div>
      {/* 場所の名前 */}
      <div style={{ 
        color: 'rgba(0, 0, 0, 0.85)', // system-label相当
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '-0.078px', // footnote相当
        maxWidth: '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '16px',
      }}>
        {place.name}
      </div>
    </div>
  );
};