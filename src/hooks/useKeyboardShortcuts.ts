import { useEffect } from 'react';

interface Props {
  isDesktop: boolean;
  focusSearch: () => void;
  clearSearch: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useKeyboardShortcuts = ({
  isDesktop,
  focusSearch,
  clearSearch,
  zoomIn,
  zoomOut,
}: Props) => {
  useEffect(() => {
    if (!isDesktop) return;

    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        focusSearch();
        return;
      }
      // Esc
      if (e.key === 'Escape') {
        clearSearch();
        return;
      }
      // + or = zoom in
      if ((e.key === '+' || e.key === '=') && !e.shiftKey) {
        zoomIn();
        return;
      }
      // - zoom out
      if (e.key === '-') {
        zoomOut();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDesktop, focusSearch, clearSearch, zoomIn, zoomOut]);
}; 