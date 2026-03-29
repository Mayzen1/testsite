'use client';

import type { DrawMode } from '@/lib/types';

interface ToolBarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  shapeSize: number;
  onShapeSizeChange: (size: number) => void;
  onClear: () => void;
  onUndo: () => void;
  waypointCount: number;
}

const modes: { mode: DrawMode; label: string; icon: string }[] = [
  { mode: 'free', label: 'Libre', icon: '✏️' },
  { mode: 'circle', label: 'Cercle', icon: '⭕' },
  { mode: 'heart', label: 'Cœur', icon: '❤️' },
  { mode: 'cat', label: 'Chat', icon: '🐱' },
  { mode: 'dog', label: 'Chien', icon: '🐕' },
];

export default function ToolBar({
  drawMode,
  onDrawModeChange,
  shapeSize,
  onShapeSizeChange,
  onClear,
  onUndo,
  waypointCount,
}: ToolBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Mode de tracé
      </h3>

      <div className="flex flex-wrap gap-2">
        {modes.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => onDrawModeChange(mode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              drawMode === mode
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {drawMode !== 'free' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Taille de la forme: {shapeSize} km
          </label>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={shapeSize}
            onChange={(e) => onShapeSizeChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={waypointCount === 0}
          className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Annuler
        </button>
        <button
          onClick={onClear}
          disabled={waypointCount === 0}
          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}
