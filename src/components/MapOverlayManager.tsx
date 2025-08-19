import React, { useState, useMemo } from "react";
import { Marker } from "@react-google-maps/api";
import { useSavedPlacesStore } from "../store/savedPlacesStore";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { useLabelsStore } from "../store/labelsStore";
import { useRouteConnectionsStore } from "../store/routeStoreMigration";
import { useTravelTimeMode } from "../hooks/useTravelTimeMode";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import { MapLabel } from "../types";
import { classifyCategory } from "../utils/categoryClassifier";
import { getCategoryColor } from "../utils/categoryIcons";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../hooks/useAuth";
import { usePlanStore } from "../store/planStore";
import { useUIStore } from "../store/uiStore";
import { OverlayView } from "@react-google-maps/api";

// コンポーネントのインポート
import PlaceCircle from "./PlaceCircle";
import PlaceLabel from "./PlaceLabel";
import LabelOverlay from "./LabelOverlay";
import LabelEditDialog from "./LabelEditDialog";
// import AddLabelToggle from './AddLabelToggle'; // TabNavigation に統合済み
import TravelTimeCircleBase from "./TravelTimeCircle";
import RouteDisplayBase from "./RouteDisplay";
import RouteMarkers from "./RouteMarkers";
import PlaceMarkerCluster from "./PlaceMarkerCluster";
import { withErrorBoundary } from "./hoc/withErrorBoundary";
import { PlaceNotificationOverlay } from "./PlaceNotificationOverlay";

// エラーバウンダリでラップ
const RouteDisplay = withErrorBoundary(RouteDisplayBase);
const TravelTimeCircle = withErrorBoundary(TravelTimeCircleBase);

/**
 * 地図オーバーレイの管理を担当するコンポーネント
 * 単一責任: 地図上のオーバーレイ要素（マーカー、ラベル、ルート等）の管理のみ
 */

interface MapOverlayManagerProps {
  zoom: number;
  showLabelToggle?: boolean;
  children?: React.ReactNode;
}

