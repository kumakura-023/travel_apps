import { useReducer, useRef, useCallback, useEffect, useMemo } from 'react';
import { setGlobalScrollLock } from '../utils/scrollLock';

// BottomSheetの状態を管理する型
export interface BottomSheetState {
  percent: number; // 0=全展開, 50=中間, 100=折り畳み
  isDragging: boolean;
  isExpanded: boolean;
}

// BottomSheet のアクション型
type BottomSheetAction =
  | { type: 'START_DRAG' }
  | { type: 'UPDATE_DRAG'; percent: number }
  | { type: 'END_DRAG'; percent: number; snapPoints: number[]; startY: number; endY: number }
  | { type: 'SET_PERCENT'; percent: number }
  | { type: 'EXPAND'; snapPoints: number[] }
  | { type: 'COLLAPSE'; snapPoints: number[] }
  | { type: 'CANCEL_DRAG' }
  | { type: 'TOGGLE'; snapPoints: number[] };

// スナップポイントから次の位置を計算するヘルパー関数
function getNextSnapPoint(
  currentPercent: number,
  snapPoints: number[],
  direction: 'up' | 'down' | 'nearest'
): number {
  const sortedPoints = [...snapPoints].sort((a, b) => a - b);
  
  if (direction === 'nearest') {
    // 最も近いポイントを選択
    return sortedPoints.reduce((prev, curr) => 
      Math.abs(curr - currentPercent) < Math.abs(prev - currentPercent) ? curr : prev
    );
  }
  
  if (direction === 'up') {
    // 現在値より小さい点のうち最大のもの
    const candidates = sortedPoints.filter(p => p < currentPercent);
    return candidates.length > 0 ? Math.max(...candidates) : currentPercent;
  }
  
  if (direction === 'down') {
    // 現在値より大きい点のうち最小のもの
    const candidates = sortedPoints.filter(p => p > currentPercent);
    return candidates.length > 0 ? Math.min(...candidates) : currentPercent;
  }
  
  return currentPercent;
}

// ドラッグ方向を判定する関数
function getDragDirection(startY: number, endY: number): 'up' | 'down' | 'nearest' {
  const deltaY = endY - startY;
  const threshold = 5; // ピクセル単位の閾値
  
  if (Math.abs(deltaY) <= threshold) {
    return 'nearest';
  }
  
  return deltaY < 0 ? 'up' : 'down';
}

// ステート管理のためのreducer
function bottomSheetReducer(state: BottomSheetState, action: BottomSheetAction): BottomSheetState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
      };

    case 'UPDATE_DRAG':
      return {
        ...state,
        percent: Math.max(0, Math.min(100, action.percent))
      };

    case 'END_DRAG': {
      const direction = getDragDirection(action.startY, action.endY);
      const targetPercent = getNextSnapPoint(action.percent, action.snapPoints, direction);

      return {
        ...state,
        percent: targetPercent,
        isDragging: false,
        isExpanded: targetPercent === 0,
      };
    }

    case 'SET_PERCENT':
      return {
        ...state,
        percent: Math.max(0, Math.min(100, action.percent)),
        isExpanded: action.percent === 0,
        isDragging: false,
      };

    case 'EXPAND': {
      const currentPercent = state.percent;
      const targetPercent = getNextSnapPoint(currentPercent, action.snapPoints, 'up');
      
      return {
        ...state,
        percent: targetPercent,
        isExpanded: targetPercent === 0,
        isDragging: false,
      };
    }

    case 'COLLAPSE': {
      const currentPercent = state.percent;
      const targetPercent = getNextSnapPoint(currentPercent, action.snapPoints, 'down');
      
      return {
        ...state,
        percent: targetPercent,
        isExpanded: targetPercent === 0,
        isDragging: false,
      };
    }

    case 'TOGGLE': {
      const currentPercent = state.percent;
      const sortedPoints = [...action.snapPoints].sort((a, b) => a - b);
      
      // 現在が最小値なら次の段階へ、それ以外なら最小値へ
      const targetPercent = currentPercent === sortedPoints[0] 
        ? getNextSnapPoint(currentPercent, action.snapPoints, 'down')
        : sortedPoints[0];
      
      return {
        ...state,
        percent: targetPercent,
        isExpanded: targetPercent === 0,
        isDragging: false,
      };
    }

    case 'CANCEL_DRAG':
      return {
        ...state,
        isDragging: false,
      };

    default:
      return state;
  }
}

