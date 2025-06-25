import { useTravelTimeStore } from '../store/travelTimeStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export default function TravelTimeControls() {
  const { isDesktop } = useDeviceDetect();
  const {
    selectingOrigin,
    setSelectingOrigin,
    origin,
    setOrigin,
    mode,
    setMode,
    timeRange,
    setTimeRange,
  } = useTravelTimeStore((s) => ({
    selectingOrigin: s.selectingOrigin,
    setSelectingOrigin: s.setSelectingOrigin,
    origin: s.origin,
    setOrigin: s.setOrigin,
    mode: s.mode,
    setMode: s.setMode,
    timeRange: s.timeRange,
    setTimeRange: s.setTimeRange,
  }));

  const containerClasses = isDesktop
    ? 'fixed top-[25%] right-4 transform -translate-y-1/2 bg-white shadow-elevation-2 rounded-lg p-4 z-50 w-80'
    : 'fixed top-0 left-0 right-0 bg-white shadow-elevation-2 p-3 flex items-center justify-between z-30';

  return (
    <div className={containerClasses}>
      <button
        className={`btn-primary px-4 py-2 text-sm ${selectingOrigin ? 'opacity-60' : ''}`}
        onClick={() => {
          setOrigin(null);
          setSelectingOrigin(true);
        }}
        disabled={selectingOrigin}
      >
        {origin ? '起点を再選択' : '起点を選択'}
      </button>

      {/* Travel mode */}
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as any)}
        className="input ml-2 w-28"
      >
        <option value="WALKING">徒歩</option>
        <option value="DRIVING">車</option>
        <option value="TRANSIT">電車</option>
      </select>

      {/* Time range slider */}
      {isDesktop ? (
        <div className="mt-4">
          <label className="block text-sm mb-1">時間範囲: {timeRange} 分</label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
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
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="w-full"
          />
          <span className="block text-center text-xs mt-1">{timeRange} 分</span>
        </div>
      )}
    </div>
  );
} 