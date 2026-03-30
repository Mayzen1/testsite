import type { Waypoint } from "./types";

// Generate heart shape points in normalized space [-1, 1]
function heartPoints(steps: number = 100): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    points.push([x / 17, y / 17]); // normalize to ~[-1, 1]
  }
  return points;
}

// Generate circle shape points
function circlePoints(steps: number = 72): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    points.push([Math.cos(t), Math.sin(t)]);
  }
  return points;
}

// Project normalized shape onto map coordinates
function projectShape(
  normalizedPoints: [number, number][],
  center: [number, number], // [lng, lat]
  sizeKm: number
): Waypoint[] {
  // Convert km to approximate degrees
  const latDeg = sizeKm / 111.32;
  const lngDeg = sizeKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));

  return normalizedPoints.map(([nx, ny]) => ({
    lng: center[0] + nx * lngDeg * 0.5,
    lat: center[1] + ny * latDeg * 0.5,
  }));
}

export function generateHeart(center: [number, number], sizeKm: number): Waypoint[] {
  return projectShape(heartPoints(), center, sizeKm);
}

export function generateCircle(center: [number, number], sizeKm: number): Waypoint[] {
  return projectShape(circlePoints(), center, sizeKm);
}
