import React from 'react';
import { useUIStore } from '../store/uiStore';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const ArrowToggleButton = () => {
  const { isTabNavigationVisible, toggleTabNavigation } = useUIStore();

  return (
    <button
      onClick={toggleTabNavigation}
      className="glass-effect-border rounded-full w-10 h-10 transition-transform"
    >
      {isTabNavigationVisible ? <MdChevronLeft /> : <MdChevronRight />}
    </button>
  );
};

export default ArrowToggleButton; 