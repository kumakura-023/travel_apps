interface Props {
  prediction: google.maps.places.AutocompletePrediction;
  detail: google.maps.places.PlaceResult | undefined;
  isLoading: boolean;
  isFocused: boolean;
  onClick: () => void;
}

export default function RichSuggestionItem({
  prediction,
  detail,
  isLoading,
  isFocused,
  onClick,
}: Props) {
  // 写真URL取得
  const photoUrl = detail?.photos?.[0]?.getUrl({ maxWidth: 96 });

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer
                  transition-colors duration-150
                  ${
                    isFocused
                      ? "bg-blue-50 dark:bg-blue-900/30 border-l-3 border-l-blue-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }
                  border-b border-slate-100 dark:border-slate-800 last:border-b-0`}
      role="option"
      aria-selected={isFocused}
    >
      {/* 写真サムネイル */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
        {isLoading && !detail ? (
          <div className="w-full h-full animate-pulse bg-slate-300 dark:bg-slate-600" />
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={prediction.structured_formatting.main_text}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg
              className="w-6 h-6"
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
        )}
      </div>

      {/* テキスト情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {prediction.structured_formatting.main_text}
          </span>

          {/* 評価バッジ */}
          {detail?.rating && (
            <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 flex-shrink-0">
              <span className="text-yellow-500">★</span>
              <span>{detail.rating.toFixed(1)}</span>
              {detail.user_ratings_total && (
                <span className="text-slate-400">
                  ({detail.user_ratings_total.toLocaleString()})
                </span>
              )}
            </span>
          )}

          {/* ローディング中のスケルトン */}
          {isLoading && !detail && (
            <span className="w-16 h-4 animate-pulse bg-slate-200 dark:bg-slate-600 rounded" />
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {prediction.structured_formatting.secondary_text}
        </p>
      </div>
    </div>
  );
}
