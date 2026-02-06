import { GoogleMap } from "@react-google-maps/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import { initializePlacesApiService } from "../services/placesApiService";
import MapStateManager from "./MapStateManager";
import MapEventHandler from "./MapEventHandler";
import MapOverlayManager from "./MapOverlayManager";
import { useUIStore } from "../store/uiStore";
import { usePlanStore } from "../store/planStore";

/**
 * 地図コンテナコンポーネント
 * 単一責任: 地図の表示と子コンポーネントの統合のみ
 *
 * アーキテクチャパターン:
 * - MapStateManager: 状態管理の責任を分離
 * - MapEventHandler: イベント処理の責任を分離
 * - MapOverlayManager: オーバーレイ管理の責任を分離
 */

interface MapContainerProps {
  children?: React.ReactNode;
  showLabelToggle?: boolean;
}

export default function MapContainer({
  children,
  showLabelToggle = true,
}: MapContainerProps) {
  const { setMap, map } = useGoogleMaps();
  // デフォルトのズームレベル（個人の保存状態は使用しない）
  const [zoom, setZoom] = useState(14);
  const isMapInteractionEnabled = useUIStore((s) => s.isMapInteractionEnabled);
  const { plan } = usePlanStore();
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const focusMapToLastAction = useCallback(
    (map: google.maps.Map) => {
      const lastActionPosition = plan?.lastActionPosition?.position;
      if (!lastActionPosition) {
        return false;
      }

      map.setCenter(lastActionPosition);
      if ((map.getZoom() ?? 0) < 14) {
        map.setZoom(15);
      }

      return true;
    },
    [plan?.lastActionPosition?.position],
  );

  // プラン内の全ての場所を表示するように地図をフィット
  const fitMapToShowAllPlaces = useCallback(
    (map: google.maps.Map) => {
      if (!plan || !plan.places || plan.places.length === 0) {
        // プランや場所がない場合は、デフォルト位置（東京）に設定
        map.setCenter({ lat: 35.6762, lng: 139.6503 });
        map.setZoom(12);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      let hasValidPlaces = false;

      // 全ての場所を境界に追加
      plan.places.forEach((place) => {
        if (place.coordinates && !place.deleted) {
          bounds.extend(
            new google.maps.LatLng(
              place.coordinates.lat,
              place.coordinates.lng,
            ),
          );
          hasValidPlaces = true;
        }
      });

      if (hasValidPlaces) {
        // 全ての場所が見えるように地図をフィット
        map.fitBounds(bounds);

        // ズームが近すぎる場合は調整
        setTimeout(() => {
          const zoom = map.getZoom();
          if (zoom && zoom > 16) {
            map.setZoom(16);
          }
        }, 100);
      } else {
        // 有効な場所がない場合はデフォルト位置
        map.setCenter({ lat: 35.6762, lng: 139.6503 });
        map.setZoom(12);
      }
    },
    [plan],
  );

  // 地図の読み込み完了時のハンドラー
  const handleMapLoad = (map: google.maps.Map) => {
    setMap(map);
    initializePlacesApiService(map);

    // プランの初期表示時は前回操作位置を優先し、なければ全体表示
    setTimeout(() => {
      const focused = focusMapToLastAction(map);
      if (!focused) {
        fitMapToShowAllPlaces(map);
      }
    }, 100);

    setZoom(map.getZoom() ?? 14);

    // ズーム変更の監視
    map.addListener("zoom_changed", () => {
      setZoom(map.getZoom() ?? 14);
    });
  };

  // プランが変更された時の地図表示調整
  useEffect(() => {
    const planId = plan?.id;
    const lastActionPosition = plan?.lastActionPosition?.position;

    if (map && planId) {
      const focused = focusMapToLastAction(map);
      if (focused && lastActionPosition) {
        lastPositionRef.current = { ...lastActionPosition };
        return;
      }

      lastPositionRef.current = null;
      fitMapToShowAllPlaces(map);
    }
  }, [
    map,
    plan?.id,
    plan?.lastActionPosition?.position,
    fitMapToShowAllPlaces,
    focusMapToLastAction,
  ]); // plan.id が変更された時にトリガー

  // lastActionPositionの変更は新しい場所やラベルが追加された時のみ反応
  useEffect(() => {
    const lastLat = plan?.lastActionPosition?.position?.lat;
    const lastLng = plan?.lastActionPosition?.position?.lng;

    if (map && typeof lastLat === "number" && typeof lastLng === "number") {
      const newPosition = { lat: lastLat, lng: lastLng };
      const lastPosition = lastPositionRef.current;

      // 新しい操作があった場合のみ、その位置に移動
      if (
        lastPosition &&
        (Math.abs(lastPosition.lat - newPosition.lat) > 0.000001 ||
          Math.abs(lastPosition.lng - newPosition.lng) > 0.000001)
      ) {
        console.log(
          "[MapContainer] Panning to lastActionPosition:",
          newPosition,
        );
        // 地図の中心を移動
        map.panTo(newPosition);

        // ズームレベルも適切に設定
        if (map.getZoom()! < 14) {
          map.setZoom(15);
        }
      }

      // 前回の位置を更新
      lastPositionRef.current = { ...newPosition };
    }
  }, [
    map,
    plan?.lastActionPosition?.position?.lat,
    plan?.lastActionPosition?.position?.lng,
  ]);

  // isMapInteractionEnabledの変更を監視してgestureHandlingを更新
  useEffect(() => {
    if (map) {
      map.setOptions({
        gestureHandling: isMapInteractionEnabled ? "greedy" : "none",
      });
    }
  }, [map, isMapInteractionEnabled]);

  return (
    <MapStateManager>
      {({ containerStyle, mapOptions, center }) => (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          options={{
            ...mapOptions,
            disableDoubleClickZoom: true, // ダブルクリックによるズームを無効化
            gestureHandling: isMapInteractionEnabled ? "greedy" : "none",
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={handleMapLoad}
        >
          {/* イベント処理コンポーネント（UIを持たない） */}
          <MapEventHandler />

          {/* オーバーレイ管理コンポーネント */}
          <MapOverlayManager zoom={zoom} showLabelToggle={showLabelToggle}>
            {children}
          </MapOverlayManager>
        </GoogleMap>
      )}
    </MapStateManager>
  );
}
