import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">設定</h2>
      <div>
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox" />
          <span className="text-sm">付箋表示を有効にする</span>
        </label>
      </div>
      <div>
        <label className="text-sm block mb-1">地図スタイル</label>
        <select className="border rounded p-2 text-sm w-full">
          <option>通常</option>
          <option>衛星</option>
          <option>地形</option>
        </select>
      </div>
      <div>
        <label className="text-sm block mb-1">言語</label>
        <select className="border rounded p-2 text-sm w-full">
          <option>日本語</option>
          <option>English</option>
        </select>
      </div>
      <div>
        <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm">データをエクスポート</button>
      </div>
    </div>
  );
};

export default Settings; 