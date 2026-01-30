import { useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { MdNavigation } from "react-icons/md";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { useRouteSearchStore } from "../store/routeStoreMigration";
import { useRegionSearchStore } from "../store/regionSearchStore";
import { useDeviceDetect } from "../hooks/useDeviceDetect";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { useSuggestionStore } from "../store/suggestionStore";
import { CustomSuggestionList, RegionSearchButton } from "./search";
import { RegionSelectorModal, RegionSpotList } from "./region";
import MobileBottomSheet from "./MobileBottomSheet";

interface Props {
  onPlaceSelected: (lat: number, lng: number) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  onClearExternal?: () => void;
}

export default function SearchBar({
  onPlaceSelected,
  inputRef,
  onClearExternal,
}: Props) {
  // 新しいフックを使用
  const { query, handleQueryChange, handleSelect, clear } = useAutocomplete();
  const { predictions, isLoading, error } = useSuggestionStore();
  const { isModalOpen, isSpotListOpen, openModal } = useRegionSearchStore();
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 既存のrefとstoreは維持
  const localRef = useRef<HTMLInputElement>(null);
  const { openRouteSearch } = useRouteSearchStore();
  const { isDesktop, isTablet, isMobile } = useDeviceDetect();
  const combinedRef = inputRef ?? localRef;

  const hasSuggestions = predictions.length > 0 || isLoading || Boolean(error);
  const shouldShowSuggestions = showSuggestions && hasSuggestions;

  // 入力変更ハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleQueryChange(e.target.value);
    setShowSuggestions(true);
  };

  // サジェスト選択ハンドラ
  const handleSuggestionSelect = async (placeId: string) => {
    const didSelect = await handleSelect(placeId);
    if (!didSelect) return;

    setShowSuggestions(false);
    // onPlaceSelected は handleSelect 内で panTo が呼ばれるため不要
    // ただし、親コンポーネントとの互換性のため呼び出す
    const place = useSelectedPlaceStore.getState().place;
    if (place?.geometry?.location) {
      onPlaceSelected(
        place.geometry.location.lat(),
        place.geometry.location.lng(),
      );
    }
  };

  // クリアハンドラ（既存機能維持）
  const handleClear = () => {
    clear();
    setShowSuggestions(false);
    if (onClearExternal) onClearExternal();
  };

  // Enter キーハンドラ（既存機能維持）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape で閉じる
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    // サジェストが表示されている場合は CustomSuggestionList がハンドル
    if (showSuggestions && predictions.length > 0) {
      return;
    }

    // Enter で検索確定（サジェストがない場合のみ）
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      // Text Search にフォールバック（既存動作の維持）
      // この処理は useAutocomplete に移行することも可能
    }
  };

  return (
    <>
      <div
        className={`fixed z-50 flex items-center justify-between 
                    glass-effect-border rounded-xl 
                    transition-all duration-150 ease-ios-default
                    ${isDesktop ? "top-4 left-4 w-[480px]" : isTablet ? "top-4 left-4 w-[360px]" : "top-4 left-4 right-4 max-w-[calc(100vw-2rem)]"}`}
      >
        {/* 検索入力部分 - Autocomplete ラッパーを削除 */}
        <div className="flex-1 relative">
          <input
            ref={combinedRef}
            type="text"
            placeholder="Google マップを検索する"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent py-3 pl-4 pr-2 
                       text-[17px] tracking-[-0.408px] font-system
                       text-system-label placeholder-system-tertiary-label
                       focus:outline-none"
          />

          {/* カスタムサジェストリスト */}
          {!isMobile && shouldShowSuggestions && (
            <CustomSuggestionList
              onSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>

        <div className="flex items-center space-x-1 pr-4">
          {/* クリアボタン */}
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-system-tertiary-label hover:text-system-secondary-label
                         transition-colors duration-150 focus:outline-none"
              title="クリア"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {/* 地域から探すボタン */}
          <RegionSearchButton onClick={openModal} />

          {/* 検索アイコン（虫眼鏡）*/}
          <button
            className="p-2 text-system-secondary-label hover:text-coral-500 
                       hover:bg-coral-500/10 rounded-full 
                       transition-all duration-150 ease-ios-default
                       hover:scale-110 focus:outline-none active:scale-95"
            title="検索"
          >
            <FiSearch size={18} />
          </button>

          {/* ナビゲーション（ルート検索）ボタン */}
          <button
            onClick={openRouteSearch}
            className="p-2 text-coral-500 hover:text-coral-600 
                       hover:bg-coral-500/10 rounded-full 
                       transition-all duration-150 ease-ios-default
                       hover:scale-110 focus:outline-none active:scale-95"
            title="ルート検索"
          >
            <MdNavigation size={18} />
          </button>
        </div>
      </div>

      {/* 地域選択モーダル */}
      {isModalOpen && <RegionSelectorModal />}

      {/* スポット一覧モーダル */}
      {isSpotListOpen && <RegionSpotList />}

      {/* モバイル: サジェストをBottomSheetで表示 */}
      {isMobile && shouldShowSuggestions && (
        <MobileBottomSheet
          isOpen={shouldShowSuggestions}
          onClose={() => setShowSuggestions(false)}
          header={
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-system-label">
                  検索候補
                </h2>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-sm text-system-tertiary-label hover:text-system-label"
                >
                  閉じる
                </button>
              </div>
            </div>
          }
        >
          <div className="px-4 pb-4">
            <CustomSuggestionList
              onSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
              variant="panel"
              closeOnOutsideClick={false}
            />
          </div>
        </MobileBottomSheet>
      )}
    </>
  );
}
