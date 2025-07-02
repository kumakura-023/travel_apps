import React from 'react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import Settings from './Settings';

const AppMenu: React.FC = () => {
  const { isDesktop } = useDeviceDetect();
  const [open, setOpen] = React.useState(false);

  const toggleMenu = () => setOpen(!open);

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
                   ${isDesktop ? 'h-full' : 'h-screen w-screen'} 
                   overflow-y-auto scrollbar-hide`}
        style={{
          width: isDesktop ? width : '100%',
          transform: open ? 'translateX(0)' : `translateX(${isDesktop ? -width : '100%'})`,
          top: 0,
          left: 0,
        }}
      >
        <div className="p-4">
          <Settings />
        </div>
      </div>
    </>
  );
};

export default AppMenu; 