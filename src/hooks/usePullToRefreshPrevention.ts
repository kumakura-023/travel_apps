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
      
      if (deltaY > 10) { // 下方向のスワイプ
        // 確実にpull-to-refreshを抑制するため常にpreventDefault()を実行
        e.preventDefault();
        
        // スクロール上端に達している場合のみオーバースクロール処理を実行
        if (element.scrollTop === 0) {
          // パネルのドラッグ状態を考慮して二重処理を防止
          if (!isDragging && !isOverscrollCallbackTriggered.current) {
            isOverscrollCallbackTriggered.current = true;
            onOverscrollDown?.();
          }
        }
      }
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