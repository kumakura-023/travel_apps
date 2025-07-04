import { useEffect, useRef } from 'react';

/**
 * プルツーリフレッシュを防止するカスタムフック
 * BottomSheetが展開状態の時にのみ動作
 */
export function usePullToRefreshPrevention(
  isExpanded: boolean,
  isMobile: boolean,
  isDragging: boolean = false,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);

  useEffect(() => {
    if (!isMobile || !isExpanded || !contentRef.current) return;

    const content = contentRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // BottomSheet のドラッグ中はプルツーリフレッシュ制御をスキップ
      if (isDragging) return;

      // 展開状態でスクロール位置が上端の場合、プルツーリフレッシュを防ぐ
      if (content.scrollTop === 0) {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY.current;
        
        if (deltaY > 10) { // 下方向のスワイプ
          e.preventDefault();
        }
      }
    };

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      content.removeEventListener('touchstart', handleTouchStart);
      content.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isMobile, isExpanded, isDragging]);

  return { contentRef };
} 