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

interface DataVizProps {
  points: RoutePoint[];
  averagePace: number;
}

export function PaceProfile({ points, averagePace }: DataVizProps) {
  if (points.length < 2) {
    return (
      <ChartPlaceholder
        title="Pace Profile"
        subtitle={`Preview - Draw a route to see real data`}
        extra={`Average Pace: ${averagePace.toFixed(2)} min/km`}
      />
    );
  }

  // Compute pace per segment
  const data = [];
  for (let i = 1; i < points.length; i++) {
    const dist = points[i].distance - points[i - 1].distance;
    if (dist <= 0) continue;

    const t0 = points[i - 1].timestamp ? new Date(points[i - 1].timestamp!).getTime() : 0;
    const t1 = points[i].timestamp ? new Date(points[i].timestamp!).getTime() : 0;
    const timeSeconds = (t1 - t0) / 1000;
    const paceMinKm = timeSeconds > 0 ? (timeSeconds / 60) / (dist / 1000) : averagePace;

    data.push({
      distance: (points[i].distance / 1000).toFixed(1),
      pace: Math.min(15, Math.max(2, paceMinKm)),
    });
  }

  // Subsample for display
  const sampled = subsampleData(data, 100);

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 dark:text-white">Pace Profile</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="distance"
              tick={{ fontSize: 10 }}
              label={{ value: "Distance (km)", position: "bottom", fontSize: 10, offset: -5 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={["auto", "auto"]}
              label={{ value: "min/km", angle: -90, position: "insideLeft", fontSize: 10 }}
              reversed
            />
            <Tooltip
              contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }}
              formatter={(value: number) => [`${value.toFixed(2)} min/km`, "Pace"]}
            />
            <Area
              type="monotone"
              dataKey="pace"
              stroke="#FC5200"
              fill="#FC5200"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ElevationProfile({ points }: { points: RoutePoint[] }) {
  if (points.length < 2) {
    return (
      <ChartPlaceholder
        title="Elevation Profile"
        subtitle="Preview - Draw a route to see real data"
        extra="Total Gain: 0m"
      />
    );
  }

  const data = points.map((p) => ({
    distance: (p.distance / 1000).toFixed(1),
    elevation: Math.round(p.elevation),
  }));

  const sampled = subsampleData(data, 100);

  const totalGain = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const diff = p.elevation - points[i - 1].elevation;
    return diff > 0 ? acc + diff : acc;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold dark:text-white">Elevation Profile</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Total Gain: {Math.round(totalGain)}m
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="distance"
              tick={{ fontSize: 10 }}
              label={{ value: "Distance (km)", position: "bottom", fontSize: 10, offset: -5 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={["auto", "auto"]}
              label={{ value: "m", angle: -90, position: "insideLeft", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, backgroundColor: "#1f2937", border: "none", color: "#fff" }}
              formatter={(value: number) => [`${value}m`, "Elevation"]}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartPlaceholder({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle: string;
  extra: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-2 dark:text-white">{title}</h4>
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{extra}</p>
      </div>
    </div>
  );
}

function subsampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}
