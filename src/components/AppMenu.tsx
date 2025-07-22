import React, { useState } from 'react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import Settings from './Settings';
import SharePlanModal from './SharePlanModal';
import { usePlanStore } from '../store/planStore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AppMenu: React.FC = () => {
  const { isDesktop } = useDeviceDetect();
  const [open, setOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { plan } = usePlanStore();

  const toggleMenu = () => setOpen(!open);

  const handleShare = async (email: string) => {
    if (!plan) {
      alert('アクティブなプランがありません。');
      return;
    }

    try {
      const functions = getFunctions();
      const inviteUserToPlan = httpsCallable(functions, 'inviteUserToPlan');
      const result = await inviteUserToPlan({ planId: plan.id, email });
      
      const data = result.data as { success: boolean; message: string };
      if (data.success) {
        alert(data.message);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Error sharing plan:', error);
      alert(`招待に失敗しました: ${error.message}`);
    }
  };

  // メニューサイズ
  const width = 280;

  return (
    <>
      {/* ハンバーガーアイコン - 統一デザイン */}
      <button
        onClick={toggleMenu}
        className={`fixed z-50 top-3 ${isDesktop ? 'left-3' : 'right-3'} 
                   glass-effect rounded-lg p-2 shadow-elevation-2
                   text-system-secondary-label hover:text-coral-500
                   hover:bg-coral-500/5 transition-all duration-150 ease-ios-default
                   hover:scale-110 active:scale-95`}
        title="メニューを開く"
      >
        <svg 
          width="20" 
          height="20" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          className="transition-transform duration-150"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path 
            fillRule="evenodd" 
            d="M3 5h14a1 1 0 000-2H3a1 1 0 000 2zm14 4H3a1 1 0 000 2h14a1 1 0 000-2zm0 6H3a1 1 0 000 2h14a1 1 0 000-2z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="modal-backdrop"
          onClick={toggleMenu}
        />
      )}

      {/* メニュー本体 */}
      <div
        className={`fixed z-50 glass-effect shadow-elevation-5 
                   transition-transform duration-300 ease-ios-default
                   ${isDesktop ? 'h-full' : 'h-screen h-[100dvh] w-screen'} 
                   overflow-y-auto scrollbar-hide`}
        style={{
          width: isDesktop ? width : '100%',
          transform: open ? 'translateX(0)' : `translateX(${isDesktop ? -width : '100%'})`,
          top: 0,
          left: 0,
        }}
      >
        <div className="p-4 space-y-4">
          {/* Share Button */}
          <button 
            className="btn-system w-full"
            onClick={() => setShareModalOpen(true)}
            disabled={!plan} // Disable if no active plan
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <span className="body">プランを共有</span>
            </div>
            <svg className="w-5 h-5 text-system-tertiary-label" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <Settings />
        </div>
      </div>
      <SharePlanModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        onShare={handleShare} 
      />
    </>
  );
};

export default AppMenu; 