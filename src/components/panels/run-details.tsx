"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  Mountain,
  Gauge,
  Download,
  Heart,
} from "lucide-react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import type { RouteStats, RunDetails as RunDetailsType } from "@/lib/types";
import { formatDistance, formatDuration, formatPace } from "@/lib/utils";
import { getTokenStore } from "@/lib/token-store";

interface RunDetailsProps {
  stats: RouteStats;
  details: RunDetailsType;
  onDetailsChange: (d: RunDetailsType) => void;
  onDownload: () => void;
  routeReady: boolean;
}

export function RunDetailsPanel({
  stats,
  details,
  onDetailsChange,
  onDownload,
  routeReady,
}: RunDetailsProps) {
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    setTokens(getTokenStore().getTokenCount());
  }, []);

  const refreshTokens = () => setTokens(getTokenStore().getTokenCount());

  const update = (partial: Partial<RunDetailsType>) => {
    onDetailsChange({ ...details, ...partial });
  };

  const paceLabel = details.activityType === "run" ? "min/km" : "min/km";

  const getPaceDescription = (inconsistency: number) => {
    if (inconsistency <= 5) return "Constant pace throughout the run (most efficient)";
    if (inconsistency <= 15) return "Slight natural variations in pace";
    if (inconsistency <= 30) return "Moderate pace variations (typical recreational)";
    return "High pace variability (interval training or fatigue)";
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Activity Type Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => update({ activityType: "run", paceMinPerKm: 5.5 })}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            details.activityType === "run"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          🏃 Run
        </button>
        <button
          onClick={() => update({ activityType: "bike", paceMinPerKm: 3.0 })}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            details.activityType === "bike"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          🚴 Bike
        </button>
      </div>

      {/* Run Stats */}
      <div>
        <h3 className="text-sm font-semibold mb-3 dark:text-white">
          {details.activityType === "run" ? "Run" : "Bike"} Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<MapPin className="h-4 w-4" />} label="Distance" value={formatDistance(stats.totalDistance)} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Duration" value={formatDuration(stats.estimatedDuration)} />
          <StatCard icon={<Mountain className="h-4 w-4" />} label="Elevation Gain" value={`${stats.totalElevationGain} m`} />
          <StatCard icon={<Gauge className="h-4 w-4" />} label="Pace Unit" value={paceLabel} />
        </div>
      </div>

      {/* Average Pace */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium dark:text-white">Average Pace</label>
          <span className="text-sm text-orange-500 font-mono">{formatPace(details.paceMinPerKm)} {paceLabel}</span>
        </div>
        <Slider
          value={[details.paceMinPerKm]}
          onValueChange={([v]) => update({ paceMinPerKm: v })}
          min={details.activityType === "run" ? 3 : 1}
          max={details.activityType === "run" ? 10 : 6}
          step={0.1}
        />
      </div>

      {/* Pace Inconsistency */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium dark:text-white">Pace Inconsistency</label>
          <span className="text-sm text-gray-500 dark:text-gray-400">{details.paceInconsistency}%</span>
        </div>
        <Slider
          value={[details.paceInconsistency]}
          onValueChange={([v]) => update({ paceInconsistency: v })}
          min={0}
          max={50}
          step={1}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {getPaceDescription(details.paceInconsistency)}
        </p>
      </div>

      {/* Heart Rate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          <label className="text-sm font-medium dark:text-white">Include Heart Rate Data</label>
        </div>
        <Switch
          checked={details.includeHeartRate}
          onCheckedChange={(checked) => update({ includeHeartRate: checked })}
        />
      </div>

      {/* Run Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold dark:text-white">Run Details</h3>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Run Name</label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Morning Run"
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
            <input
              type="date"
              value={details.date}
              onChange={(e) => update({ date: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Start Time</label>
            <input
              type="time"
              value={details.startTime}
              onChange={(e) => update({ startTime: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
          <textarea
            value={details.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Add a description..."
            rows={2}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
          />
        </div>
      </div>

      {/* Download Button */}
      <div className="pt-2">
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            onDownload();
            refreshTokens();
          }}
          disabled={!routeReady}
        >
          <Download className="h-4 w-4" />
          Download Run File (1 Token)
        </Button>
        {tokens === 0 && (
          <p className="text-xs text-red-500 mt-2 text-center">
            You need at least 1 token to download. Get free tokens above!
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold dark:text-white">{value}</p>
    </div>
  );
}
