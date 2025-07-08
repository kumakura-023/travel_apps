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
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const isOverscrollCallbackTriggered = useRef<boolean>(false);

  useEffect(() => {
    if (!isMobile || !isPanelActive || !contentRef.current) return;

    const content = contentRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      isOverscrollCallbackTriggered.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // BottomSheet のドラッグ中はプルツーリフレッシュ制御をスキップ
      if (isDragging) return;

      // 展開状態でスクロール位置が上端の場合、プルツーリフレッシュを防ぐ
      if (content.scrollTop <= 1) {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY.current;
        
        if (deltaY > 10) { // 下方向のスワイプ
          // 確実にpull-to-refreshを抑制するため常にpreventDefault()を実行
          e.preventDefault();
          
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

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchmove', handleTouchMove, { passive: false });
    content.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      content.removeEventListener('touchstart', handleTouchStart);
      content.removeEventListener('touchmove', handleTouchMove);
      content.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isPanelActive, isDragging, onOverscrollDown]);

  return { contentRef };
} 