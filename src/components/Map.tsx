import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useSelectedPlaceStore } from '../store/placeStore';
import { usePlacesStore } from '../store/placesStore';
import CustomMarker from './CustomMarker';
import { getCategoryColor } from '../utils/categoryIcons';
import PlaceLabel from './PlaceLabel';
import AddLabelToggle from './AddLabelToggle';
import { useLabelsStore } from '../store/labelsStore';
import LabelOverlay from './LabelOverlay';
import LabelEditDialog from './LabelEditDialog';
import { MapLabel } from '../types';
import useMediaQuery from '../hooks/useMediaQuery';

interface Props {
  children?: React.ReactNode;
}

export default function Map({ children }: Props) {
  const { isDesktop } = useDeviceDetect();
  const { map, setMap, panTo } = useGoogleMaps();
  const { place, setPlace } = useSelectedPlaceStore((s) => ({ place: s.place, setPlace: s.setPlace }));
  const savedPlaces = usePlacesStore((s) => s.places);
  const labels = useLabelsStore((s) => s.labels);
  const addLabel = useLabelsStore((s) => s.addLabel);
  const updateLabel = useLabelsStore((s) => s.updateLabel);
  const [zoom, setZoom] = useState(14);
  const [labelMode, setLabelMode] = useState(false);
  const labelModeRef = useRef(false);
  const [editing, setEditing] = useState<null | MapLabel>(null);

  const isDesktopViewport = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    labelModeRef.current = labelMode;
  }, [labelMode]);

  const containerStyle = useMemo(
    () => ({
      width: '100%',
      height: '100vh',
      marginLeft: place && isDesktopViewport ? 540 : 0,
      transition: 'margin 0.3s ease',
    }),
    [place, isDesktopViewport],
  );

  const center = useMemo<google.maps.LatLngLiteral>(
    () => ({ lat: 35.681236, lng: 139.767125 }),
    [],
  );

  const mapOptions: google.maps.MapOptions = useMemo(
    () => ({
      // UI
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      fullscreenControl: isDesktop,
      streetViewControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        style: google.maps.MapTypeControlStyle.DEFAULT,
      },
      gestureHandling: 'greedy',
      disableDefaultUI: false,
    }),
    [isDesktop],
  );

  // The GoogleMap component will call onLoad with map instance
  const onLoad = (map: google.maps.Map) => {
    setMap(map);
    setZoom(map.getZoom() ?? 14);
    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom() ?? 14);
    });

    // Listen for POI clicks or label add click
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (labelModeRef.current && e.latLng) {
        // 初期テキストなしでラベルを配置し、あとで編集可能にする
        addLabel('', { lat: e.latLng.lat(), lng: e.latLng.lng() });
        setLabelMode(false);
        return;
      }

      const clicked = e as unknown as { placeId?: string; stop: () => void };
      if (!clicked.placeId) return;
      // Prevent default info window
      clicked.stop();

      const service = new google.maps.places.PlacesService(map);
      service.getDetails(
        {
          placeId: clicked.placeId!,
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
        (detail, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
            setPlace(detail);
            if (detail.geometry?.location) {
              const currentZoom = map.getZoom() ?? 14;
              const zoomArg = currentZoom < 17 ? 17 : undefined;
              panTo(detail.geometry.location.lat(), detail.geometry.location.lng(), zoomArg);
            }
          }
        },
      );
    });
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={mapOptions}
      onLoad={onLoad}
    >
      {/* ピン型アイコンを削除し、円だけ表示 */}
      {savedPlaces.map((p) => (
        <Circle
          key={p.id + '_circle'}
          center={{ lat: p.coordinates.lat, lng: p.coordinates.lng }}
          radius={120}
          options={{
            strokeColor: getCategoryColor(p.category),
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: getCategoryColor(p.category),
            fillOpacity: 0.15,
            clickable: false,
            zIndex: 50,
          }}
        />
      ))}
      {savedPlaces.map((p) => (
        <PlaceLabel key={p.id + '_label'} place={p} zoom={zoom} map={map} />
      ))}
      {place && place.geometry?.location && (
        <Marker
          position={{
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }}
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 48),
          }}
        />
      )}
      {labels.map((l) => (
        <LabelOverlay
          key={l.id}
          label={l}
          map={map}
          onEdit={() => setEditing(l)}
          onMove={(pos) => updateLabel(l.id, { position: pos })}
          onResize={(size: { width: number; height: number }) => updateLabel(l.id, size)}
        />
      ))}
      {editing && (
        <LabelEditDialog
          label={editing}
          onSave={(u) => updateLabel(editing.id, u)}
          onClose={() => setEditing(null)}
        />
      )}
      <AddLabelToggle onToggle={setLabelMode} />
      {children}
    </GoogleMap>
  );
} 