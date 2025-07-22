import React from 'react';

interface Props {
  selectedDay?: number;
  onDayChange: (day: number | undefined) => void;
  maxDays?: number;
  className?: string;
  allDaysLabel?: string;
}

export default function DaySelector({ selectedDay, onDayChange, maxDays = 14, className = '', allDaysLabel = '未設定' }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onDayChange(value === '' ? undefined : parseInt(value));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor="day-selector" className="text-sm font-medium text-gray-700">
        予定日
      </label>
      <select
        id="day-selector"
        value={selectedDay || ''}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   hover:border-gray-400 transition-colors"
      >
        <option value="">{allDaysLabel}</option>
        {Array.from({ length: maxDays }, (_, i) => i + 1).map((day) => (
          <option key={day} value={day}>
            {day}日目
          </option>
        ))}
      </select>
    </div>
  );
} 