export default function MapOverlayManager({
  zoom,
  showLabelToggle = true,
  children,
}: MapOverlayManagerProps) {
  const [editing, setEditing] = useState<MapLabel | null>(null);

  // 地図インスタンスの取得
  const { map } = useGoogleMaps();

  // ストアからの状態取得
  const savedPlaces = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const { place, setPlace } = useSelectedPlaceStore();
  const { labels, updateLabel } = useLabelsStore();
  const { routes } = useRouteConnectionsStore();
  const { circles } = useTravelTimeMode();
  const { user } = useAuthStore();
  const { plan } = usePlanStore();
  const { notifications, isReadByUser, markAsRead, getNotificationsByPlan } =
    useNotificationStore();
  const { selectedCategories } = useUIStore();

  // カテゴリフィルタリングを適用
  const filteredPlaces = useMemo(() => {
    if (selectedCategories.length === 0) {
      return savedPlaces; // 何も選択されていない場合は全て表示
    }
    return savedPlaces.filter((place) =>
      selectedCategories.includes(place.category),
    );
  }, [savedPlaces, selectedCategories]);

  // 現在のプランの未読通知を取得（自分が追加した場所の通知は除外）
  const unreadNotifications = useMemo(() => {
    if (!plan || !user) {
      console.log("[通知表示] プランまたはユーザーが未設定:", {
        hasPlan: !!plan,
        hasUser: !!user,
      });
      return [];
    }

    const planNotifications = getNotificationsByPlan(plan.id, user.uid);
    const unread = planNotifications.filter(
      (n) => !isReadByUser(n, user.uid) && n.addedBy.uid !== user.uid, // 自分が追加した場所の通知は表示しない
    );

    console.log("[通知表示] 通知の状況:", {
      planId: plan.id,
      userId: user.uid,
      全通知数: notifications.length,
      プランの通知数: planNotifications.length,
      未読通知数: unread.length,
      通知詳細: unread.map((n) => ({
        id: n.id,
        placeName: n.placeName,
        addedBy: n.addedBy.displayName,
        timestamp: new Date(n.timestamp).toISOString(),
      })),
    });

    return unread;
  }, [plan, user, getNotificationsByPlan, isReadByUser, notifications]);

  // 通知の確認ハンドラー
  const handleNotificationConfirm = (
    notificationId: string,
    placeId: string,
  ) => {
    if (!user) return;

    // 既読にする
    markAsRead(notificationId, user.uid);

    // 該当する場所を選択
    const notificationPlace = savedPlaces.find((p) => p.id === placeId);
    if (notificationPlace && map) {
      setPlace({
        place_id: notificationPlace.id,
        name: notificationPlace.name,
        geometry: {
          location: {
            lat: () => notificationPlace.coordinates.lat,
            lng: () => notificationPlace.coordinates.lng,
          } as google.maps.LatLng,
        },
        types: [notificationPlace.category],
      } as google.maps.places.PlaceResult);
    }
  };

  return (
    <>
      {/* マーカークラスタリング（多数の地点がある場合） */}
      <PlaceMarkerCluster zoom={zoom} threshold={15} />

      {/* 候補地のサークルとオーバーレイ */}
      {filteredPlaces.map((p) => (
        <PlaceCircle
          key={`place-circle-${plan?.id || "no-plan"}-${p.id}`}
          place={p}
          zoom={zoom}
        />
      ))}

      {/* 選択中の地点のマーカー */}
      {place &&
        place.geometry?.location &&
        (() => {
          // POI地点のカテゴリーを分類
          const category = classifyCategory(place.types);
          const categoryColor = getCategoryColor(category);

          return (
            <Marker
              position={{
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: categoryColor,
                fillOpacity: 0.9,
                strokeWeight: 3,
                strokeColor: "#ffffff",
                scale: 16, // 通常のマーカーより大きく表示
                anchor: new google.maps.Point(0, 0), // 中央に配置
              }}
              zIndex={1000} // 他のマーカーより前面に表示
            />
          );
        })()}

      {/* 地点の付箋ラベル */}
      {savedPlaces.map((p) => (
        <PlaceLabel
          key={`place-label-${plan?.id || "no-plan"}-${p.id}`}
          place={p}
          zoom={zoom}
        />
      ))}

      {/* カスタムラベル */}
      {labels.map((l) => (
        <LabelOverlay
          key={`label-${l.id}`}
          label={l}
          map={map}
          onEdit={() => setEditing(l)}
          onMove={(pos) => {
            // ローカルの状態のみ更新（同期はしない）
            updateLabel(l.id, { position: pos }, true);
          }}
          onResize={(size) => {
            // ローカルの状態のみ更新（同期はしない）
            updateLabel(l.id, size, true);
          }}
          onMoveEnd={(pos) => {
            // 操作終了時に同期
            updateLabel(l.id, { position: pos });
          }}
          onResizeEnd={(size) => {
            // 操作終了時に同期
            updateLabel(l.id, size);
          }}
        />
      ))}

      {/* 通知オーバーレイの表示 */}
      {map &&
        unreadNotifications.map((notification) => (
          <OverlayView
            key={`notification-${notification.id}`}
            position={notification.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <PlaceNotificationOverlay
              notification={notification}
              onConfirm={() =>
                handleNotificationConfirm(notification.id, notification.placeId)
              }
              map={map}
              position={{ x: 0, y: 0 }} // OverlayViewが位置を管理
            />
          </OverlayView>
        ))}

      {/* 移動時間圏の表示 */}
      {circles.map((c) => (
        <TravelTimeCircle
          key={`travel-circle-${c.id}`}
          circle={c}
          zoom={zoom}
        />
      ))}

      {/* ルート検索のマーカー */}
      <RouteMarkers />

      {/* 2地点間のルート表示 */}
      {routes.map((route) => (
        <RouteDisplay key={`route-${route.id}`} route={route} zoom={zoom} />
      ))}

      {/* ラベル編集ダイアログ */}
      {editing && (
        <LabelEditDialog
          label={editing}
          onSave={(u) => updateLabel(editing.id, u)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* ラベル追加トグルは TabNavigation に統合済み */}

      {/* 子コンポーネント */}
      {children}
    </>
  );
}
