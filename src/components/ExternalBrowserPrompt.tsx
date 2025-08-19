import React from "react";
import ModalPortal from "./ModalPortal";
import { useBrowserPromptStore } from "../store/browserPromptStore";

const ExternalBrowserPrompt: React.FC = () => {
  const { showExternalBrowserPrompt, setShowExternalBrowserPrompt } =
    useBrowserPromptStore();

  if (!showExternalBrowserPrompt) return null;

  const handleClose = () => setShowExternalBrowserPrompt(false);
  const currentUrl = window.location.href;

  // 外部ブラウザで開く処理
  const handleOpenExternal = () => {
    const ua = navigator.userAgent.toLowerCase();
    // iOS Safari
    if (/iphone|ipad|ipod/.test(ua)) {
      window.location.href = currentUrl.replace(/^http:/, "https:"); // Safariで開く
    } else if (/android/.test(ua)) {
      // Android Chrome
      window.open(currentUrl, "_blank");
    } else {
      // PCやその他は新しいタブで開く
      window.open(currentUrl, "_blank");
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex justify-center items-center p-4"
        onClick={handleClose}
      >
        <div
          className="glass-effect rounded-xl w-auto max-w-md min-w-[280px] mx-auto p-6 md:p-8 space-y-6 shadow-elevation-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4 text-center">
            <p className="body text-system-secondary-label whitespace-normal">
              Googleログインはアプリ内ブラウザではご利用いただけません。
              <br />
              Chrome や Safari などの外部ブラウザでこのページを開いてください。
            </p>
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="input text-center"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
          </div>
          <div className="flex justify-end pt-6 gap-3">
            <button
              className="btn-system min-w-[120px]"
              onClick={handleOpenExternal}
            >
              外部ブラウザで開く
            </button>
            <button className="btn-primary min-w-[100px]" onClick={handleClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ExternalBrowserPrompt;
