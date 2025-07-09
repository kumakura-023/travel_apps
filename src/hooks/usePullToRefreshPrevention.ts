import { useEffect, useRef } from 'react';

/**
 * プルツーリフレッシュを防止するカスタムフック
 * BottomSheetが展開状態の時にのみ動作
 */
export function usePullToRefreshPrevention(
  isPanelActive: boolean,
  isMobile: boolean,
  isDragging: boolean = false,
  onOverscrollDown?: () => void,
  targetElement?: HTMLElement | null,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const isOverscrollCallbackTriggered = useRef<boolean>(false);

  useEffect(() => {
    if (!isMobile || !isPanelActive) return;

    // targetElementが指定された場合はそれを使用、そうでなければcontentRefを使用
    const element = targetElement || contentRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      isOverscrollCallbackTriggered.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // BottomSheet のドラッグ中はプルツーリフレッシュ制御をスキップ
      if (isDragging) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;
      
      const atTop = element.scrollTop === 0;
      const isPullDown = deltaY > 10;
      
      if (atTop && isPullDown) {
        e.preventDefault(); // P2R 完全阻止
        if (!isOverscrollCallbackTriggered.current) {
          isOverscrollCallbackTriggered.current = true;
          onOverscrollDown?.(); // パネル55%へ
        }
      }
      // ★ 最下端 overscroll は一切触らない
    };

    const handleTouchEnd = (e: TouchEvent) => {
      startY.current = 0;
      isOverscrollCallbackTriggered.current = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isPanelActive, isDragging, onOverscrollDown, targetElement]);

  return { contentRef };
} 