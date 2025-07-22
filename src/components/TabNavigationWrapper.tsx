import React, { useState } from 'react';
import ArrowToggleButton from './ArrowToggleButton';
import TabNavigation, { TabKey } from './TabNavigation';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

interface WrapperProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TabNavigationWrapper: React.FC<WrapperProps> = ({ activeTab, onTabChange }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { isDesktop } = useDeviceDetect();

  if (isDesktop) {
    return (
      <div className="fixed top-1/2 right-4 -translate-y-1/2 z-50">
        <TabNavigation
          active={activeTab}
          onChange={onTabChange}
          isVisible={true}
        />
      </div>
    );
  }

  return (
    <div className="fixed top-1/2 right-0 -translate-y-1/2 flex items-center z-50">
      <div style={{ transition: 'transform 0.3s ease-in-out', transform: isOpen ? 'translateX(0)' : 'translateX(calc(100% + 16px))' }}>
        <TabNavigation
          active={activeTab}
          onChange={onTabChange}
          isVisible={true}
        />
      </div>
      <div style={{ transition: 'transform 0.3s ease-in-out', transform: isOpen ? 'translateX(-100%)' : 'translateX(-16px)' }} className="absolute left-0 top-1/2 -translate-y-1/2">
        <ArrowToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
      </div>
    </div>
  );
};

export default TabNavigationWrapper; 