import useMediaQuery from './useMediaQuery';

export function useDeviceDetect() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  return {
    isDesktop,
    isTablet,
    isMobile,
    isTouchDevice: isMobile || isTablet, // タッチデバイスの判定も画面ベースに
  };
} 