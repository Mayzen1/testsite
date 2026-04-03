"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RoutePoint } from "@/lib/types";

function subsampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

function ChartPlaceholder({ title, extra }: { title: string; extra: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-2 dark:text-white">{title}</h4>
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Draw a route to see data</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{extra}</p>
      </div>
    </div>
  );
}

export function SpeedProfile({ points, averageSpeed }: { points: RoutePoint[]; averageSpeed: number }) {
  if (points.length < 2) {
    return <ChartPlaceholder title="Speed Profile" extra={`Avg: ${averageSpeed.toFixed(1)} km/h`} />;
  }

  const data = [];
  for (let i = 1; i < points.length; i++) {
    const dist = points[i].distance - points[i - 1].distance;
    if (dist <= 0) continue;
    const t0 = points[i - 1].timestamp ? new Date(points[i - 1].timestamp!).getTime() : 0;
    const t1 = points[i].timestamp ? new Date(points[i].timestamp!).getTime() : 0;
    const timeHours = (t1 - t0) / 1000 / 3600;
    const speedKmh = timeHours > 0 ? (dist / 1000) / timeHours : averageSpeed;
    data.push({
      distance: (points[i].distance / 1000).toFixed(1),
      speed: Math.min(80, Math.max(0, speedKmh)),
    });
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 dark:text-white">Speed Profile</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={subsampleData(data, 100)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="distance" tick={{ fontSize: 10 }} label={{ value: "km", position: "bottom", fontSize: 10, offset: -5 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} label={{ value: "km/h", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }} formatter={(value: number) => [`${value.toFixed(1)} km/h`, "Speed"]} />
            <Area type="monotone" dataKey="speed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ElevationProfile({ points }: { points: RoutePoint[] }) {
  if (points.length < 2) {
    return <ChartPlaceholder title="Elevation Profile" extra="Gain: 0m" />;
  }

  const data = points.map((p) => ({
    distance: (p.distance / 1000).toFixed(1),
    elevation: Math.round(p.elevation),
  }));

  const totalGain = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const diff = p.elevation - points[i - 1].elevation;
    return diff > 0 ? acc + diff : acc;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold dark:text-white">Elevation Profile</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">Gain: {Math.round(totalGain)}m</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={subsampleData(data, 100)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="distance" tick={{ fontSize: 10 }} label={{ value: "km", position: "bottom", fontSize: 10, offset: -5 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} label={{ value: "m", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }} formatter={(value: number) => [`${value}m`, "Elevation"]} />
            <Area type="monotone" dataKey="elevation" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PowerProfile({ points }: { points: RoutePoint[] }) {
  if (points.length < 2 || !points.some((p) => p.power !== undefined)) {
    return <ChartPlaceholder title="Power Profile" extra="Enable power data" />;
  }

  const data = points
    .filter((p) => p.power !== undefined)
    .map((p) => ({
      distance: (p.distance / 1000).toFixed(1),
      power: p.power!,
    }));

  const avgPower = Math.round(data.reduce((s, d) => s + d.power, 0) / data.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold dark:text-white">Power Profile</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">Avg: {avgPower}W</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={subsampleData(data, 100)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="distance" tick={{ fontSize: 10 }} label={{ value: "km", position: "bottom", fontSize: 10, offset: -5 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} label={{ value: "W", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }} formatter={(value: number) => [`${value} W`, "Power"]} />
            <Area type="monotone" dataKey="power" stroke="#eab308" fill="#eab308" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CadenceProfile({ points }: { points: RoutePoint[] }) {
  if (points.length < 2 || !points.some((p) => p.cadence !== undefined)) {
    return <ChartPlaceholder title="Cadence Profile" extra="Enable cadence data" />;
  }

  const data = points
    .filter((p) => p.cadence !== undefined)
    .map((p) => ({
      distance: (p.distance / 1000).toFixed(1),
      cadence: p.cadence!,
    }));

  const avgCad = Math.round(data.reduce((s, d) => s + d.cadence, 0) / data.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold dark:text-white">Cadence Profile</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">Avg: {avgCad} rpm</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={subsampleData(data, 100)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="distance" tick={{ fontSize: 10 }} label={{ value: "km", position: "bottom", fontSize: 10, offset: -5 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} label={{ value: "rpm", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }} formatter={(value: number) => [`${value} rpm`, "Cadence"]} />
            <Area type="monotone" dataKey="cadence" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
