"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  Mountain,
  Gauge,
  Download,
  Heart,
  Zap,
  RotateCw,
  Flame,
  TrendingUp,
  ArrowDown,
  Wind,
} from "lucide-react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import type { RouteStats, RideDetails as RideDetailsType } from "@/lib/types";
import { formatDistance, formatDuration, formatSpeed, formatPower, formatCadence, formatCalories } from "@/lib/utils";
import { getTokenStore } from "@/lib/token-store";

interface RideDetailsProps {
  stats: RouteStats;
  details: RideDetailsType;
  onDetailsChange: (d: RideDetailsType) => void;
  onDownload: () => void;
  routeReady: boolean;
}

export function RideDetailsPanel({
  stats,
  details,
  onDetailsChange,
  onDownload,
  routeReady,
}: RideDetailsProps) {
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    setTokens(getTokenStore().getTokenCount());
  }, []);

  const refreshTokens = () => setTokens(getTokenStore().getTokenCount());

  const update = (partial: Partial<RideDetailsType>) => {
    onDetailsChange({ ...details, ...partial });
  };

  const getVariabilityDescription = (v: number) => {
    if (v <= 5) return "Steady effort, flat terrain (time trial style)";
    if (v <= 15) return "Slight variations (typical group ride)";
    if (v <= 30) return "Moderate changes (rolling hills, traffic)";
    return "High variability (intervals, climbs, stops)";
  };

  const bikeTypeLabels: Record<string, string> = {
    road: "Road Bike",
    gravel: "Gravel / CX",
    mtb: "Mountain Bike",
    tt: "Time Trial / Triathlon",
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Stats Grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3 dark:text-white">Ride Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<MapPin className="h-4 w-4" />} label="Distance" value={formatDistance(stats.totalDistance)} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Duration" value={formatDuration(stats.estimatedDuration)} />
          <StatCard icon={<Mountain className="h-4 w-4" />} label="Elev. Gain" value={`${stats.totalElevationGain} m`} />
          <StatCard icon={<ArrowDown className="h-4 w-4" />} label="Elev. Loss" value={`${stats.totalElevationLoss} m`} />
          <StatCard icon={<Gauge className="h-4 w-4" />} label="Avg Speed" value={formatSpeed(stats.averageSpeedKmh)} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Max Speed" value={formatSpeed(stats.maxSpeedKmh)} />
          {details.includePower && (
            <>
              <StatCard icon={<Zap className="h-4 w-4" />} label="Avg Power" value={formatPower(stats.averagePower)} />
              <StatCard icon={<Zap className="h-4 w-4" />} label="NP" value={formatPower(stats.normalizedPower)} />
            </>
          )}
          {details.includeCadence && (
            <StatCard icon={<RotateCw className="h-4 w-4" />} label="Avg Cadence" value={formatCadence(stats.averageCadence)} />
          )}
          <StatCard icon={<Flame className="h-4 w-4" />} label="Calories" value={formatCalories(stats.calories)} />
        </div>
      </div>

      {/* Bike Type */}
      <div>
        <label className="text-sm font-medium dark:text-white mb-2 block">Bike Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(["road", "gravel", "mtb", "tt"] as const).map((bt) => (
            <button
              key={bt}
              onClick={() => {
                const defaults: Record<string, { speed: number; cadence: number }> = {
                  road: { speed: 28, cadence: 90 },
                  gravel: { speed: 22, cadence: 80 },
                  mtb: { speed: 18, cadence: 75 },
                  tt: { speed: 35, cadence: 95 },
                };
                update({
                  bikeType: bt,
                  avgSpeedKmh: defaults[bt].speed,
                  avgCadence: defaults[bt].cadence,
                });
              }}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                details.bikeType === bt
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {bikeTypeLabels[bt]}
            </button>
          ))}
        </div>
      </div>

      {/* Average Speed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium dark:text-white">Average Speed</label>
          <span className="text-sm text-orange-500 font-mono">{details.avgSpeedKmh.toFixed(1)} km/h</span>
        </div>
        <Slider
          value={[details.avgSpeedKmh]}
          onValueChange={([v]) => update({ avgSpeedKmh: v })}
          min={10}
          max={50}
          step={0.5}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>10 km/h</span>
          <span>50 km/h</span>
        </div>
      </div>

      {/* Rider Weight */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium dark:text-white">Weight (rider + bike)</label>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{details.weight} kg</span>
        </div>
        <Slider
          value={[details.weight]}
          onValueChange={([v]) => update({ weight: v })}
          min={50}
          max={130}
          step={1}
        />
      </div>

      {/* Speed Variability */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium dark:text-white">Speed Variability</label>
          <span className="text-sm text-gray-500 dark:text-gray-400">{details.speedVariability}%</span>
        </div>
        <Slider
          value={[details.speedVariability]}
          onValueChange={([v]) => update({ speedVariability: v })}
          min={0}
          max={50}
          step={1}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {getVariabilityDescription(details.speedVariability)}
        </p>
      </div>

      {/* Drafting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-blue-500" />
          <label className="text-sm font-medium dark:text-white">Drafting (group ride)</label>
        </div>
        <Switch
          checked={details.drafting}
          onCheckedChange={(checked) => update({ drafting: checked })}
        />
      </div>

      {/* Power Data */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <label className="text-sm font-medium dark:text-white">Include Power Data</label>
        </div>
        <Switch
          checked={details.includePower}
          onCheckedChange={(checked) => update({ includePower: checked })}
        />
      </div>

      {details.includePower && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium dark:text-white">FTP (Functional Threshold Power)</label>
            <span className="text-sm text-orange-500 font-mono">{details.ftp} W</span>
          </div>
          <Slider
            value={[details.ftp]}
            onValueChange={([v]) => update({ ftp: v })}
            min={100}
            max={450}
            step={5}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>100 W</span>
            <span>450 W</span>
          </div>
        </div>
      )}

      {/* Cadence Data */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="h-4 w-4 text-green-500" />
          <label className="text-sm font-medium dark:text-white">Include Cadence Data</label>
        </div>
        <Switch
          checked={details.includeCadence}
          onCheckedChange={(checked) => update({ includeCadence: checked })}
        />
      </div>

      {details.includeCadence && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium dark:text-white">Average Cadence</label>
            <span className="text-sm text-orange-500 font-mono">{details.avgCadence} rpm</span>
          </div>
          <Slider
            value={[details.avgCadence]}
            onValueChange={([v]) => update({ avgCadence: v })}
            min={50}
            max={120}
            step={1}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50 rpm</span>
            <span>120 rpm</span>
          </div>
        </div>
      )}

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

      {/* Ride Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold dark:text-white">Ride Details</h3>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Ride Name</label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Morning Ride"
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
          Download Ride File (1 Token)
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
