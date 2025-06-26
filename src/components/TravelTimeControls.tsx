import { MdDirectionsWalk, MdDirectionsCar, MdTrain, MdDelete } from 'react-icons/md';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';

export default function TravelTimeControls() {
  const { isDesktop } = useDeviceDetect();
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

  const containerClasses = isDesktop
    ? 'fixed top-[25%] right-4 transform -translate-y-1/2 bg-white shadow-elevation-2 rounded-lg p-4 z-50 w-64'
    : 'fixed top-0 left-0 right-0 bg-white shadow-elevation-2 p-3 flex items-center justify-between z-30';

  const travelModes = [
    { key: 'walking', icon: <MdDirectionsWalk className="w-5 h-5" />, aria: '徒歩' },
    { key: 'driving', icon: <MdDirectionsCar className="w-5 h-5" />, aria: '車' },
    { key: 'transit', icon: <MdTrain className="w-5 h-5" />, aria: '電車' },
  ] as const;

  return (
    <div className={containerClasses}>
      {/* 起点選択ボタン */}
      <button
        className={`btn-primary px-4 py-2 text-sm ${selectingOrigin ? 'opacity-60' : ''}`}
        onClick={() => (selectingOrigin ? cancelSelecting() : startSelecting())}
      >
        {selectingOrigin ? 'キャンセル' : '起点を選択'}
      </button>

      {/* 移動手段選択 */}
      <div className="flex items-center gap-4 ml-4">
        {travelModes.map((m) => (
          <button
            key={m.key}
            className={`w-10 h-10 flex items-center justify-center rounded-md border transition-colors duration-150 ${
              mode === m.key
                ? 'bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setMode(m.key as any)}
            aria-label={m.aria}
          >
            {m.icon}
          </button>
        ))}
      </div>

      {/* 時間範囲スライダー */}
      {isDesktop ? (
        <div className="mt-4 w-full">
          <label className="block text-sm mb-1">時間範囲: {minutes} 分</label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full"
          />
        </div>
      ) : (
        <div className="flex-1 mx-3">
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full"
          />
          <span className="block text-center text-xs mt-1">{minutes} 分</span>
        </div>
      )}

      {/* すべてクリアボタン */}
      {circles.length > 0 && (
        <button
          className="ml-2 p-2 text-gray-500 hover:text-red-600"
          onClick={clearAll}
          aria-label="すべてクリア"
        >
          <MdDelete size={20} />
        </button>
      )}
    </div>
  );
}
