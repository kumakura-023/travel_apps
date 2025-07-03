import React from 'react';
import { MdDirectionsWalk, MdDirectionsCar, MdDirectionsTransit, MdDelete } from 'react-icons/md';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import useMediaQuery from '../hooks/useMediaQuery';

export default function TravelTimeControls() {
  const { isDesktop } = useDeviceDetect();
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;
  
  const {
    selectingOrigin,
    startSelecting,
    cancelSelecting,
    mode,
    setMode,
    minutes,
    setMinutes,
    circles,
    clearAll,
  } = useTravelTimeMode((s) => ({
    selectingOrigin: s.selectingOrigin,
    startSelecting: s.startSelecting,
    cancelSelecting: s.cancelSelecting,
    mode: s.mode,
    setMode: s.setMode,
    minutes: s.minutes,
    setMinutes: s.setMinutes,
    circles: s.circles,
    clearAll: s.clearAll,
  }));

  const containerClasses = isDesktop || isTablet
    ? 'fixed top-[25%] right-4 transform -translate-y-1/2 glass-effect rounded-xl shadow-elevation-2 p-5 z-50 w-64 space-y-4'
    : 'fixed top-0 left-0 right-0 glass-effect border-b border-system-separator p-3 flex items-center justify-between z-30 safe-area-inset';

  const travelModes = [
    { key: 'walking', icon: <MdDirectionsWalk className="w-5 h-5" />, aria: '徒歩' },
    { key: 'driving', icon: <MdDirectionsCar className="w-5 h-5" />, aria: '車' },
    { key: 'transit', icon: <MdDirectionsTransit className="w-5 h-5" />, aria: '公共交通機関' },
  ] as const;

  return (
    <div className={containerClasses}>
      {isDesktop || isTablet ? (
        // デスクトップレイアウト（縦配置）
        <>
          {/* 起点選択ボタン */}
          <button
            className={`w-full px-4 py-3 rounded-lg font-medium text-[15px] tracking-[-0.24px]
                       transition-all duration-150 ease-ios-default
                       ${selectingOrigin 
                         ? 'bg-coral-500/20 text-coral-600 hover:bg-coral-500/30' 
                         : 'bg-coral-500 text-white hover:bg-coral-600 shadow-elevation-1'
                       }`}
            onClick={() => (selectingOrigin ? cancelSelecting() : startSelecting())}
          >
            {selectingOrigin ? 'キャンセル' : '起点を選択'}
          </button>

          {/* 移動手段選択 */}
          <div className="space-y-2">
            <label className="subheadline text-system-label">移動手段</label>
            <div className="flex gap-2">
              {travelModes.map((m) => (
                <button
                  key={m.key}
                  className={`flex-1 h-10 flex items-center justify-center rounded-lg border
                             transition-all duration-150 ease-ios-default
                             hover:scale-105 active:scale-95
                             ${
                               mode === m.key
                                 ? 'bg-coral-500 border-coral-500 text-white shadow-elevation-1'
                                 : 'bg-white border-system-separator text-system-secondary-label hover:border-coral-500/30 hover:text-coral-500'
                             }`}
                  onClick={() => setMode(m.key as any)}
                  aria-label={m.aria}
                  title={m.aria}
                >
                  {m.icon}
                </button>
              ))}
            </div>
          </div>

          {/* 時間範囲スライダー */}
          <div className="space-y-2">
            <label className="subheadline text-system-label">
              時間範囲: {minutes} 分
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full h-2 bg-system-secondary-background rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-coral-500 [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:shadow-elevation-1 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150
                         [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95"
            />
          </div>

          {/* すべてクリアボタン */}
          {circles.length > 0 && (
            <button
              className="w-full p-3 text-system-secondary-label hover:text-red-500
                         hover:bg-red-500/5 rounded-lg transition-all duration-150 ease-ios-default
                         flex items-center justify-center space-x-2"
              onClick={clearAll}
              aria-label="すべてクリア"
            >
              <MdDelete size={18} />
              <span className="footnote">すべてクリア</span>
            </button>
          )}
        </>
      ) : (
        // モバイルレイアウト（横配置）
        <>
          {/* 起点選択ボタン */}
          <button
            className={`px-4 py-2 rounded-lg font-medium text-[14px] tracking-[-0.24px]
                       transition-all duration-150 ease-ios-default
                       ${selectingOrigin 
                         ? 'bg-coral-500/20 text-coral-600' 
                         : 'bg-coral-500 text-white shadow-elevation-1'
                       }`}
            onClick={() => (selectingOrigin ? cancelSelecting() : startSelecting())}
          >
            {selectingOrigin ? 'キャンセル' : '起点選択'}
          </button>

          {/* 移動手段選択 */}
          <div className="flex items-center gap-2">
            {travelModes.map((m) => (
              <button
                key={m.key}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border
                           transition-all duration-150 ease-ios-default
                           ${
                             mode === m.key
                               ? 'bg-coral-500 border-coral-500 text-white'
                               : 'bg-white border-system-separator text-system-secondary-label'
                           }`}
                onClick={() => setMode(m.key as any)}
                aria-label={m.aria}
              >
                {React.cloneElement(m.icon, { className: 'w-4 h-4' })}
              </button>
            ))}
          </div>

          {/* 時間範囲スライダー */}
          <div className="flex-1 mx-3">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full h-2 bg-system-secondary-background rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-coral-500"
            />
            <span className="caption-2 block text-center mt-1 text-system-secondary-label">
              {minutes} 分
            </span>
          </div>

          {/* すべてクリアボタン */}
          {circles.length > 0 && (
            <button
              className="p-2 text-system-secondary-label hover:text-red-500
                         transition-colors duration-150"
              onClick={clearAll}
              aria-label="すべてクリア"
            >
              <MdDelete size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
