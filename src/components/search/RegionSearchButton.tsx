import { MdExplore } from "react-icons/md";
import { useDeviceDetect } from "../../hooks/useDeviceDetect";

interface RegionSearchButtonProps {
  onClick: () => void;
}

export default function RegionSearchButton({
  onClick,
}: RegionSearchButtonProps) {
  const { isDesktop, isTablet } = useDeviceDetect();
  const showLabel = isDesktop || isTablet;

  return (
    <button
      onClick={onClick}
      className="flex items-center p-2 text-system-secondary-label 
                 hover:text-coral-500 hover:bg-coral-500/10 rounded-full 
                 transition-all duration-150 ease-ios-default
                 hover:scale-110 focus:outline-none active:scale-95"
      title="地域から探す"
    >
      <MdExplore size={18} />
      {showLabel && (
        <span className="ml-1 text-sm font-medium whitespace-nowrap">
          地域から探す
        </span>
      )}
    </button>
  );
}
