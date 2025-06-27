import { Autocomplete } from '@react-google-maps/api';
import { useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { MdNavigation } from 'react-icons/md';
import { useSelectedPlaceStore } from '../store/placeStore';
import { useRouteSearchStore } from '../store/routeSearchStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface Props {
  onPlaceSelected: (lat: number, lng: number) => void;
  isDesktop: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onClearExternal?: () => void;
}

export default function SearchBar({
  onPlaceSelected,
  isDesktop,
  inputRef,
  onClearExternal,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const localRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const setPlace = useSelectedPlaceStore((s) => s.setPlace);
  const { openRouteSearch } = useRouteSearchStore();
  const placesServiceRef = useRef<google.maps.places.PlacesService>();
  const { map } = useGoogleMaps();

  const combinedRef = inputRef ?? localRef;

  const onLoad = (auto: google.maps.places.Autocomplete) => {
    autocompleteRef.current = auto;
    if (!placesServiceRef.current) {
      if (map) {
        placesServiceRef.current = new google.maps.places.PlacesService(map);
      } else {
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
      }
    }
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry || !place.geometry.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setPlace(place);
    if (place.name) {
      setInputValue(place.name);
      combinedRef.current && (combinedRef.current.value = place.name);
    }
    onPlaceSelected(lat, lng);
  };

  const clear = () => {
    setInputValue('');
    if (onClearExternal) onClearExternal();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry && place.geometry.location) {
        setPlace(place);
        if (place.name) {
          setInputValue(place.name);
          combinedRef.current && (combinedRef.current.value = place.name);
        }
        onPlaceSelected(place.geometry.location.lat(), place.geometry.location.lng());
        return;
      }

      if (placesServiceRef.current && inputValue.trim() !== '') {
        placesServiceRef.current.textSearch({ query: inputValue }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const result = results[0];
            const loc = result.geometry?.location;
            if (loc) {
              if (result.name) {
                setInputValue(result.name);
                combinedRef.current && (combinedRef.current.value = result.name);
              }
              if (result.place_id) {
                placesServiceRef.current?.getDetails(
                  {
                    placeId: result.place_id,
                    fields: [
                      'place_id',
                      'name',
                      'geometry',
                      'formatted_address',
                      'rating',
                      'photos',
                      'website',
                      'types',
                    ],
                  },
                  (detail, detStatus) => {
                    if (detStatus === google.maps.places.PlacesServiceStatus.OK && detail) {
                      setPlace(detail);
                    }
                  },
                );
              }
              onPlaceSelected(loc.lat(), loc.lng());
            }
          }
        });
      }
    }
  };

  return (
    <div
      className={`fixed top-4 z-50 flex items-center justify-between rounded-full shadow-md bg-white ${
        isDesktop ? 'left-4 w-[480px]' : 'mx-4 left-0 right-0'
      }`}
    >
      <div className="flex-1">
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            fields: [
              'place_id',
              'name',
              'geometry',
              'formatted_address',
              'rating',
              'photos',
              'website',
              'types',
            ],
          }}
        >
          <input
            ref={combinedRef}
            type="text"
            placeholder="Google マップを検索する"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent py-3 pl-4 pr-2 text-lg focus:outline-none"
          />
        </Autocomplete>
      </div>
      <div className="flex items-center space-x-1 pr-4">
        {/* クリアボタン */}
        {inputValue && (
          <button
            onClick={clear}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        )}
        
        {/* 検索アイコン（虫眼鏡）*/}
        <button
          className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
          title="検索"
        >
          <FiSearch size={18} />
        </button>
        
        {/* ナビゲーション（ルート検索）ボタン */}
        <button
          onClick={openRouteSearch}
          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
          title="ルート検索"
        >
          <MdNavigation size={18} />
        </button>
      </div>
    </div>
  );
} 