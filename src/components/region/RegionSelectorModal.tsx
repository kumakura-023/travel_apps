import React, { useState, useEffect, useCallback } from "react";
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

  // モーダルが開いたらprefectureステップから開始
  useEffect(() => {
    if (isModalOpen) {
      if (selectedPrefecture) {
        setStep("city");
      } else {
        setStep("prefecture");
      }
    }
  }, [isModalOpen, selectedPrefecture]);

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

  // ヘッダータイトルを取得
  const getTitle = () => {
    if (step === "city" && selectedPrefecture) {
      return `${selectedPrefecture.name} - 市区町村を選択`;
    }
    return "都道府県を選択";
  };

  return (
    <ModalPortal>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-modal-fade-in"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-selector-title"
      >
        {/* モーダルコンテナ */}
        <div
          className="w-full max-w-lg h-[80vh] max-h-[80vh] overflow-hidden rounded-2xl glass-effect-border shadow-elevation-3 mx-4 flex flex-col animate-modal-zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-white/40 backdrop-blur">
            {/* 戻るボタン */}
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-white/20 transition-colors text-system-secondary-label"
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

            {/* タイトル */}
            <h2
              id="region-selector-title"
              className="flex-1 text-center font-semibold text-system-label"
            >
              {getTitle()}
            </h2>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 -mr-2 rounded-lg hover:bg-white/20 transition-colors text-system-secondary-label"
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

          {/* コンテンツエリア */}
          <div className="flex-1 overflow-hidden relative">
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-ios-out ${
                step === "prefecture" ? "translate-x-0" : "-translate-x-6"
              } ${step !== "prefecture" ? "pointer-events-none" : ""}`}
              aria-hidden={step !== "prefecture"}
              {...(step !== "prefecture" ? { inert: "" } : {})}
            >
              <PrefectureList onSelect={handlePrefectureSelect} />
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