// useBottomSheetフックの戻り値の型
export interface UseBottomSheetReturn {
  state: BottomSheetState;
  style: { transform: string; transition: string };
  bindHandleRef: (element: HTMLDivElement | null) => void;
  setPercent: (p: number) => void;
  expand: () => void;
  collapse: () => void;
  handleToggle: () => void;
}

// ドラッグ開始時の共通処理
interface DragStartEvent {
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

// ドラッグ中の共通処理
interface DragMoveEvent {
  clientY: number;
  preventDefault: () => void;
}

// ドラッグ終了時の共通処理
interface DragEndEvent {
  preventDefault: () => void;
}

/**
 * BottomSheet機能を提供するカスタムフック
 * PointerEventとTouchEventの両対応でタッチ・マウス操作を統一的に処理
 */
export function useBottomSheet(initialPercent: number = 50): UseBottomSheetReturn {
  // PWA/ブラウザ判定をメモ化
  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  // スナップポイントをメモ化
  const snapPoints = useMemo(() => {
    return isStandalone ? [20, 50, 80] : [50, 80];
  }, [isStandalone]);

  const [state, dispatch] = useReducer(bottomSheetReducer, {
    percent: initialPercent,
    isDragging: false,
    isExpanded: initialPercent === 0
  });

  // Pointer Events サポート判定
  const supportsPointer = typeof window !== 'undefined' && window.PointerEvent !== undefined;

  const handleRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const endY = useRef<number>(0);
  const initialPercentRef = useRef<number>(0);
  const pointerId = useRef<number | null>(null);
  const draggingRef = useRef<boolean>(false);
  const percentRef = useRef<number>(initialPercent);
  const viewportHeightRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  // state.percent が変化したら percentRef を更新
  useEffect(() => {
    percentRef.current = state.percent;
  }, [state.percent]);

  // 共通のドラッグ開始処理
  const handleDragStart = useCallback((e: DragStartEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startY.current = e.clientY;
    endY.current = e.clientY;
    initialPercentRef.current = percentRef.current;
    viewportHeightRef.current = window.innerHeight;
    draggingRef.current = true;
    
    // ページスクロールを無効化
    setGlobalScrollLock(true);
    
    dispatch({ type: 'START_DRAG' });
  }, []);

  // 共通のドラッグ中処理
  const handleDragMove = useCallback((e: DragMoveEvent) => {
    if (!draggingRef.current) return;
    
    e.preventDefault();
    
    const currentY = e.clientY;
    endY.current = currentY;
    const deltaY = currentY - startY.current;
    
    // 画面高さに対する変化量をパーセンテージで計算
    const viewportHeight = viewportHeightRef.current;
    const deltaPercent = (deltaY / viewportHeight) * 100;
    
    const newPercent = initialPercentRef.current + deltaPercent;
    
    percentRef.current = newPercent;
    
    dispatch({ type: 'UPDATE_DRAG', percent: newPercent });
  }, []);

  // 共通のドラッグ終了処理
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    if (!draggingRef.current) return;
    
    e.preventDefault();
    
    draggingRef.current = false;
    pointerId.current = null;
    
    // ページスクロールを復元
    setGlobalScrollLock(false);
    
    dispatch({ 
      type: 'END_DRAG', 
      percent: percentRef.current,
      snapPoints,
      startY: startY.current,
      endY: endY.current
    });
  }, [snapPoints]);

  // 共通のドラッグキャンセル処理
  const handleDragCancel = useCallback(() => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    pointerId.current = null;
    
    // ページスクロールを復元
    setGlobalScrollLock(false);
    
    dispatch({ type: 'CANCEL_DRAG' });
  }, []);

  // PointerEvent版ハンドラー
  const handlePointerDown = useCallback((e: PointerEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    pointerId.current = e.pointerId;
    
    // ポインターキャプチャを設定（指がハンドル外に出ても継続）
    target.setPointerCapture(e.pointerId);
    
    handleDragStart(e);
  }, [handleDragStart]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    handleDragMove(e);
  }, [handleDragMove]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    
    const target = e.currentTarget as HTMLDivElement;
    target.releasePointerCapture(e.pointerId);
    
    handleDragEnd(e);
  }, [handleDragEnd]);

  const handlePointerCancel = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    handleDragCancel();
  }, [handleDragCancel]);

  // TouchEvent版ハンドラー
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 1) return; // マルチタッチは無視
    
    const touch = e.touches[0];
    handleDragStart({
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation()
    });
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    handleDragMove({
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }, [handleDragMove]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return;
    
    handleDragEnd({
      preventDefault: () => e.preventDefault()
    });
  }, [handleDragEnd]);

  const handleTouchCancel = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return;
    handleDragCancel();
  }, [handleDragCancel]);

  // タップで開閉トグル（300msデバウンス）
  const handleToggle = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    tapTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'TOGGLE', snapPoints });
    }, 300);
  }, [snapPoints]);

  // ハンドル要素にイベントリスナーをバインドする関数
  const bindHandleRef = useCallback((element: HTMLDivElement | null) => {
    if (element === handleRef.current) return;

    // 既存のリスナーを削除
    if (handleRef.current) {
      if (supportsPointer) {
        handleRef.current.removeEventListener('pointerdown', handlePointerDown);
        handleRef.current.removeEventListener('pointermove', handlePointerMove);
        handleRef.current.removeEventListener('pointerup', handlePointerUp);
        handleRef.current.removeEventListener('pointercancel', handlePointerCancel);
      } else {
        handleRef.current.removeEventListener('touchstart', handleTouchStart);
        handleRef.current.removeEventListener('touchmove', handleTouchMove);
        handleRef.current.removeEventListener('touchend', handleTouchEnd);
        handleRef.current.removeEventListener('touchcancel', handleTouchCancel);
      }
    }

    handleRef.current = element;

    // 新しい要素にリスナーを追加
    if (element) {
      if (supportsPointer) {
        element.addEventListener('pointerdown', handlePointerDown, { passive: false });
        element.addEventListener('pointermove', handlePointerMove, { passive: false });
        element.addEventListener('pointerup', handlePointerUp, { passive: false });
        element.addEventListener('pointercancel', handlePointerCancel, { passive: false });
      } else {
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: false });
        element.addEventListener('touchcancel', handleTouchCancel, { passive: false });
      }
    }
  }, [
    supportsPointer,
    handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel,
    handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel
  ]);

  // 指定位置にスナップする関数
  const setPercent = useCallback((p: number) => {
    dispatch({ type: 'SET_PERCENT', percent: p });
  }, []);

  // 展開/縮小をトグルする関数
  const expand = useCallback(() => {
    dispatch({ type: 'EXPAND', snapPoints });
  }, [snapPoints]);

  const collapse = useCallback(() => {
    dispatch({ type: 'COLLAPSE', snapPoints });
  }, [snapPoints]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      
      if (handleRef.current) {
        if (supportsPointer) {
          handleRef.current.removeEventListener('pointerdown', handlePointerDown);
          handleRef.current.removeEventListener('pointermove', handlePointerMove);
          handleRef.current.removeEventListener('pointerup', handlePointerUp);
          handleRef.current.removeEventListener('pointercancel', handlePointerCancel);
        } else {
          handleRef.current.removeEventListener('touchstart', handleTouchStart);
          handleRef.current.removeEventListener('touchmove', handleTouchMove);
          handleRef.current.removeEventListener('touchend', handleTouchEnd);
          handleRef.current.removeEventListener('touchcancel', handleTouchCancel);
        }
      }
      
      // ドラッグ中にアンマウントされた場合のスクロールロック解除
      if (draggingRef.current) {
        setGlobalScrollLock(false);
      }
    };
  }, [
    supportsPointer,
    handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel,
    handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel
  ]);

  return {
    state,
    style: {
      transform: `translateY(${state.percent}%)`,
      transition: state.isDragging ? 'none' : 'transform 0.25s ease-out'
    },
    bindHandleRef,
    setPercent,
    expand,
    collapse,
    handleToggle
  };
} 