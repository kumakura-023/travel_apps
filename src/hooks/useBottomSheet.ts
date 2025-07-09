import { useReducer, useRef, useCallback, useEffect, useMemo } from 'react';
import { setGlobalScrollLock } from '../utils/scrollLock';
import { useBottomSheetStore } from '../store/bottomSheetStore';

// 新しい定数をexport
export const DRAG_THRESHOLD_PX = 25;
export const DEFAULT_SNAP_POINTS_BROWSER = [20, 55];

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
  | { type: 'SET_PERCENT'; percent: number; snapPoints: number[] }
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
  const threshold = DRAG_THRESHOLD_PX; // 新しい定数を使用
  
  if (Math.abs(deltaY) <= threshold) {
    return 'nearest';
  }
  
  return deltaY < 0 ? 'up' : 'down';
}

// テストケース（開発時のみ）:
// snapPoints = [20, 55] の場合:
// - getNextSnapPoint(30, [20, 55], 'up') => 20 (上方向への1段階移動)
// - getNextSnapPoint(30, [20, 55], 'down') => 55 (下方向への1段階移動)
// - getNextSnapPoint(37.5, [20, 55], 'nearest') => 20 or 55 (より近い方)

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
        isExpanded: targetPercent === action.snapPoints[0],
      };
    }

    case 'SET_PERCENT': {
      const minSnap = action.snapPoints[0];
      return {
        ...state,
        percent: Math.max(0, Math.min(100, action.percent)),
        isExpanded: action.percent === minSnap,
        isDragging: false,
      };
    }

    case 'EXPAND': {
      const currentPercent = state.percent;
      const targetPercent = getNextSnapPoint(currentPercent, action.snapPoints, 'up');
      
      return {
        ...state,
        percent: targetPercent,
        isExpanded: targetPercent === action.snapPoints[0],
        isDragging: false,
      };
    }

    case 'COLLAPSE': {
      const currentPercent = state.percent;
      const targetPercent = getNextSnapPoint(currentPercent, action.snapPoints, 'down');
      
      return {
        ...state,
        percent: targetPercent,
        isExpanded: targetPercent === action.snapPoints[0],
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
        isExpanded: targetPercent === sortedPoints[0],
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
    return isStandalone ? [10, 55, 80] : DEFAULT_SNAP_POINTS_BROWSER;
  }, [isStandalone]);

  const minSnap = (isStandalone ? [10, 55, 80] : DEFAULT_SNAP_POINTS_BROWSER)[0];

  const [state, dispatch] = useReducer(bottomSheetReducer, {
    percent: initialPercent,
    isDragging: false,
    isExpanded: initialPercent === minSnap
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

  // グローバルストアを同期（二重更新を防ぐため、前回の値と比較）
  const prevStateRef = useRef<{ percent: number; isDragging: boolean }>({ percent: initialPercent, isDragging: false });
  useEffect(() => {
    const currentState = { percent: state.percent, isDragging: state.isDragging };
    const prevState = prevStateRef.current;
    
    // percent または isDragging が変化した場合のみ store を更新
    if (currentState.percent !== prevState.percent || currentState.isDragging !== prevState.isDragging) {
      console.log('BottomSheet state changed - updating store:', currentState);
      const { setState } = useBottomSheetStore.getState();
      setState(currentState.percent, currentState.isDragging);
      prevStateRef.current = currentState;
    }
  }, [state.percent, state.isDragging]);

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

  // グローバルリスナー用のイベントハンドラー
  const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    handleDragMove(e);
  }, [handleDragMove]);

  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    
    // グローバルリスナーを解除
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    
    // ポインターキャプチャを解除
    if (handleRef.current) {
      try {
        handleRef.current.releasePointerCapture(e.pointerId);
      } catch (error) {
        // setPointerCapture がサポートされていない場合は無視
      }
    }
    
    handleDragEnd(e);
  }, [handleDragEnd, handleGlobalPointerMove]);

  const handleGlobalPointerCancel = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    
    // グローバルリスナーを解除
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    
    handleDragCancel();
  }, [handleDragCancel, handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    handleDragMove({
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }, [handleDragMove]);

  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return;
    
    // グローバルリスナーを解除
    window.removeEventListener('touchmove', handleGlobalTouchMove);
    window.removeEventListener('touchend', handleGlobalTouchEnd);
    window.removeEventListener('touchcancel', handleGlobalTouchCancel);
    
    handleDragEnd({
      preventDefault: () => e.preventDefault()
    });
  }, [handleDragEnd, handleGlobalTouchMove]);

  const handleGlobalTouchCancel = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return;
    
    // グローバルリスナーを解除
    window.removeEventListener('touchmove', handleGlobalTouchMove);
    window.removeEventListener('touchend', handleGlobalTouchEnd);
    window.removeEventListener('touchcancel', handleGlobalTouchCancel);
    
    handleDragCancel();
  }, [handleDragCancel, handleGlobalTouchMove, handleGlobalTouchEnd]);

  // PointerEvent版ハンドラー
  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointerId.current = e.pointerId;
    
    // ポインターキャプチャを設定（try-catchで囲む）
    try {
      const target = e.currentTarget as HTMLDivElement;
      target.setPointerCapture(e.pointerId);
    } catch (error) {
      // setPointerCapture がサポートされていない場合は無視
    }
    
    // グローバルリスナーを登録
    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: false });
    window.addEventListener('pointercancel', handleGlobalPointerCancel, { passive: false });
    
    handleDragStart(e);
  }, [handleDragStart, handleGlobalPointerMove, handleGlobalPointerUp, handleGlobalPointerCancel]);

  // TouchEvent版ハンドラー
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 1) return; // マルチタッチは無視
    
    const touch = e.touches[0];
    
    // グローバルリスナーを登録
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleGlobalTouchCancel, { passive: false });
    
    handleDragStart({
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation()
    });
  }, [handleDragStart, handleGlobalTouchMove, handleGlobalTouchEnd, handleGlobalTouchCancel]);

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
      } else {
        handleRef.current.removeEventListener('touchstart', handleTouchStart);
      }
    }

    handleRef.current = element;

    // 新しい要素にリスナーを追加
    if (element) {
      if (supportsPointer) {
        element.addEventListener('pointerdown', handlePointerDown, { passive: false });
      } else {
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
      }
    }
  }, [
    supportsPointer,
    handlePointerDown,
    handleTouchStart
  ]);

  // 指定位置にスナップする関数
  const setPercent = useCallback((p: number) => {
    dispatch({ type: 'SET_PERCENT', percent: p, snapPoints });
  }, [snapPoints]);

  // 展開/縮小をトグルする関数
  const expand = useCallback(() => {
    dispatch({ type: 'EXPAND', snapPoints });
  }, [snapPoints]);

  const collapse = useCallback(() => {
    dispatch({ type: 'COLLAPSE', snapPoints });
  }, [snapPoints]);

  // スタイル計算
  const style = useMemo(() => {
    const transform = `translateY(${state.percent}%)`;
    const transition = state.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    return { transform, transition };
  }, [state.percent, state.isDragging]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      
      if (handleRef.current) {
        if (supportsPointer) {
          handleRef.current.removeEventListener('pointerdown', handlePointerDown);
        } else {
          handleRef.current.removeEventListener('touchstart', handleTouchStart);
        }
      }
      
      // グローバルリスナーのクリーンアップ
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchCancel);
      
      // ドラッグ中にアンマウントされた場合のスクロールロック解除
      if (draggingRef.current) {
        setGlobalScrollLock(false);
      }
    };
  }, [
    supportsPointer,
    handlePointerDown,
    handleTouchStart,
    handleGlobalPointerMove,
    handleGlobalPointerUp,
    handleGlobalPointerCancel,
    handleGlobalTouchMove,
    handleGlobalTouchEnd,
    handleGlobalTouchCancel
  ]);

  return {
    state,
    style,
    bindHandleRef,
    setPercent,
    expand,
    collapse,
    handleToggle
  };
} 