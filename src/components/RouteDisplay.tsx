import { Polyline, InfoWindow } from '@react-google-maps/api';
import { useTravelTimeStore } from '../store/travelTimeStore';
import { fetchTravelTime } from '../services/directionsService';
import { useEffect, useState } from 'react';

export default function RouteDisplay() {
  const { routePoints, clearRoutePoints, mode } = useTravelTimeStore();
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (routePoints.length === 2) {
      const [a, b] = routePoints;
      fetchTravelTime(a, b, mode)
        .then((res) => {
          setPath(res.path);
          setDuration(res.durationMinutes);
        })
        .catch(() => {});
    } else {
      setPath([]);
      setDuration(null);
    }
  }, [routePoints, mode]);

  if (path.length === 0) return null;

  return (
    <>
      <Polyline
        path={path}
        options={{
          strokeColor: '#10B981',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          geodesic: true,
        }}
      />
      {/* Show duration label at midpoint */}
      {duration && (
        <InfoWindow
          position={path[Math.floor(path.length / 2)]}
          options={{ disableAutoPan: true }}
        >
          <div className="text-sm font-semibold">{duration} 分</div>
        </InfoWindow>
      )}
      {/* Clear button */}
      <button
        className="btn-secondary fixed bottom-20 right-4 z-40"
        onClick={clearRoutePoints}
      >
        選択解除
      </button>
    </>
  );
} 