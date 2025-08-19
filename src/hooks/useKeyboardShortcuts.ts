import { useEffect } from "react";

interface Props {
  isDesktop: boolean;
  focusSearch: () => void;
  clearSearch: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  showHelp?: () => void;
}

export const useKeyboardShortcuts = ({
  isDesktop,
  focusSearch,
  clearSearch,
  zoomIn,
  zoomOut,
  showHelp,
}: Props) => {
  useEffect(() => {
    if (!isDesktop) return;

    const handler = (e: KeyboardEvent) => {
      // input、textarea、contenteditable要素がフォーカスされている時はショートカットを無効化
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true")
      ) {
        // Escapeキーだけは許可（input要素をクリアするため）
        if (e.key === "Escape") {
          clearSearch();
        }
        return;
      }

      // Ctrl/Cmd + F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        focusSearch();
        return;
      }
      // Esc
      if (e.key === "Escape") {
        clearSearch();
        return;
      }
      // + or = zoom in
      if ((e.key === "+" || e.key === "=") && !e.shiftKey) {
        zoomIn();
        return;
      }
      // - zoom out
      if (e.key === "-") {
        zoomOut();
        return;
      }
      // ? show help
      if (e.key === "?" && showHelp) {
        e.preventDefault();
        showHelp();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDesktop, focusSearch, clearSearch, zoomIn, zoomOut, showHelp]);
};
