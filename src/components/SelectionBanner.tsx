import React from 'react';
import { MdClose, MdTouchApp, MdMouse } from 'react-icons/md';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { usePlacesStore } from '../store/placesStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export default function SelectionBanner() {
  const { selectionState, cancelSelection } = useRouteConnectionsStore();
  const places = usePlacesStore((s) => s.getFilteredPlaces());
  const { isTouchDevice } = useDeviceDetect();

  if (!selectionState.isSelecting || !selectionState.selectedPlaceId) {
    return null;
  }

  const selectedPlace = places.find(p => p.id === selectionState.selectedPlaceId);
  const placeName = selectedPlace?.name || '選択された地点';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 mx-4 mt-4">
      <div className="glass-effect rounded-xl shadow-elevation-3 p-4 
                      flex items-center justify-between
                      bg-coral-500/10 border-coral-500/20
                      transition-all duration-150 ease-ios-default">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-coral-500/20 rounded-full 
                          flex items-center justify-center">
            {isTouchDevice ? (
              <MdTouchApp size={20} className="text-coral-600" />
            ) : (
              <MdMouse size={20} className="text-coral-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="headline text-system-label mb-1">
              ルート作成中
            </h3>
            <p className="subheadline text-system-secondary-label">
              <span className="font-semibold text-coral-600">{placeName}</span> から
            </p>
            <p className="footnote text-system-tertiary-label mt-1">
              目的地をクリック/タップして選択してください
            </p>
          </div>
        </div>
        <button
          onClick={cancelSelection}
          className="flex-shrink-0 w-8 h-8 bg-coral-500/20 hover:bg-coral-500/30 
                     rounded-full flex items-center justify-center 
                     transition-all duration-150 ease-ios-default
                     hover:scale-110 active:scale-95
                     text-coral-600 hover:text-coral-700"
          aria-label="選択をキャンセル"
        >
          <MdClose size={18} />
        </button>
      </div>
    </div>
  );
} 