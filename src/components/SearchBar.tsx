import { Autocomplete } from '@react-google-maps/api';
import { useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useSelectedPlaceStore } from '../store/placeStore';
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
      className={`fixed top-4 z-50 flex items-center rounded-full shadow-md bg-white ${
        isDesktop ? 'left-4 w-[480px]' : 'mx-4 left-0 right-0'
      }`}
    >
      <FiSearch className="ml-3 text-gray-500" />
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
          placeholder="場所を検索"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent py-3 px-4 text-lg focus:outline-none rounded-full"
        />
      </Autocomplete>
      {inputValue && (
        <button
          onClick={clear}
          className="mr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          ✕
        </button>
      )}
    </div>
  );
} 