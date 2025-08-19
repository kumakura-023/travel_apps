import React from "react";
import { MdDirections } from "react-icons/md";
import { FiBookmark, FiSearch, FiCalendar } from "react-icons/fi";
import DaySelector from "../DaySelector";
import { TravelPlan, Place } from "../../types";

interface Props {
  saved: boolean;
  savedPlace?: Place;
  plan: TravelPlan | null;
  onRouteFromHere: () => void;
  onRouteToHere: () => void;
  onSavePlace: () => void;
  onNearbySearch: () => void;
  onDayChange: (day: number | undefined) => void;
}

export default function PlaceActions({
  saved,
  savedPlace,
  plan,
  onRouteFromHere,
  onRouteToHere,
  onSavePlace,
  onNearbySearch,
  onDayChange,
}: Props) {
  return (
    <div className="glass-effect rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRouteFromHere}
          className="flex flex-col items-center justify-center p-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-lg transition-all duration-150 ease-ios-default hover:shadow-elevation-2 active:scale-95"
          title="ここから出発"
        >
          <MdDirections size={24} className="text-teal-500 mb-2" />
          <span className="subheadline font-medium text-teal-600">
            ここから出発
          </span>
        </button>
        <button
          onClick={onRouteToHere}
          className="flex flex-col items-center justify-center p-4 bg-coral-500/10 hover:bg-coral-500/20 border border-coral-500/20 rounded-lg transition-all duration-150 ease-ios-default hover:shadow-elevation-2 active:scale-95"
          title="ここに向かう"
        >
          <MdDirections
            size={24}
            className="text-coral-500 mb-2 transform rotate-180"
          />
          <span className="subheadline font-medium text-coral-600">
            ここに向かう
          </span>
        </button>
      </div>
      <div className="flex items-center justify-center space-x-8 pt-2">
        <button
          onClick={onSavePlace}
          className="flex flex-col items-center justify-center p-2 group"
          title={saved ? "保存済み" : "保存"}
        >
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-200 ease-ios-default ${
              saved
                ? "border-coral-500 bg-coral-500 shadow-coral-glow"
                : "border-system-secondary-label/30 group-hover:border-coral-500 group-hover:bg-coral-500 group-active:bg-coral-600"
            }`}
          >
            <FiBookmark
              size={20}
              className={`transition-colors duration-200 ${saved ? "text-white" : "text-system-secondary-label group-hover:text-white group-active:text-white"}`}
            />
          </div>
          <span className="caption-1 text-system-secondary-label">
            {saved ? "保存済み" : "保存"}
          </span>
        </button>
        <button
          onClick={onNearbySearch}
          className="flex flex-col items-center justify-center p-2 group"
          title="付近を検索"
        >
          <div className="w-12 h-12 rounded-full border-2 border-system-secondary-label/30 flex items-center justify-center mb-2 transition-all duration-200 ease-ios-default group-hover:border-teal-500 group-hover:bg-teal-500 group-active:bg-teal-600">
            <FiSearch
              size={20}
              className="text-system-secondary-label group-hover:text-white group-active:text-white transition-colors duration-200"
            />
          </div>
          <span className="caption-1 text-system-secondary-label">
            付近を検索
          </span>
        </button>
      </div>
      {saved && plan && (
        <div className="pt-4 border-t border-system-separator/30 mt-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-6 h-6 text-coral-500 flex-shrink-0">
              <FiCalendar size={18} />
            </div>
            <span className="subheadline font-medium text-system-label">
              訪問日設定
            </span>
          </div>
          <DaySelector
            selectedDay={savedPlace?.scheduledDay}
            onDayChange={onDayChange}
            maxDays={
              plan && plan.endDate
                ? Math.ceil(
                    (plan.endDate.getTime() - plan.startDate!.getTime()) /
                      (1000 * 60 * 60 * 24),
                  ) + 1
                : 7
            }
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
