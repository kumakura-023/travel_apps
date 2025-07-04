import { useReducer, useRef, useCallback, useEffect } from 'react';

// BottomSheetの状態を管理する型
export interface BottomSheetState {
  percent: number; // 0=全展開, 50=中間, 100=折り畳み
  isDragging: boolean;
  isExpanded: boolean;
}

// BottomSheetのアクション型
type BottomSheetAction = 
  | { type: 'START_DRAG'; initialPercent: number }
  | { type: 'UPDATE_DRAG'; percent: number }
  | { type: 'END_DRAG'; percent: number }
  | { type: 'SNAP_TO'; percent: number }
  | { type: 'TOGGLE_EXPAND' };

// ステート管理のためのreducer
function bottomSheetReducer(state: BottomSheetState, action: BottomSheetAction): BottomSheetState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true
      };

    case 'UPDATE_DRAG':
      return {
        ...state,
        percent: Math.max(0, Math.min(100, action.percent))
      };

    case 'END_DRAG': {
      // スナップ判定: 0-25% → 0%, 25-75% → 50%, 75-100% → 100%
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
        isExpanded: targetPercent === 0
      };
    }

    case 'SNAP_TO':
      return {
        ...state,
        percent: action.percent,
        isDragging: false,
        isExpanded: action.percent === 0
      };

    case 'TOGGLE_EXPAND':
      const newPercent = state.isExpanded ? 50 : 0;
      return {
        ...state,
        percent: newPercent,
        isExpanded: !state.isExpanded
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
  snapTo: (percent: 0 | 50 | 100) => void;
  toggleExpand: () => void;
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

  // ドラッグ開始処理
  const handlePointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLDivElement;
    
    startY.current = e.clientY;
    initialPercentRef.current = state.percent;
    pointerId.current = e.pointerId;
    
    // ポインターキャプチャを設定（指がハンドル外に出ても継続）
    target.setPointerCapture(e.pointerId);
    
    dispatch({ type: 'START_DRAG', initialPercent: state.percent });
  }, [state.percent]);

  // ドラッグ中の処理
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!state.isDragging || pointerId.current !== e.pointerId) return;
    
    e.preventDefault();
    
    const currentY = e.clientY;
    const deltaY = currentY - startY.current;
    
    // 画面高さに対する変化量をパーセンテージで計算
    const viewportHeight = window.innerHeight;
    const deltaPercent = (deltaY / viewportHeight) * 100;
    
    const newPercent = initialPercentRef.current + deltaPercent;
    
    dispatch({ type: 'UPDATE_DRAG', percent: newPercent });
  }, [state.isDragging]);

  // ドラッグ終了処理
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!state.isDragging || pointerId.current !== e.pointerId) return;
    
    e.preventDefault();
    
    const target = e.currentTarget as HTMLDivElement;
    target.releasePointerCapture(e.pointerId);
    
    pointerId.current = null;
    
    dispatch({ type: 'END_DRAG', percent: state.percent });
  }, [state.isDragging, state.percent]);

  // キャンセル (画面回転やシステム割り込みなど)
  const handlePointerCancel = useCallback((e: PointerEvent) => {
    if (!state.isDragging || pointerId.current !== e.pointerId) return;

    pointerId.current = null;
    dispatch({ type: 'END_DRAG', percent: state.percent });
  }, [state.isDragging, state.percent]);

  // ハンドル要素にイベントリスナーをバインドする関数
  const bindHandleRef = useCallback((element: HTMLDivElement | null) => {
    // 既存のリスナーを削除
    if (handleRef.current) {
      handleRef.current.removeEventListener('pointerdown', handlePointerDown);
      handleRef.current.removeEventListener('pointermove', handlePointerMove);
      handleRef.current.removeEventListener('pointerup', handlePointerUp);
      handleRef.current.removeEventListener('pointercancel', handlePointerCancel);
    }

    handleRef.current = element;

    // 新しい要素にリスナーを追加
    if (element) {
      element.addEventListener('pointerdown', handlePointerDown, { passive: false });
      element.addEventListener('pointermove', handlePointerMove, { passive: false });
      element.addEventListener('pointerup', handlePointerUp, { passive: false });
      element.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  // 指定位置にスナップする関数
  const snapTo = useCallback((percent: 0 | 50 | 100) => {
    dispatch({ type: 'SNAP_TO', percent });
  }, []);

  // 展開/縮小をトグルする関数
  const toggleExpand = useCallback(() => {
    dispatch({ type: 'TOGGLE_EXPAND' });
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
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  return {
    state,
    style: {
      transform: `translateY(${state.percent}%)`,
      transition: state.isDragging ? 'none' : 'transform 0.25s ease-out'
    },
    bindHandleRef,
    snapTo,
    toggleExpand
  };
} 