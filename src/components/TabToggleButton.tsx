import { MdMoreVert, MdClose } from 'react-icons/md';
import { useUIStore } from '../store/uiStore';
import useMediaQuery from '../hooks/useMediaQuery';

export default function TabToggleButton() {
  const { isTabNavigationVisible, toggleTabNavigation } = useUIStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // デスクトップでは表示しない（TabNavigationは常に表示）
  if (isDesktop) return null;

  return (
    <button
      onClick={toggleTabNavigation}
      className="fixed top-4 right-20 z-50 w-10 h-10 
                 glass-effect-border rounded-full 
                 flex items-center justify-center
                 transition-all duration-150 ease-ios-default
                 hover:scale-105 active:scale-95
                 text-system-secondary-label hover:text-coral-500"
      title={isTabNavigationVisible ? 'ナビゲーションを非表示' : 'ナビゲーションを表示'}
    >
      {isTabNavigationVisible ? (
        <MdClose size={20} />
      ) : (
        <MdMoreVert size={20} />
      )}
    </button>
  );
} 