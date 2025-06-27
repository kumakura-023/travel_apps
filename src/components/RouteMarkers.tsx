import React from 'react';
import { Marker } from '@react-google-maps/api';
import { useRouteSearchStore } from '../store/routeSearchStore';

export default function RouteMarkers() {
  const { selectedOrigin, selectedDestination } = useRouteSearchStore();

  console.log('RouteMarkers render:', { 
    hasOrigin: !!selectedOrigin, 
    hasDestination: !!selectedDestination,
    origin: selectedOrigin,
    destination: selectedDestination 
  });

  return (
    <>
      {/* 出発地マーカー */}
      {selectedOrigin && (
        <Marker
          position={{ lat: selectedOrigin.lat, lng: selectedOrigin.lng }}
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32),
          }}
          title={`出発地: ${selectedOrigin.name}`}
          onLoad={() => console.log('Origin marker loaded:', selectedOrigin.name)}
        />
      )}
      
      {/* 目的地マーカー */}
      {selectedDestination && (
        <Marker
          position={{ lat: selectedDestination.lat, lng: selectedDestination.lng }}
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32),
          }}
          title={`目的地: ${selectedDestination.name}`}
          onLoad={() => console.log('Destination marker loaded:', selectedDestination.name)}
        />
      )}
    </>
  );
} 