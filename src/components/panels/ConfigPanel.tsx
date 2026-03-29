'use client';

import type { RouteStats } from '@/lib/types';

interface ConfigPanelProps {
  paceMinPerKm: number;
  onPaceChange: (pace: number) => void;
  stats: RouteStats | null;
  isLoading: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
}

function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function ConfigPanel({
  paceMinPerKm,
  onPaceChange,
  stats,
  isLoading,
  onGenerate,
  canGenerate,
}: ConfigPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Configuration
      </h3>

      {/* Pace selector */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          Allure moyenne: <span className="font-semibold text-gray-700">{formatPace(paceMinPerKm)} min/km</span>
        </label>
        <input
          type="range"
          min={3}
          max={10}
          step={0.1}
          value={paceMinPerKm}
          onChange={(e) => onPaceChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>3:00 (rapide)</span>
          <span>10:00 (marche)</span>
        </div>
      </div>

      {/* Stats display */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Distance" value={formatDistance(stats.totalDistance)} />
          <StatCard label="Durée estimée" value={formatDuration(stats.estimatedDuration)} />
          <StatCard label="D+ (montée)" value={`${Math.round(stats.totalElevationGain)} m`} />
          <StatCard label="D- (descente)" value={`${Math.round(stats.totalElevationLoss)} m`} />
        </div>
      )}

      {/* Elevation profile mini chart */}
      {stats && (
        <ElevationMiniProfile stats={stats} />
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isLoading}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Génération en cours...
          </span>
        ) : (
          'Générer & Télécharger GPX'
        )}
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ElevationMiniProfile({ stats }: { stats: RouteStats }) {
  // Simple visual indicator of elevation
  const hasElevation = stats.totalElevationGain > 0 || stats.totalElevationLoss > 0;

  if (!hasElevation) {
    return (
      <div className="text-xs text-gray-400 text-center py-2">
        Profil d&apos;élévation disponible après le calcul
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">
        Profil d&apos;élévation
      </div>
      <div className="flex items-end gap-0.5 h-12">
        {/* Simple bar representation */}
        <div
          className="bg-green-400 rounded-t flex-1"
          style={{ height: `${Math.min(100, (stats.totalElevationGain / 100) * 100)}%` }}
          title={`D+ ${Math.round(stats.totalElevationGain)}m`}
        />
        <div
          className="bg-red-400 rounded-t flex-1"
          style={{ height: `${Math.min(100, (stats.totalElevationLoss / 100) * 100)}%` }}
          title={`D- ${Math.round(stats.totalElevationLoss)}m`}
        />
      </div>
    </div>
  );
}
