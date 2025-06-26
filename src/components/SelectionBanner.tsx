import React from 'react';
import { MdClose, MdTouchApp, MdMouse } from 'react-icons/md';
import { useRouteConnectionsStore } from '../store/routeConnectionsStore';
import { usePlacesStore } from '../store/placesStore';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export default function SelectionBanner() {
  const { selectionState, cancelSelection } = useRouteConnectionsStore();
  const { places } = usePlacesStore();
  const { isTouchDevice } = useDeviceDetect();

  if (!selectionState.isSelecting || !selectionState.selectedPlaceId) {
    return null;
  }

  const selectedPlace = places.find(p => p.id === selectionState.selectedPlaceId);
  const placeName = selectedPlace?.name || '選択された地点';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 mx-4 mt-4">
      <div className="bg-blue-500 text-white rounded-xl shadow-elevation-3 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-shrink-0">
            {isTouchDevice ? (
              <MdTouchApp size={24} />
            ) : (
              <MdMouse size={24} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">
              ルート作成中
            </h3>
            <p className="text-blue-100 text-sm">
              <span className="font-medium">{placeName}</span> から
            </p>
            <p className="text-blue-100 text-xs mt-1">
              目的地をクリック/タップして選択してください
            </p>
          </div>
        </div>
        <button
          onClick={cancelSelection}
          className="flex-shrink-0 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          aria-label="選択をキャンセル"
        >
          <MdClose size={18} />
        </button>
      </div>
    </div>
  );
} 