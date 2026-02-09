import React, { useState, useRef, useEffect } from "react";
import {
  MdArrowBack,
  MdDirectionsWalk,
  MdSwapVert,
  MdSearch,
  MdNavigation,
  MdMyLocation,
  MdMoreHoriz,
  MdAdd,
  MdRemove,
  MdTrain,
  MdDirectionsBus,
  MdLocalTaxi,
  MdLocationOn,
} from "react-icons/md";
import {
  useRouteConnectionsStore,
  useRouteSearchStore,
} from "../store/routeStoreMigration";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { directionsService } from "../services/directionsService";
import useMediaQuery from "../hooks/useMediaQuery";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedOrigin?: { lat: number; lng: number; name: string };
  selectedDestination?: { lat: number; lng: number; name: string };
}

type TravelMode = "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";
type TransportOption = "TRAIN" | "WALKING" | "TAXI" | "BUS";

export default function RouteSearchPanel({
  isOpen,
  onClose,
  selectedOrigin,
  selectedDestination,
}: Props) {
  const [selectedOption, setSelectedOption] =
    useState<TransportOption>("TRAIN");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    duration: string;
    distance: string;
    mode: TravelMode;
    fare?: string;
    routes?: google.maps.DirectionsRoute[];
  } | null>(null);

  // RouteConnectionsStore から関数を取得
  const { addRoute, clearAllRoutes } = useRouteConnectionsStore();

  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // input要素の値を保持するRef
  const originValueRef = useRef<string>("");
  const destinationValueRef = useRef<string>("");

  // ブレークポイント
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isMobile = !isDesktop && !isTablet;
  const { map, panTo, zoomIn, zoomOut } = useGoogleMaps();

  // 詳細情報パネルの表示状態
  const placeOpen = !!useSelectedPlaceStore((s) => s.place);

  // ルート検索ストアの状態管理
  const {
    selectedOrigin: storeOrigin,
    selectedDestination: storeDestination,
    selectionMode,
    setSelectionMode,
    setSelectedOrigin: setStoreOrigin,
    setSelectedDestination: setStoreDestination,
    clearSelections,
  } = useRouteSearchStore();

  // プロップスからの地点情報をストアに反映
  useEffect(() => {
    if (selectedOrigin) {
      setStoreOrigin(selectedOrigin);
    }
  }, [selectedOrigin, setStoreOrigin]);

  useEffect(() => {
    if (selectedDestination) {
      setStoreDestination(selectedDestination);
    }
  }, [selectedDestination, setStoreDestination]);

  // ストアの地点情報をテキストフィールドに反映
  useEffect(() => {
    if (storeOrigin && storeOrigin.name) {
      if (originInputRef.current) {
        originInputRef.current.value = storeOrigin.name;
        originValueRef.current = storeOrigin.name;
      }
    }
  }, [storeOrigin]);

  useEffect(() => {
    if (storeDestination && storeDestination.name) {
      if (destinationInputRef.current) {
        destinationInputRef.current.value = storeDestination.name;
        destinationValueRef.current = storeDestination.name;
      }
    }
  }, [storeDestination]);

  // パネルが開いた時に選択モードをクリア（初期化は手動で行う）
  useEffect(() => {
    if (!isOpen) {
      setSelectionMode(null);
    }
  }, [isOpen, setSelectionMode]);

  // コンポーネントがレンダリングされた後にinput要素の値を復元
  useEffect(() => {
    const restoreInputValues = () => {
      if (originInputRef.current && originValueRef.current) {
        originInputRef.current.value = originValueRef.current;
      }
      if (destinationInputRef.current && destinationValueRef.current) {
        destinationInputRef.current.value = destinationValueRef.current;
      }
    };

    // 少し遅延させて確実にDOM要素が準備されてから実行
    const timeoutId = setTimeout(restoreInputValues, 50);

    return () => clearTimeout(timeoutId);
  });

  if (!isOpen) return null;

  const travelModes = [
    {
      option: "TRAIN" as TransportOption,
      mode: "TRANSIT" as TravelMode,
      icon: MdTrain,
      label: "Train",
    },
    {
      option: "WALKING" as TransportOption,
      mode: "WALKING" as TravelMode,
      icon: MdDirectionsWalk,
      label: "Walking",
    },
    {
      option: "TAXI" as TransportOption,
      mode: "DRIVING" as TravelMode,
      icon: MdLocalTaxi,
      label: "Taxi",
    },
    {
      option: "BUS" as TransportOption,
      mode: "TRANSIT" as TravelMode,
      icon: MdDirectionsBus,
      label: "Bus",
    },
  ];

  const selectedMode =
    travelModes.find((item) => item.option === selectedOption)?.mode ??
    "TRANSIT";

  const handleSearch = async () => {
    // 非制御コンポーネントから値を取得
    const currentOriginText = originInputRef.current?.value || "";
    const currentDestinationText = destinationInputRef.current?.value || "";

    // 現在の入力値をRefに保存（検索後の復元用）
    originValueRef.current = currentOriginText;
    destinationValueRef.current = currentDestinationText;

    if (!currentOriginText.trim() || !currentDestinationText.trim()) {
      alert("Please enter origin and destination");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    // 既存の検索結果ルートをクリア
    clearAllRoutes();

    try {
      let originCoords: { lat: number; lng: number };
      let destinationCoords: { lat: number; lng: number };

      // 選択された地点の座標があればそれを使用、なければGeocoding APIを使用
      if (
        storeOrigin &&
        (currentOriginText === storeOrigin.name ||
          currentOriginText.includes(storeOrigin.name))
      ) {
        originCoords = storeOrigin;
      } else {
        const geocoder = new google.maps.Geocoder();
        const originResult = await new Promise<google.maps.GeocoderResult>(
          (resolve, reject) => {
            geocoder.geocode(
              { address: currentOriginText },
              (results, status) => {
                if (status === "OK" && results && results[0]) {
                  resolve(results[0]);
                } else {
                  reject(new Error("Origin address not found"));
                }
              },
            );
          },
        );
        if (!originResult.geometry?.location) {
          throw new Error("Failed to get origin coordinates");
        }
        originCoords = {
          lat: originResult.geometry.location.lat(),
          lng: originResult.geometry.location.lng(),
        };
      }

      if (
        storeDestination &&
        (currentDestinationText === storeDestination.name ||
          currentDestinationText.includes(storeDestination.name))
      ) {
        destinationCoords = storeDestination;
      } else {
        const geocoder = new google.maps.Geocoder();
        const destinationResult = await new Promise<google.maps.GeocoderResult>(
          (resolve, reject) => {
            geocoder.geocode(
              { address: currentDestinationText },
              (results, status) => {
                if (status === "OK" && results && results[0]) {
                  resolve(results[0]);
                } else {
                  reject(new Error("Destination address not found"));
                }
              },
            );
          },
        );
        if (!destinationResult.geometry?.location) {
          throw new Error("Failed to get destination coordinates");
        }
        destinationCoords = {
          lat: destinationResult.geometry.location.lat(),
          lng: destinationResult.geometry.location.lng(),
        };
      }

      // Directions APIで経路検索
      let routeResult;
      let actualTravelMode = google.maps.TravelMode[selectedMode];

      try {
        routeResult = await directionsService.getRoute(
          originCoords,
          destinationCoords,
          google.maps.TravelMode[selectedMode],
        );
      } catch (transitError) {
        if (selectedMode === "TRANSIT") {
          // WALKINGモードでリトライ（徒歩+公共交通機関の代替として）
          try {
            routeResult = await directionsService.getRoute(
              originCoords,
              destinationCoords,
              google.maps.TravelMode.WALKING,
            );
            actualTravelMode = google.maps.TravelMode.WALKING;
          } catch (walkingError) {
            // 最後の手段としてDRIVINGを試行
            try {
              routeResult = await directionsService.getRoute(
                originCoords,
                destinationCoords,
                google.maps.TravelMode.DRIVING,
              );
              actualTravelMode = google.maps.TravelMode.DRIVING;
            } catch (drivingError) {
              throw new Error(
                "Could not find a route between these locations.",
              );
            }
          }
        } else {
          throw transitError;
        }
      }

      // 実際の移動手段をTravelMode文字列に変換
      const actualModeString =
        actualTravelMode === google.maps.TravelMode.WALKING
          ? "WALKING"
          : actualTravelMode === google.maps.TravelMode.DRIVING
            ? "DRIVING"
            : actualTravelMode === google.maps.TravelMode.TRANSIT
              ? "TRANSIT"
              : actualTravelMode === google.maps.TravelMode.BICYCLING
                ? "BICYCLING"
                : "DRIVING";

      // Fare logic placeholder
      const routeFare = routeResult.route?.routes?.[0]?.fare;
      const fare = routeFare
        ? (routeFare as any).text || `${routeFare.value} ${routeFare.currency}`
        : "";

      setSearchResult({
        duration: routeResult.durationText,
        distance: routeResult.distanceText,
        mode: actualModeString as TravelMode,
        fare,
        routes: routeResult.route?.routes,
      });

      // RouteConnectionsStoreにルートを追加して地図上に表示
      const routeConnection = {
        originId: `search_origin_${Date.now()}`, // 検索用の一意ID
        destinationId: `search_destination_${Date.now()}`, // 検索用の一意ID
        originCoordinates: originCoords,
        destinationCoordinates: destinationCoords,
        travelMode: actualTravelMode, // フォールバック処理後の実際の移動手段
        duration: routeResult.duration,
        distance: routeResult.distance,
        durationText: routeResult.durationText,
        distanceText: routeResult.distanceText,
        route: routeResult.route,
      };

      try {
        // 既存の検索結果ルートを削除（最新の検索結果のみ表示）
        addRoute(routeConnection);
      } catch (error) {
        console.error("❌ Error adding route to map:", error);
        console.error("Route data:", routeConnection);
        throw error;
      }
    } catch (error) {
      console.error("Route search error:", error);
      alert(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSearching(false);

      // 検索後にinput要素の値を復元
      setTimeout(() => {
        if (originInputRef.current && originValueRef.current) {
          originInputRef.current.value = originValueRef.current;
        }
        if (destinationInputRef.current && destinationValueRef.current) {
          destinationInputRef.current.value = destinationValueRef.current;
        }
      }, 100);
    }
  };

  const handleSwap = () => {
    const originValue = originInputRef.current?.value || "";
    const destinationValue = destinationInputRef.current?.value || "";

    if (originInputRef.current) {
      originInputRef.current.value = destinationValue;
    }
    if (destinationInputRef.current) {
      destinationInputRef.current.value = originValue;
    }

    originValueRef.current = destinationValue;
    destinationValueRef.current = originValue;
  };

  // FAB Container Style
  const fabContainerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: isMobile ? "24px" : "32px",
    right: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    pointerEvents: "auto",
    zIndex: 50,
  };

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const panelStyle: React.CSSProperties = isDesktop
      ? {
          width: "400px",
          maxHeight: "calc(100vh - 32px)",
          marginTop: "16px",
          marginLeft: placeOpen ? "420px" : "16px", // Adjust based on sidebar
        }
      : isTablet
        ? {
            width: "360px",
            maxHeight: "80vh",
            marginTop: "16px",
            marginLeft: "16px",
          }
        : {
            // Mobile: Bottom sheet style but simplified as floating card
            width: "calc(100vw - 32px)",
            maxHeight: "85vh",
            marginBottom: "16px",
          };

    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none flex font-sans"
        style={{
          justifyContent: isDesktop || isTablet ? "flex-start" : "center",
          alignItems: isDesktop || isTablet ? "flex-start" : "flex-end",
        }}
      >
        <div
          style={panelStyle}
          className="glass-effect pointer-events-auto overflow-hidden shadow-elevation-4 bg-white rounded-3xl flex flex-col transition-all duration-300 ease-ios-default"
        >
          {children}
        </div>

        {/* Map Zoom/Nav FABs - Positioned relative to screen/map */}
        <div style={fabContainerStyle}>
          <button
            onClick={() => {
              if (!map || !navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                panTo(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  map.getZoom() || 15,
                );
              });
            }}
            className="w-12 h-12 bg-white rounded-full shadow-elevation-2 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
            title="Current Location"
          >
            <MdNavigation size={24} className="text-coral-500" />
          </button>
          <div className="flex flex-col bg-white rounded-2xl shadow-elevation-2 overflow-hidden">
            <button
              onClick={zoomIn}
              className="w-12 h-12 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100"
              title="Zoom In"
            >
              <MdAdd size={24} />
            </button>
            <button
              onClick={zoomOut}
              className="w-12 h-12 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              title="Zoom Out"
            >
              <MdRemove size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => {
            setSelectionMode(null);
            clearAllRoutes();
            clearSelections();
            setSearchResult(null);
            onClose();
          }}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors mr-2"
        >
          <MdArrowBack size={24} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Route Search</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Origin / Destination Inputs */}
        <div className="relative flex flex-col gap-0 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {/* Origin */}
          <div className="flex items-center px-3 py-3 border-b border-gray-200">
            <MdLocationOn
              className="text-coral-500 mr-3 flex-shrink-0"
              size={20}
            />
            <div className="flex-1">
              <label className="block text-xs text-gray-500 font-medium mb-0.5">
                Origin
              </label>
              <input
                ref={originInputRef}
                type="text"
                placeholder="Where from?"
                defaultValue="Current Location"
                onChange={(e) => (originValueRef.current = e.target.value)}
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none text-base font-medium"
              />
            </div>
            <button
              onClick={() => setSelectionMode("origin")}
              className={`p-2 rounded-full hover:bg-coral-50 text-coral-500 transition-colors ${
                selectionMode === "origin" ? "bg-coral-100" : ""
              }`}
              title="Pick on map"
            >
              <MdMyLocation size={20} />
            </button>
          </div>

          {/* Destination */}
          <div className="flex items-center px-3 py-3">
            <MdLocationOn
              className="text-gray-400 mr-3 flex-shrink-0"
              size={20}
            />
            <div className="flex-1">
              <label className="block text-xs text-gray-500 font-medium mb-0.5">
                Destination
              </label>
              <input
                ref={destinationInputRef}
                type="text"
                placeholder="Where to?"
                onChange={(e) => (destinationValueRef.current = e.target.value)}
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none text-base font-medium"
              />
            </div>
            <button
              onClick={() => setSelectionMode("destination")}
              className={`p-2 rounded-full hover:bg-coral-50 text-coral-500 transition-colors ${
                selectionMode === "destination" ? "bg-coral-100" : ""
              }`}
              title="Pick on map"
            >
              <MdLocationOn size={20} />
            </button>
          </div>

          {/* Swap Button (Floating) */}
          <button
            onClick={handleSwap}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-coral-500 shadow-sm hover:bg-gray-50 z-10"
          >
            <MdSwapVert size={18} />
          </button>
        </div>

        {/* Transport Modes */}
        <div className="flex justify-between items-center bg-gray-100 p-1 rounded-xl mb-6">
          {travelModes.map(({ option, icon: Icon, label }) => {
            const isSelected = selectedOption === option;
            return (
              <button
                key={option}
                onClick={() => setSelectedOption(option)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isSelected
                    ? "bg-white text-coral-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Result Card */}
        {searchResult ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-elevation-1 overflow-hidden animate-modal-zoom-in">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 font-display">
                    {searchResult.duration
                      .replace(" mins", "")
                      .replace(" hours", "h")}
                    <span className="text-lg font-medium text-gray-500 ml-1">
                      min
                    </span>
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    • {searchResult.fare || "¥210"}
                  </span>
                </div>
                <div className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold uppercase tracking-wide">
                  Fastest
                </div>
              </div>

              {/* Line Badge (Mocked visual if data missing) */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 px-2 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  G
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  via Ginza Line
                </span>
                <span className="text-xs text-gray-400">• Every 4 mins</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{searchResult.distance}</span>
                <span>12:40 PM - 1:05 PM</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 flex items-center gap-3">
              <button className="flex-1 bg-coral-500 hover:bg-coral-600 text-white font-bold py-3 px-4 rounded-xl shadow-coral-glow transition-all active:scale-95 flex items-center justify-center gap-2">
                <MdNavigation size={20} />
                Start Navigation
              </button>
              <button className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                <MdMoreHoriz size={24} />
              </button>
            </div>
          </div>
        ) : (
          /* Empty State / Search Button */
          <div className="mt-4">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-elevation-2 hover:shadow-elevation-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MdSearch size={20} />
                  Find Best Route
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Container>
  );
}
