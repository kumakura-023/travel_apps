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
      <div className="bg-white w-[300px] p-4 rounded shadow-lg space-y-3">
        <h3 className="text-lg font-semibold">ラベル編集</h3>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          <label className="block">
            <span className="text-sm">テキスト</span>
            <textarea
              className="mt-1 w-full border rounded p-1 text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
          </label>
          <label className="block">
            <span className="text-sm">文字色</span>
            <input
              type="color"
              className="ml-2"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm">フォントサイズ: {fontSize}px</span>
            <input
              type="range"
              min={4}
              max={48}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm">幅: {width}px</span>
            <input
              type="range"
              min={40}
              max={240}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm">高さ: {height}px</span>
            <input
              type="range"
              min={16}
              max={120}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm">フォント</span>
            <select
              className="mt-1 w-full border rounded p-1 text-sm"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary px-3 py-1 text-sm" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn-primary px-3 py-1 text-sm"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
} 