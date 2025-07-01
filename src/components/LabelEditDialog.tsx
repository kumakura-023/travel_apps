import { useState } from 'react';
import { MapLabel } from '../types';

interface Props {
  label: MapLabel;
  onSave: (update: Partial<MapLabel>) => void;
  onClose: () => void;
}

export default function LabelEditDialog({ label, onSave, onClose }: Props) {
  const [text, setText] = useState(label.text);
  const [color, setColor] = useState(label.color);
  const [fontSize, setFontSize] = useState(label.fontSize);
  const [width, setWidth] = useState(label.width);
  const [height, setHeight] = useState(label.height);
  const [fontFamily, setFontFamily] = useState(label.fontFamily);

  const handleSave = () => {
    onSave({ text, color, fontSize, width, height, fontFamily });
    onClose();
  };

  return (
    <div className="modal-backdrop flex items-center justify-center">
      <div className="glass-effect rounded-xl w-[320px] p-5 space-y-4 animate-spring">
        <h3 className="headline text-center text-system-label">ラベル編集</h3>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <label className="block">
            <span className="subheadline text-system-label mb-2 block">テキスト</span>
            <textarea
              className="input resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="ラベルテキストを入力"
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