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
      {/* ハンバーガーアイコン */}
      <button
        onClick={toggleMenu}
        className={`fixed z-50 top-3 ${isDesktop ? 'left-3' : 'right-3'} bg-white bg-opacity-80 backdrop-blur border rounded p-2 shadow`}
      >
        <svg width="20" height="20" fill="currentColor" className="text-gray-700" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5h14a1 1 0 000-2H3a1 1 0 000 2zm14 4H3a1 1 0 000 2h14a1 1 0 000-2zm0 6H3a1 1 0 000 2h14a1 1 0 000-2z" clipRule="evenodd" />
        </svg>
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={toggleMenu}
        />
      )}

      {/* メニュー本体 */}
      <div
        className={`fixed z-50 bg-white shadow-lg transition-transform duration-300 ${isDesktop ? 'h-full' : 'h-screen w-screen'} overflow-y-auto`}
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