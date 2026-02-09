import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MdAdd,
  MdArrowBack,
  MdChevronRight,
  MdDirectionsBus,
  MdDirectionsWalk,
  MdLocalTaxi,
  MdLocationOn,
  MdMoreHoriz,
  MdMyLocation,
  MdNavigation,
  MdNearMe,
  MdRemove,
  MdSearch,
  MdSwapVert,
  MdTrain,
} from "react-icons/md";
import {
  useRouteConnectionsStore,
  useRouteSearchStore,
} from "../store/routeStoreMigration";
import { directionsService } from "../services/directionsService";
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
    fare?: string;
    mode: TravelMode;
  } | null>(null);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const originValueRef = useRef<string>("");
  const destinationValueRef = useRef<string>("");

  const { addRoute, clearAllRoutes } = useRouteConnectionsStore();
  const {
    selectedOrigin: storeOrigin,
    selectedDestination: storeDestination,
    selectionMode,
    setSelectionMode,
    setSelectedOrigin: setStoreOrigin,
    setSelectedDestination: setStoreDestination,
    clearSelections,
  } = useRouteSearchStore();
  const { map, panTo, zoomIn, zoomOut } = useGoogleMaps();

  const travelModes = useMemo(
    () => [
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
    ],
    [],
  );

  const selectedMode =
    travelModes.find((item) => item.option === selectedOption)?.mode ??
    "TRANSIT";

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

  useEffect(() => {
    if (storeOrigin?.name && originInputRef.current) {
      originInputRef.current.value = storeOrigin.name;
      originValueRef.current = storeOrigin.name;
    }
  }, [storeOrigin]);

  useEffect(() => {
    if (storeDestination?.name && destinationInputRef.current) {
      destinationInputRef.current.value = storeDestination.name;
      destinationValueRef.current = storeDestination.name;
    }
  }, [storeDestination]);

  useEffect(() => {
    if (!isOpen) {
      setSelectionMode(null);
    }
  }, [isOpen, setSelectionMode]);

  const handleClose = () => {
    setSelectionMode(null);
    clearAllRoutes();
    clearSelections();
    setSearchResult(null);
    onClose();
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

    setStoreOrigin(storeDestination);
    setStoreDestination(storeOrigin);
  };

  const setCurrentLocationAsOrigin = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const point = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: "Current Location",
      };
      setStoreOrigin(point);
      if (originInputRef.current) {
        originInputRef.current.value = point.name;
      }
      originValueRef.current = point.name;
      if (map) {
        panTo(point.lat, point.lng, map.getZoom() || 15);
      }
    });
  };

  const handleSearch = async () => {
    const currentOriginText = originInputRef.current?.value || "";
    const currentDestinationText = destinationInputRef.current?.value || "";

    originValueRef.current = currentOriginText;
    destinationValueRef.current = currentDestinationText;

    if (!currentOriginText.trim() || !currentDestinationText.trim()) {
      alert("出発地と目的地を入力してください");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    clearAllRoutes();

    try {
      let originCoords: { lat: number; lng: number };
      let destinationCoords: { lat: number; lng: number };

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
                  reject(new Error("出発地の住所が見つかりません"));
                }
              },
            );
          },
        );
        if (!originResult.geometry?.location) {
          throw new Error("出発地の座標の取得に失敗しました");
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
                  reject(new Error("目的地の住所が見つかりません"));
                }
              },
            );
          },
        );
        if (!destinationResult.geometry?.location) {
          throw new Error("目的地の座標の取得に失敗しました");
        }
        destinationCoords = {
          lat: destinationResult.geometry.location.lat(),
          lng: destinationResult.geometry.location.lng(),
        };
      }

      let routeResult;
      let actualTravelMode = google.maps.TravelMode[selectedMode];

      try {
        routeResult = await directionsService.getRoute(
          originCoords,
          destinationCoords,
          google.maps.TravelMode[selectedMode],
        );
      } catch (error) {
        if (selectedMode === "TRANSIT") {
          routeResult = await directionsService.getRoute(
            originCoords,
            destinationCoords,
            google.maps.TravelMode.WALKING,
          );
          actualTravelMode = google.maps.TravelMode.WALKING;
        } else {
          throw error;
        }
      }

      const actualModeString: TravelMode =
        actualTravelMode === google.maps.TravelMode.WALKING
          ? "WALKING"
          : actualTravelMode === google.maps.TravelMode.DRIVING
            ? "DRIVING"
            : actualTravelMode === google.maps.TravelMode.TRANSIT
              ? "TRANSIT"
              : "BICYCLING";

      const routeFare = routeResult.route?.routes?.[0]?.fare;
      const fare = routeFare
        ? (routeFare as any).text || `${routeFare.value} ${routeFare.currency}`
        : "¥210";

      setSearchResult({
        duration: routeResult.durationText,
        distance: routeResult.distanceText,
        fare,
        mode: actualModeString,
      });

      addRoute({
        originId: `search_origin_${Date.now()}`,
        destinationId: `search_destination_${Date.now()}`,
        originCoordinates: originCoords,
        destinationCoordinates: destinationCoords,
        travelMode: actualTravelMode,
        duration: routeResult.duration,
        distance: routeResult.distance,
        durationText: routeResult.durationText,
        distanceText: routeResult.distanceText,
        route: routeResult.route,
      });
    } catch (error) {
      alert(
        `経路検索に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="pointer-events-auto absolute top-2 left-2 right-2 mx-auto max-w-[260px] rounded-2xl border border-white/40 bg-white/85 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.16)] backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between">
            <button
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
              title="戻る"
            >
              <MdArrowBack size={16} />
            </button>
            <button
              onClick={setCurrentLocationAsOrigin}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sky-600 hover:bg-sky-50"
              title="現在地を出発地に設定"
            >
              <MdMyLocation size={16} />
            </button>
          </div>

          <div className="relative rounded-xl bg-white px-2 py-1.5">
            <div className="absolute left-[15px] top-[26px] h-5 border-l-2 border-dotted border-slate-300" />

            <div className="flex items-center gap-1.5 py-0.5">
              <MdMyLocation size={14} className="text-sky-600" />
              <input
                ref={originInputRef}
                type="text"
                placeholder="Current Location"
                onChange={(e) => {
                  originValueRef.current = e.target.value;
                }}
                className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none"
              />
              <button
                onClick={() => setSelectionMode("origin")}
                className={`rounded-full p-1 ${
                  selectionMode === "origin"
                    ? "bg-coral-500/15 text-coral-500"
                    : "text-slate-400"
                }`}
                title="地図から出発地を選択"
              >
                <MdLocationOn size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 py-0.5">
              <MdLocationOn size={14} className="text-coral-500" />
              <input
                ref={destinationInputRef}
                type="text"
                placeholder="Senso-ji Temple"
                onChange={(e) => {
                  destinationValueRef.current = e.target.value;
                }}
                className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none"
              />
              <button
                onClick={() => setSelectionMode("destination")}
                className={`rounded-full p-1 ${
                  selectionMode === "destination"
                    ? "bg-coral-500/15 text-coral-500"
                    : "text-slate-400"
                }`}
                title="地図から目的地を選択"
              >
                <MdLocationOn size={14} />
              </button>
            </div>

            <button
              onClick={handleSwap}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 text-slate-600 shadow-sm"
              title="入れ替え"
            >
              <MdSwapVert size={14} />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <button
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/90 text-slate-700 shadow-md backdrop-blur"
            title="拡大"
          >
            <MdAdd size={16} />
          </button>
          <button
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/90 text-slate-700 shadow-md backdrop-blur"
            title="縮小"
          >
            <MdRemove size={16} />
          </button>
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/90 text-coral-500 shadow-md backdrop-blur"
            title="現在地に移動"
          >
            <MdNavigation size={16} />
          </button>
        </div>

        <div className="pointer-events-auto absolute bottom-2 left-2 right-2 mx-auto max-w-[260px] rounded-2xl border border-white/40 bg-white/92 p-2 shadow-[0_12px_32px_rgb(0,0,0,0.18)] backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
            {travelModes.map(({ option, icon: Icon, label }) => {
              const active = selectedOption === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelectedOption(option)}
                  className={`flex min-w-[50px] items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    active
                      ? "bg-coral-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {searchResult ? (
            <>
              <div className="mb-1.5 flex items-end gap-1.5">
                <div className="text-lg font-bold leading-none text-slate-900">
                  {searchResult.duration}
                </div>
                <div className="pb-0.5 text-xs font-medium text-slate-500">
                  • {searchResult.fare || "¥210"}
                </div>
              </div>

              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  G
                </span>
                <span className="text-xs font-medium text-slate-700">
                  via Ginza Line
                </span>
                <MdChevronRight size={12} className="text-slate-400" />
              </div>

              <div className="mb-2 flex items-center gap-1.5">
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Fastest
                </span>
                <span className="text-[10px] text-slate-500">Every 4 mins</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-coral-500 text-xs font-semibold text-white shadow-md shadow-coral-500/30 hover:bg-coral-600">
                  <MdNearMe size={14} />
                  <span>Start Navigation</span>
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
                  <MdMoreHoriz size={16} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? (
                <span>検索中...</span>
              ) : (
                <>
                  <MdSearch size={14} />
                  <span>ルートを検索</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
