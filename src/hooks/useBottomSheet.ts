import { useReducer, useRef, useCallback, useEffect } from 'react';

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
  | { type: 'END_DRAG'; percent: number }
  | { type: 'SET_PERCENT'; percent: number }
  | { type: 'EXPAND' }
  | { type: 'COLLAPSE' };

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
      // 終了時に 0/50/100 にスナップ
      let targetPercent: number;
      if (action.percent <= 25) {
        targetPercent = 0;
      } else if (action.percent <= 75) {
        targetPercent = 50;
      } else {
        targetPercent = 100;
      }

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

    case 'EXPAND':
      return {
        ...state,
        percent: 0,
        isExpanded: true,
        isDragging: false,
      };

    case 'COLLAPSE':
      return {
        ...state,
        percent: 100,
        isExpanded: false,
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
}

/**
 * BottomSheet機能を提供するカスタムフック
 * Pointer Eventsを使用してタッチ・マウス操作を統一的に処理
 */
export function useBottomSheet(initialPercent: number = 50): UseBottomSheetReturn {
  const [state, dispatch] = useReducer(bottomSheetReducer, {
    percent: initialPercent,
    isDragging: false,
    isExpanded: initialPercent === 0
  });

  const handleRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const initialPercentRef = useRef<number>(0);
  const pointerId = useRef<number | null>(null);
  const draggingRef = useRef<boolean>(false);
  const percentRef = useRef<number>(initialPercent);
  const viewportHeightRef = useRef<number>(window.innerHeight);

  // state.percent が変化したら percentRef を更新
  useEffect(() => {
    percentRef.current = state.percent;
  }, [state.percent]);

  // ドラッグ開始処理
  const handlePointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLDivElement;
    
    startY.current = e.clientY;
    initialPercentRef.current = percentRef.current;
    viewportHeightRef.current = window.innerHeight;
    pointerId.current = e.pointerId;
    
    draggingRef.current = true;
    
    // ポインターキャプチャを設定（指がハンドル外に出ても継続）
    target.setPointerCapture(e.pointerId);
    
    dispatch({ type: 'START_DRAG' });
  }, []);

  // ドラッグ中の処理
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    
    e.preventDefault();
    
    const currentY = e.clientY;
    const deltaY = currentY - startY.current;
    
    // 画面高さに対する変化量をパーセンテージで計算
    const viewportHeight = viewportHeightRef.current;
    const deltaPercent = (deltaY / viewportHeight) * 100;
    
    const newPercent = initialPercentRef.current + deltaPercent;
    
    percentRef.current = newPercent;
    
    dispatch({ type: 'UPDATE_DRAG', percent: newPercent });
  }, []);

  // ドラッグ終了処理
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    
    e.preventDefault();
    
    const target = e.currentTarget as HTMLDivElement;
    target.releasePointerCapture(e.pointerId);
    
    draggingRef.current = false;
    pointerId.current = null;
    
    dispatch({ type: 'END_DRAG', percent: percentRef.current });
  }, []);

  // キャンセル (画面回転やシステム割り込みなど)
  const handlePointerCancel = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;

    draggingRef.current = false;
    pointerId.current = null;
    dispatch({ type: 'END_DRAG', percent: percentRef.current });
  }, []);

  // ハンドル要素にイベントリスナーをバインドする関数
  const bindHandleRef = useCallback((element: HTMLDivElement | null) => {
    if (element === handleRef.current) return;

    // 既存のリスナーを削除
    if (handleRef.current) {
      handleRef.current.removeEventListener('pointerdown', handlePointerDown);
      handleRef.current.removeEventListener('pointermove', handlePointerMove);
      handleRef.current.removeEventListener('pointerup', handlePointerUp);
      handleRef.current.removeEventListener('pointercancel', handlePointerCancel);
    }

    handleRef.current = element;

    // 新しい要素にリスナーを追加（1度だけ）
    if (element) {
      element.addEventListener('pointerdown', handlePointerDown, { passive: false });
      element.addEventListener('pointermove', handlePointerMove, { passive: false });
      element.addEventListener('pointerup', handlePointerUp, { passive: false });
      element.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    }
  }, []);

  // 指定位置にスナップする関数
  const setPercent = useCallback((p: number) => {
    dispatch({ type: 'SET_PERCENT', percent: p });
  }, []);

  // 展開/縮小をトグルする関数
  const expand = useCallback(() => {
    dispatch({ type: 'EXPAND' });
  }, []);

  const collapse = useCallback(() => {
    dispatch({ type: 'COLLAPSE' });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (handleRef.current) {
        handleRef.current.removeEventListener('pointerdown', handlePointerDown);
        handleRef.current.removeEventListener('pointermove', handlePointerMove);
        handleRef.current.removeEventListener('pointerup', handlePointerUp);
        handleRef.current.removeEventListener('pointercancel', handlePointerCancel);
      }
    };
  }, []);

  return {
    state,
    style: {
      transform: `translateY(${state.percent}%)`,
      transition: state.isDragging ? 'none' : 'transform 0.25s ease-out'
    },
    bindHandleRef,
    setPercent,
    expand,
    collapse
  };
} 