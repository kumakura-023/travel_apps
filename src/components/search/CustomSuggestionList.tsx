import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSuggestionStore } from "../../store/suggestionStore";
import RichSuggestionItem from "./RichSuggestionItem";
import SimpleSuggestionItem from "./SimpleSuggestionItem";

interface Props {
  onSelect: (placeId: string) => void;
  onClose: () => void;
  variant?: "dropdown" | "panel";
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function CustomSuggestionList({
  onSelect,
  onClose,
  variant = "dropdown",
  closeOnOutsideClick = true,
  className = "",
}: Props) {
  const { predictions, richDetails, isLoading, error } = useSuggestionStore();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, predictions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          if (focusedIndex >= 0 && predictions[focusedIndex]) {
            onSelect(predictions[focusedIndex].place_id);
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [predictions, focusedIndex, onSelect, onClose]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!closeOnOutsideClick) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeOnOutsideClick, onClose]);

  if (predictions.length === 0 && !isLoading && !error) {
    return null;
  }

  const containerClassName =
    variant === "panel"
      ? "w-full"
      : "absolute top-full left-0 right-0 mt-2 z-50";

  return (
    <div
      ref={listRef}
      className={`${containerClassName}
                 glass-effect-border
                 rounded-2xl shadow-2xl
                 ${variant === "panel" ? "max-h-[50vh]" : "max-h-[400px]"}
                 overflow-y-auto scrollbar-hide ${className}`}
      role="listbox"
    >
      {isLoading && predictions.length === 0 ? (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          検索中...
        </div>
      ) : error && predictions.length === 0 ? (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          {error}
        </div>
      ) : (
        predictions.map((prediction, index) => {
          const isRich = index < 3;
          const detail = richDetails.get(prediction.place_id);
          const animationStyle: CSSProperties = {
            animationDelay: `${index * 45}ms`,
          };

          return isRich ? (
            <RichSuggestionItem
              key={prediction.place_id}
              prediction={prediction}
              detail={detail}
              isLoading={isLoading && !detail}
              isFocused={focusedIndex === index}
              onClick={() => onSelect(prediction.place_id)}
              className="animate-slide-up-fade"
              style={animationStyle}
            />
          ) : (
            <SimpleSuggestionItem
              key={prediction.place_id}
              prediction={prediction}
              isFocused={focusedIndex === index}
              onClick={() => onSelect(prediction.place_id)}
              className="animate-slide-up-fade"
              style={animationStyle}
            />
          );
        })
      )}
    </div>
  );
}
