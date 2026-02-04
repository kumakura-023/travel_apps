import React, { useState, useEffect, useCallback, useMemo } from "react";
import ModalPortal from "../ModalPortal";
import PrefectureList from "./PrefectureList";
import CityList from "./CityList";
import { useRegionSearchStore } from "../../store/regionSearchStore";
import type { Prefecture, City } from "../../types/region";

type Step = "prefecture" | "city";

/**
 * 都道府県・市区町村を選択する2段階モーダル
 * - step: 'prefecture' | 'city' で段階を管理
 * - 都道府県選択 → 市区町村選択への遷移
 * - 戻るボタンで前の段階へ
 * - 市区町村選択で SpotList 画面へ遷移（closeModal + openSpotList）
 * - ESCキーで閉じる
 * - 外側クリックで閉じる
 */
const RegionSelectorModal: React.FC = () => {
  const {
    isModalOpen,
    selectedPrefecture,
    closeModal,
    selectPrefecture,
    selectCity,
    clearSelection,
    openSpotList,
  } = useRegionSearchStore();

  const [step, setStep] = useState<Step>("prefecture");
  const [activeRegionId, setActiveRegionId] = useState("kanto");

  const regions = useMemo(
    () => [
      {
        id: "hokkaido",
        label: "Hokkaido",
        prefectureCodes: ["01"],
      },
      {
        id: "tohoku",
        label: "Tohoku",
        prefectureCodes: ["02", "03", "04", "05", "06", "07"],
      },
      {
        id: "kanto",
        label: "Kanto",
        prefectureCodes: ["08", "09", "10", "11", "12", "13", "14"],
      },
      {
        id: "chubu",
        label: "Chubu",
        prefectureCodes: ["15", "16", "17", "18", "19", "20", "21", "22", "23"],
      },
      {
        id: "kansai",
        label: "Kansai",
        prefectureCodes: ["24", "25", "26", "27", "28", "29", "30"],
      },
      {
        id: "chugoku",
        label: "Chugoku",
        prefectureCodes: ["31", "32", "33", "34", "35"],
      },
      {
        id: "shikoku",
        label: "Shikoku",
        prefectureCodes: ["36", "37", "38", "39"],
      },
      {
        id: "kyushu",
        label: "Kyushu",
        prefectureCodes: ["40", "41", "42", "43", "44", "45", "46", "47"],
      },
    ],
    [],
  );

  // モーダルが開いたらprefectureステップから開始
  useEffect(() => {
    if (isModalOpen) {
      if (selectedPrefecture) {
        setStep("city");
        const matchedRegion = regions.find((region) =>
          region.prefectureCodes.includes(selectedPrefecture.code),
        );
        if (matchedRegion) {
          setActiveRegionId(matchedRegion.id);
        }
      } else {
        setStep("prefecture");
        setActiveRegionId("kanto");
      }
    }
  }, [isModalOpen, selectedPrefecture, regions]);

  // 都道府県選択時
  const handlePrefectureSelect = useCallback(
    (prefecture: Prefecture) => {
      selectPrefecture(prefecture);
      setStep("city");
    },
    [selectPrefecture],
  );

  // 市区町村選択時
  const handleCitySelect = useCallback(
    (city: City) => {
      selectCity(city);
      closeModal();
      openSpotList();
    },
    [selectCity, closeModal, openSpotList],
  );

  // 戻る
  const handleBack = useCallback(() => {
    if (step === "city") {
      setStep("prefecture");
      clearSelection();
    } else {
      closeModal();
    }
  }, [step, clearSelection, closeModal]);

  // 閉じる
  const handleClose = useCallback(() => {
    closeModal();
    // モーダルを閉じたら選択をクリア
    clearSelection();
    setStep("prefecture");
  }, [closeModal, clearSelection]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        handleClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, handleClose]);

  // モーダルが閉じている場合は何も表示しない
  if (!isModalOpen) {
    return null;
  }

  const activeRegionLabel =
    regions.find((region) => region.id === activeRegionId)?.label ?? "Kanto";
  const subTitle =
    step === "city" && selectedPrefecture
      ? `${selectedPrefecture.nameEn.toUpperCase()} PREFECTURE`
      : `${activeRegionLabel.toUpperCase()} REGION`;
  const title =
    step === "city" && selectedPrefecture ? "Select City" : "Select Prefecture";

  return (
    <ModalPortal>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center py-4 bg-black/45 backdrop-blur-sm animate-modal-fade-in"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-selector-title"
      >
        {/* モーダルコンテナ */}
        <div
          className="w-full max-w-lg h-[calc(100vh-32px)] max-h-[calc(100vh-32px)] overflow-hidden rounded-[28px] bg-[#F9F7F4] shadow-elevation-3 mx-4 flex flex-col animate-modal-zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-system-label hover:shadow-md transition"
                aria-label={step === "city" ? "都道府県選択に戻る" : "閉じる"}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-system-label hover:shadow-md transition"
                aria-label="閉じる"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-2">
              <p className="text-[11px] tracking-[0.28em] text-coral-500 font-semibold">
                {subTitle}
              </p>
              <h2
                id="region-selector-title"
                className="text-[26px] leading-tight font-semibold text-system-label mt-1"
              >
                {title}
              </h2>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 overflow-hidden relative">
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-ios-out ${
                step === "prefecture" ? "translate-x-0" : "-translate-x-6"
              } ${step !== "prefecture" ? "pointer-events-none" : ""}`}
              aria-hidden={step !== "prefecture"}
              {...(step !== "prefecture" ? { inert: "" } : {})}
            >
              <PrefectureList
                onSelect={handlePrefectureSelect}
                regions={regions}
                activeRegionId={activeRegionId}
                onRegionChange={setActiveRegionId}
                selectedPrefectureCode={selectedPrefecture?.code}
              />
            </div>
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-ios-out ${
                step === "city" ? "translate-x-0" : "translate-x-full"
              } ${step !== "city" ? "pointer-events-none" : ""}`}
              aria-hidden={step !== "city"}
              {...(step !== "city" ? { inert: "" } : {})}
            >
              {selectedPrefecture ? (
                <CityList
                  prefectureCode={selectedPrefecture.code}
                  onSelect={handleCitySelect}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RegionSelectorModal;
