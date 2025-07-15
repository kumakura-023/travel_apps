import React from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface Props {
  isOpen: boolean;
  onClick: () => void;
}

const ArrowToggleButton: React.FC<Props> = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="glass-effect-border rounded-full w-10 h-10 flex items-center justify-center text-system-label transition-all duration-200 ease-ios-default hover:bg-gray-100/50 active:scale-90"
      aria-label={isOpen ? 'ナビゲーションを隠す' : 'ナビゲーションを表示'}
    >
      {isOpen ? <MdChevronRight size={28} /> : <MdChevronLeft size={28} />}
    </button>
  );
};

export default ArrowToggleButton; 