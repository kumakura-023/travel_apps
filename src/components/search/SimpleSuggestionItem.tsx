import type { CSSProperties } from "react";

interface Props {
  prediction: google.maps.places.AutocompletePrediction;
  isFocused: boolean;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}

export default function SimpleSuggestionItem({
  prediction,
  isFocused,
  onClick,
  className = "",
  style,
}: Props) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer
                  transition-colors duration-150
                  ${
                    isFocused
                      ? "bg-coral-50/70 dark:bg-coral-500/15 border-l-3 border-l-coral-500"
                      : "hover:bg-white/70 dark:hover:bg-slate-800/70"
                  }
                  border-b border-white/40 dark:border-slate-800 last:border-b-0 ${className}`}
      role="option"
      aria-selected={isFocused}
    >
      {/* アイコン */}
      <div
        className="w-9 h-9 rounded-full bg-white/70 dark:bg-slate-700/80 
                      flex items-center justify-center flex-shrink-0 shadow-sm"
      >
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      {/* テキスト情報 */}
      <div className="flex-1 min-w-0">
        <span className="text-[15px] font-semibold text-slate-900 dark:text-white truncate block">
          {prediction.structured_formatting.main_text}
        </span>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
          {prediction.structured_formatting.secondary_text}
        </p>
      </div>
    </div>
  );
}
