import { useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import useMediaQuery from "../hooks/useMediaQuery";

export default function MapTypeSwitcher() {
  const { map } = useGoogleMaps();
  const [type, setType] = useState<"roadmap" | "hybrid">("roadmap");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isMobile = !isDesktop && !isTablet;

  const switchType = (t: "roadmap" | "hybrid") => {
    setType(t);
    map?.setMapTypeId(t);
  };

  // タブレット版・スマホ版では非表示
  if (!isDesktop) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 
                    glass-effect-border rounded-lg 
                    flex overflow-hidden
                    transition-all duration-150 ease-ios-default"
    >
      <button
        className={`px-3 py-2 text-sm font-medium
                   transition-all duration-150 ease-ios-default
                   ${
                     type === "roadmap"
                       ? "bg-coral-500 text-white border border-coral-400/30"
                       : "bg-white/80 text-system-secondary-label hover:bg-white/90 hover:text-coral-500"
                   }`}
        onClick={() => switchType("roadmap")}
      >
        地図
      </button>
      <button
        className={`px-3 py-2 text-sm font-medium
                   transition-all duration-150 ease-ios-default
                   ${
                     type === "hybrid"
                       ? "bg-coral-500 text-white border border-coral-400/30"
                       : "bg-white/80 text-system-secondary-label hover:bg-white/90 hover:text-coral-500"
                   }`}
        onClick={() => switchType("hybrid")}
      >
        航空写真
      </button>
    </div>
  );
}
