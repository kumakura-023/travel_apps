import { useState, useMemo } from 'react';
import { MapLabel } from '../types';
import { usePlacesStore } from '../store/placesStore';

interface Props {
  label: MapLabel;
  onSave: (update: Partial<MapLabel>) => void;
  onClose: () => void;
}

export default function LabelEditDialog({ label, onSave, onClose }: Props) {
  const { places } = usePlacesStore();
  const [text, setText] = useState(label.text);
  const [color, setColor] = useState(label.color);
  const [fontSize, setFontSize] = useState(label.fontSize);
  const [width, setWidth] = useState(label.width);
  const [height, setHeight] = useState(label.height);
  const [fontFamily, setFontFamily] = useState(label.fontFamily);
  const [linkedPlaceId, setLinkedPlaceId] = useState(label.linkedPlaceId || '');

  // メモの位置から近い候補地を取得（2km以内）
  const nearbyPlaces = useMemo(() => {
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371; // 地球の半径（km）
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    return places
      .map(place => ({
        ...place,
        distance: calculateDistance(
          label.position.lat, label.position.lng,
          place.coordinates.lat, place.coordinates.lng
        )
      }))
      .filter(place => place.distance <= 2) // 2km以内
      .sort((a, b) => a.distance - b.distance);
  }, [places, label.position]);

  const handleSave = () => {
    onSave({ 
      text, 
      color, 
      fontSize, 
      width, 
      height, 
      fontFamily,
      linkedPlaceId: linkedPlaceId || undefined
    });
    onClose();
  };

  return (
    <div className="modal-backdrop flex items-center justify-center">
      <div className="glass-effect rounded-xl w-[320px] p-5 space-y-4 animate-spring">
        <h3 className="headline text-center text-system-label">メモ編集</h3>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">テキスト</span>
            <textarea
              className="input resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="メモテキストを入力"
            />
          </label>
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">文字色</span>
            <input
              type="color"
              className="w-full h-10 border-0 rounded-lg cursor-pointer bg-system-secondary-background"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">フォントサイズ</span>
            <input
              type="range"
              min={4}
              max={48}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-coral-500"
            />
            <div className="footnote text-system-secondary-label text-center mt-1">
              {fontSize}px
            </div>
          </label>
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">幅</span>
            <input
              type="range"
              min={40}
              max={240}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-coral-500"
            />
            <div className="footnote text-system-secondary-label text-center mt-1">
              {width}px
            </div>
          </label>
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">高さ</span>
            <input
              type="range"
              min={16}
              max={120}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full accent-coral-500"
            />
            <div className="footnote text-system-secondary-label text-center mt-1">
              {height}px
            </div>
          </label>
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">フォント</span>
            <select
              className="input appearance-none bg-right"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          
          {/* 候補地とのリンク */}
          <div className="border-t border-system-separator/30 pt-4">
            <label className="block">
              <span className="subheadline text-system-label mb-2 block flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                候補地とリンク
              </span>
              <select
                className="input appearance-none bg-right"
                value={linkedPlaceId}
                onChange={(e) => setLinkedPlaceId(e.target.value)}
              >
                <option value="">リンクしない</option>
                {nearbyPlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name} ({place.distance.toFixed(1)}km)
                  </option>
                ))}
              </select>
              {nearbyPlaces.length === 0 && (
                <p className="caption-1 text-system-tertiary-label mt-1">
                  近くに候補地がありません（2km以内）
                </p>
              )}
              {linkedPlaceId && (
                <p className="caption-1 text-teal-600 mt-1">
                  この候補地にリンクされます
                </p>
              )}
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1 ease-ios-default duration-ios-fast" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn-primary flex-1 ease-ios-default duration-ios-fast"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
} 