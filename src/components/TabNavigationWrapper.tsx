import React from 'react';
import ArrowToggleButton from './ArrowToggleButton';
import TabNavigation, { TabKey } from './TabNavigation';
import AuthButton from './AuthButton'; // AuthButtonをインポート

interface WrapperProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  labelMode: boolean;
  onLabelModeToggle: () => void;
}

const TabNavigationWrapper: React.FC<WrapperProps> = ({ activeTab, onTabChange, labelMode, onLabelModeToggle }) => {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
      <AuthButton />
      <div className="relative flex items-center">
        <ArrowToggleButton />
        <TabNavigation 
          active={activeTab}
          onChange={onTabChange}
          labelMode={labelMode}
          onLabelModeToggle={onLabelModeToggle}
        />
      </div>
    </div>
  );
};

export default TabNavigationWrapper; 