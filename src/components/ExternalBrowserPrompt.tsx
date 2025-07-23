import React from 'react';
import ModalPortal from './ModalPortal';
import { useBrowserPromptStore } from '../store/browserPromptStore';

const ExternalBrowserPrompt: React.FC = () => {
  const { showExternalBrowserPrompt, setShowExternalBrowserPrompt } = useBrowserPromptStore();

  if (!showExternalBrowserPrompt) return null;

  const handleClose = () => setShowExternalBrowserPrompt(false);
  const currentUrl = window.location.href;

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
              Googleログインはアプリ内ブラウザではご利用いただけません。<br />
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
          <div className="flex justify-end pt-6">
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
