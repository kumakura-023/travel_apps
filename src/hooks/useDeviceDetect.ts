import { useEffect, useState } from 'react';

export function useDeviceDetect() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouchSupport = () => {
      if (typeof window === 'undefined') return false;
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(hasTouchSupport());
  }, []);

  return {
    isTouchDevice,
    isDesktop: !isTouchDevice,
  };
} 