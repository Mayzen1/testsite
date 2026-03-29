'use client';

import type { RoutePoint } from '@/lib/types';

interface ElevationChartProps {
  points: RoutePoint[];
}

/**
 * SVG-based elevation and pace profile chart.
 * Renders without external chart libraries for minimal bundle size.
 */
export default function ElevationChart({ points }: ElevationChartProps) {
  if (points.length < 2) return null;

  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxDist = points[points.length - 1].distance;
  const elevations = points.map((p) => p.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  const xScale = (d: number) => padding.left + (d / maxDist) * chartW;
  const yScale = (e: number) => padding.top + chartH - ((e - minElev) / elevRange) * chartH;

  // Build SVG path for elevation
  const elevPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.distance).toFixed(1)} ${yScale(p.elevation).toFixed(1)}`)
    .join(' ');

  // Filled area under the curve
  const areaPath = `${elevPath} L ${xScale(maxDist).toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${padding.left} ${(padding.top + chartH).toFixed(1)} Z`;

  // Compute pace segments for pace overlay
  const paces: { x: number; pace: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const dist = points[i].distance - points[i - 1].distance;
    if (dist < 1) continue;
    const t0 = new Date(points[i - 1].timestamp).getTime();
    const t1 = new Date(points[i].timestamp).getTime();
    if (!t0 || !t1) continue;
    const timeSec = (t1 - t0) / 1000;
    const paceMinKm = (timeSec / dist) * (1000 / 60);
    paces.push({ x: points[i].distance, pace: paceMinKm });
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
        Profils
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartH * (1 - frac)}
            y2={padding.top + chartH * (1 - frac)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* Elevation area fill */}
        <path d={areaPath} fill="rgba(59,130,246,0.15)" />

        {/* Elevation line */}
        <path d={elevPath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />

        {/* Y axis labels */}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize={8} fill="#9ca3af">
          {Math.round(maxElev)}m
        </text>
        <text x={padding.left - 4} y={padding.top + chartH + 4} textAnchor="end" fontSize={8} fill="#9ca3af">
          {Math.round(minElev)}m
        </text>

        {/* X axis labels */}
        <text x={padding.left} y={height - 4} fontSize={8} fill="#9ca3af">
          0 km
        </text>
        <text x={width - padding.right} y={height - 4} textAnchor="end" fontSize={8} fill="#9ca3af">
          {(maxDist / 1000).toFixed(1)} km
        </text>
      </svg>
    </div>
  );
}
