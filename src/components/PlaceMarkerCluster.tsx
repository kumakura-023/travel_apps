import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useSelectedPlaceStore } from '../store/selectedPlaceStore';
import { useUIStore } from '../store/uiStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getCategoryColor } from '../utils/categoryIcons';

interface PlaceMarkerClusterProps {
  zoom: number;
  threshold?: number; // クラスタリングを開始するための最小地点数
}

const PlaceMarkerCluster: React.FC<PlaceMarkerClusterProps> = ({ 
  zoom, 
  threshold = 10 
}) => {
  const { map } = useGoogleMaps();
  const savedPlaces = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { setPlace } = useSelectedPlaceStore();
  const { selectedCategories } = useUIStore();

  // カテゴリフィルタリングを適用
  const places = useMemo(() => {
    if (selectedCategories.length === 0) {
      return savedPlaces; // 何も選択されていない場合は全て表示
    }
    return savedPlaces.filter(place => selectedCategories.includes(place.category));
  }, [savedPlaces, selectedCategories]);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [shouldCluster, setShouldCluster] = useState(false);

  // 地点数が閾値を超えた場合のみクラスタリングを有効化
  useEffect(() => {
    setShouldCluster(places.length >= threshold);
  }, [places.length, threshold]);

  // マーカーの作成
  const createMarkers = (): google.maps.Marker[] => {
    if (!map) return [];

    return places.map((place) => {
      const marker = new google.maps.Marker({
        position: {
          lat: place.coordinates.lat,
          lng: place.coordinates.lng
        },
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getCategoryColor(place.category),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // マーカークリック時のイベント
      marker.addListener('click', () => {
        // Google Places APIの形式に変換
        const placeResult: google.maps.places.PlaceResult = {
          place_id: place.id,
          name: place.name,
          formatted_address: place.address,
          geometry: {
            location: new google.maps.LatLng(
              place.coordinates.lat,
              place.coordinates.lng
            )
          }
        };
        setPlace(placeResult);
      });

      return marker;
    });
  };

  // クラスタリングの設定
  useEffect(() => {
    if (!map || !shouldCluster) {
      // クラスタリングを無効化する場合は既存のクラスタラーを削除
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }
      // 個々のマーカーを削除
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    console.log('Setting up marker clustering for', places.length, 'places');

    // 既存のクラスタラーがあれば削除
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    // 新しいマーカーを作成
    const markers = createMarkers();
    markersRef.current = markers;

    // マーカークラスタラーを作成
    const clusterer = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({
        radius: 60,
        minPoints: 3,
        maxZoom: 15
      })
    });

    markerClustererRef.current = clusterer;

    // クリーンアップ関数
    return () => {
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, places, shouldCluster]);

  // ズームレベルによるクラスター調整
  useEffect(() => {
    if (!markerClustererRef.current) return;

    // ズームレベルが高い場合はクラスタリングを緩める
    const newRadius = zoom >= 16 ? 40 : zoom >= 14 ? 60 : 80;
    const newMinPoints = zoom >= 16 ? 2 : 3;

    // 新しい設定でクラスタラーを再作成
    if (map && shouldCluster) {
      markerClustererRef.current.clearMarkers();
      
      const markers = createMarkers();
      markersRef.current = markers;

      const clusterer = new MarkerClusterer({
        map,
        markers,
        algorithm: new SuperClusterAlgorithm({
          radius: newRadius,
          minPoints: newMinPoints,
          maxZoom: 15
        })
      });

      markerClustererRef.current = clusterer;
    }
  }, [zoom, map, shouldCluster]);

  // このコンポーネントは視覚的要素を持たない
  return null;
};

export default PlaceMarkerCluster; 