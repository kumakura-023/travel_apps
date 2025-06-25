import { Marker } from '@react-google-maps/api';
import { Place } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { useState } from 'react';

interface Props {
  place: Place;
}

export default function CustomMarker({ place }: Props) {
  const [hover, setHover] = useState(false);
  const icon = getCategoryIcon(place.category, true);
  const scaledIcon = { ...icon, scale: hover ? 1.2 : 1 } as google.maps.Icon;

  return (
    <Marker
      position={{ lat: place.coordinates.lat, lng: place.coordinates.lng }}
      icon={scaledIcon}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    />
  );
} 