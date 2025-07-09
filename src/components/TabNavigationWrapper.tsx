import React from 'react';
import ArrowToggleButton from './ArrowToggleButton';
import TabNavigation from './TabNavigation';

const TabNavigationWrapper = () => {
  return (
    <div className="fixed top-1/2 right-4 -translate-y-1/2 flex items-center z-50">
      <ArrowToggleButton />
      <TabNavigation />
    </div>
  );
};

export default TabNavigationWrapper; 