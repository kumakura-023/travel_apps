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
        // 洗練された角丸とパディング（横長デザイン用）
        padding: '6px 10px',
        borderRadius: '10px', // iOS風の角丸
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
      {/* 横長レイアウト */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* カテゴリアイコン（バッジ風） */}
        <div style={{
          width: '24px',
          height: '24px',
          background: categoryColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'white',
          boxShadow: `0 2px 8px ${categoryColor}33`,
          flexShrink: 0,
        }}>
          {categoryEmoji}
        </div>
        {/* テキスト情報 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0, // テキストの省略を有効にする
        }}>
          {/* カテゴリ名 */}
          <span style={{ 
            fontSize: '10px',
            color: categoryColor,
            fontWeight: 600,
            letterSpacing: '-0.078px',
            opacity: 0.9,
            lineHeight: '12px',
          }}>
            {categoryName}
          </span>
          {/* 場所の名前 */}
          <div style={{ 
            color: 'rgba(0, 0, 0, 0.85)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '-0.078px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '14px',
          }}>
            {place.name}
          </div>
        </div>
      </div>
    </div>
  );
};