import React from 'react';
import ArrowToggleButton from './ArrowToggleButton';
import TabNavigation, { TabKey } from './TabNavigation';

interface WrapperProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  labelMode: boolean;
  onLabelModeToggle: () => void;
}

const TabNavigationWrapper: React.FC<WrapperProps> = ({ activeTab, onTabChange, labelMode, onLabelModeToggle }) => {
  return (
    <div className="fixed top-1/2 right-4 -translate-y-1/2 flex items-center z-50">
      <ArrowToggleButton />
      <TabNavigation 
        active={activeTab}
        onChange={onTabChange}
        labelMode={labelMode}
        onLabelModeToggle={onLabelModeToggle}
      />
    </div>
  );
};

export default TabNavigationWrapper; 