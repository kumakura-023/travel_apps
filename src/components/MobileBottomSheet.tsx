import React, { useEffect } from "react";
import { useBottomSheet } from "../hooks/useBottomSheet";

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  header?: React.ReactNode;
}

export default function MobileBottomSheet({
  children,
  isOpen,
  onClose,
  className = "",
  header,
}: Props) {
  // 100% (closed) -> 10% (expanded/nearly full screen)
  // Default snap points in hook are [10, 55, 80] for standalone, [20, 55] for browser
  const { state, style, bindHandleRef, setPercent } = useBottomSheet(100);

  // Handle open/close synchronization
  useEffect(() => {
    if (isOpen) {
      // Open to "half" state (55%) by default when opened
      setPercent(55);
    } else {
      setPercent(100);
    }
  }, [isOpen, setPercent]);

  // Handle close when dragged to bottom (100%)
  useEffect(() => {
    if (state.percent >= 95 && !state.isDragging && isOpen) {
      onClose();
    }
  }, [state.percent, state.isDragging, isOpen, onClose]);

  if (!isOpen && state.percent >= 95) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop (optional - fades in when expanded) */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-300 pointer-events-auto
                   ${state.percent < 25 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setPercent(100)}
      />

      <div
        style={style}
        className={`absolute bottom-0 left-0 right-0 h-[92vh] 
                   bg-system-grouped-background glass-effect-border 
                   rounded-t-[20px] shadow-2xl overflow-hidden pointer-events-auto
                   flex flex-col ${className}`}
      >
        {/* Handle Area - This is the drag target */}
        <div
          ref={bindHandleRef}
          className="w-full flex-none pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-white/50 dark:bg-black/20 backdrop-blur-md z-20"
        >
          {/* Handle Bar */}
          <div className="w-9 h-1 bg-system-separator/80 rounded-full mb-2" />

          {/* Optional Header Content (embedded in drag area) */}
          {header && <div className="w-full">{header}</div>}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-transparent relative">
          {children}
        </div>
      </div>
    </div>
  );
}
