import React, { useState } from 'react';
import { Place } from '../types';
import { getCategoryDisplayName } from '../utils/categoryIcons';
import { formatCurrency } from '../utils/formatCurrency';
import { usePlacesStore } from '../store/placesStore';

interface Props {
  place: Place;
}

/** 単一Placeのカード表示 + 費用編集 */
export default function PlaceListItem({ place }: Props) {
  const updatePlace = usePlacesStore((s) => s.updatePlace);
  const [editing, setEditing] = useState(false);
  const [tempCost, setTempCost] = useState(place.estimatedCost);

  const saveCost = () => {
    updatePlace(place.id, { estimatedCost: tempCost });
    setEditing(false);
  };

  return (
    <div className="card-interactive p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <h3 className="headline text-system-label truncate max-w-[240px]" title={place.name}>
            {place.name}
          </h3>
          <p className="footnote text-system-secondary-label truncate max-w-[240px]">
            {getCategoryDisplayName(place.category)}
          </p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              className="input w-28 text-right"
              value={tempCost}
              onChange={(e) => setTempCost(parseInt(e.target.value) || 0)}
            />
            <button
              onClick={saveCost}
              className="btn-text text-blue-600 px-2 py-1"
            >
              保存
            </button>
          </div>
        ) : (
          <button
            className="btn-secondary px-3 py-1"
            onClick={() => setEditing(true)}
          >
            {formatCurrency(place.estimatedCost)}
          </button>
        )}
      </div>
      {place.memo && (
        <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{place.memo}</p>
      )}
    </div>
  );
} 