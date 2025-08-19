import React, { useState, useEffect } from "react";
import { usePlanStore } from "../store/planStore";
import { savePlan } from "../services/storageService";
import { useAutoSave } from "../hooks/useAutoSave";

interface DateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { plan, updatePlan } = usePlanStore();
  const { saveImmediatelyCloud } = useAutoSave(plan);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (plan && isOpen) {
      setSelectedStartDate(plan.startDate);
      setSelectedEndDate(plan.endDate);
      if (plan.startDate) {
        setCurrentMonth(
          new Date(plan.startDate.getFullYear(), plan.startDate.getMonth(), 1),
        );
      }
    }
  }, [plan, isOpen]);

  if (!isOpen || !plan) return null;

  const save = () => {
    if (selectedStartDate) {
      const updatedPlan = {
        ...plan,
        startDate: selectedStartDate,
        endDate: selectedEndDate || selectedStartDate,
      };
      updatePlan(updatedPlan);
      savePlan(updatedPlan);
      if (saveImmediatelyCloud) saveImmediatelyCloud(updatedPlan);
      onClose();
    }
  };

  // カレンダー生成のヘルパー関数
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // 前月の空白日
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // 6週表示に固定するため、残りをnullで埋める
    while (days.length < 42) {
      days.push(null);
    }

    return days;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  };

  const isDateInRange = (date: Date) => {
    if (!selectedStartDate) return false;
    if (!selectedEndDate) return date.getTime() === selectedStartDate.getTime();
    return (
      date.getTime() >= selectedStartDate.getTime() &&
      date.getTime() <= selectedEndDate.getTime()
    );
  };

  const isDateSelected = (date: Date) => {
    return (
      (selectedStartDate && date.getTime() === selectedStartDate.getTime()) ||
      (selectedEndDate && date.getTime() === selectedEndDate.getTime())
    );
  };

  const handleDateClick = (date: Date) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // 新しい範囲の開始
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    } else {
      // 範囲の終了を設定
      if (date.getTime() >= selectedStartDate.getTime()) {
        setSelectedEndDate(date);
      } else {
        setSelectedStartDate(date);
        setSelectedEndDate(selectedStartDate);
      }
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(
      currentMonth.getMonth() + (direction === "next" ? 1 : -1),
    );
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (year: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(year);
    setCurrentMonth(newMonth);
  };

  const handleMonthChange = (month: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(month);
    setCurrentMonth(newMonth);
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const years = Array.from(
    { length: 11 },
    (_, i) => new Date().getFullYear() - 5 + i,
  );
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4
                 animate-modal-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-effect rounded-2xl w-full max-w-md p-6 space-y-5 
                   shadow-[0_32px_64px_0_rgba(0,0,0,0.4)] 
                   animate-modal-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-coral-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-coral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 className="headline text-system-label">日程を選択</h2>
        </div>

        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => navigateMonth("prev")}
            className="btn-text p-2 rounded-lg hover:bg-gray-100/50"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>

          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="flex items-center justify-center space-x-2 title-3 text-system-label font-semibold bg-white/50 hover:bg-gray-100/50 px-4 py-2 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-coral-500/50 border border-system-separator"
          >
            <span>{formatMonth(currentMonth)}</span>
            <svg
              className={`w-5 h-5 text-system-secondary-label transition-transform duration-200 ${isPickerOpen ? "transform rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={() => navigateMonth("next")}
            className="btn-text p-2 rounded-lg hover:bg-gray-100/50"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9,6 15,12 9,18" />
            </svg>
          </button>
        </div>

        {/* カレンダー */}
        <div className="bg-white/50 rounded-xl p-3 relative">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center py-2">
                <span className="caption-1 text-system-secondary-label font-medium">
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 grid-rows-6 gap-1">
            {days.map((date, index) => (
              <div key={index} className="relative">
                {date && (
                  <button
                    onClick={() => handleDateClick(date)}
                    className={`
                      w-full aspect-square flex items-center justify-center rounded-lg
                      text-[15px] font-medium transition-all duration-150
                      ${
                        isDateSelected(date)
                          ? "bg-coral-500 text-white shadow-elevation-2"
                          : isDateInRange(date)
                            ? "bg-coral-500/20 text-coral-600"
                            : "hover:bg-gray-100 text-system-label"
                      }
                      ${
                        date.getTime() < new Date().setHours(0, 0, 0, 0)
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      }
                    `}
                    disabled={date.getTime() < new Date().setHours(0, 0, 0, 0)}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>

          {isPickerOpen && (
            <div
              className="absolute inset-0 bg-system-secondary-background/90 backdrop-blur-sm z-10 flex flex-col p-3 rounded-xl animate-modal-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 grid grid-cols-2 gap-3 h-full overflow-hidden">
                <div className="h-full overflow-y-auto scrollbar-hide space-y-1">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`w-full py-2 rounded-lg text-center transition-colors duration-150 ${currentMonth.getFullYear() === year ? "bg-coral-500 text-white font-semibold" : "hover:bg-white/80"}`}
                    >
                      {year}年
                    </button>
                  ))}
                </div>
                <div className="h-full overflow-y-auto scrollbar-hide space-y-1">
                  {months.map((month) => (
                    <button
                      key={month}
                      onClick={() => handleMonthChange(month)}
                      className={`w-full py-2 rounded-lg text-center transition-colors duration-150 ${currentMonth.getMonth() === month ? "bg-coral-500 text-white font-semibold" : "hover:bg-white/80"}`}
                    >
                      {month + 1}月
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="btn-primary mt-3 py-2.5"
              >
                完了
              </button>
            </div>
          )}
        </div>

        {/* 選択状況表示 */}
        {selectedStartDate && (
          <div className="bg-coral-500/10 rounded-lg p-3 border border-coral-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-system-secondary-label">出発日:</span>
              <span className="text-coral-600 font-semibold">
                {selectedStartDate.toLocaleDateString("ja-JP")}
              </span>
            </div>
            {selectedEndDate && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-system-secondary-label">帰宅日:</span>
                <span className="text-coral-600 font-semibold">
                  {selectedEndDate.toLocaleDateString("ja-JP")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
          <button
            className="btn-text text-system-secondary-label hover:text-system-label"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="btn-primary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={save}
            disabled={!selectedStartDate}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateSelectionModal;
