import React from 'react';
import { Place } from '../types';
import { getCategoryColor, getCategoryDisplayName, getCategoryEmoji } from '../utils/categoryIcons';
import { useSelectedPlaceStore } from '../store/placeStore';
import { FiInfo } from 'react-icons/fi';

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
  const { setPlace } = useSelectedPlaceStore();
  
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
        // インタラクション無効化（ボタン以外）
        pointerEvents: 'auto',
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
        {/* 詳細ボタン */}
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
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            marginLeft: '8px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${categoryColor}33`,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: categoryColor,
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = categoryColor;
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${categoryColor}66`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = categoryColor;
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
          }}
          title="詳細を見る"
        >
          <FiInfo size={14} />
        </button>
      </div>
    </div>
  );
};