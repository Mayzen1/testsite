import type { Waypoint, RoutePoint, RouteStats } from "./types";
import { haversineDistance } from "./utils";

function getMapboxToken(): string {
  if (typeof window === "undefined") return "";
  // Check sessionStorage first
  const cached = sessionStorage.getItem("mapbox_api_key");
  if (cached) return cached;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  if (token) sessionStorage.setItem("mapbox_api_key", token);
  return token;
}

// Snap waypoints to roads via Mapbox Directions API (walking profile)
// Max 25 waypoints per request
export async function snapToRoads(waypoints: Waypoint[]): Promise<{
  geometry: [number, number][];
  distance: number;
}> {
  if (waypoints.length < 2) {
    return { geometry: waypoints.map((w) => [w.lng, w.lat]), distance: 0 };
  }

  const token = getMapboxToken();
  if (!token) {
    return fallbackGeometry(waypoints);
  }

  const MAX_PER_REQUEST = 25;
  const allCoords: [number, number][] = [];
  let totalDistance = 0;

  // Batch waypoints in groups of 25
  for (let i = 0; i < waypoints.length; i += MAX_PER_REQUEST - 1) {
    const batch = waypoints.slice(i, i + MAX_PER_REQUEST);
    if (batch.length < 2) break;

    const coordStr = batch.map((w) => `${w.lng},${w.lat}`).join(";");

    // Check cache
    const cacheKey = `route_${simpleHashStr(coordStr)}`;
    const cachedResult = sessionStorage.getItem(cacheKey);
    if (cachedResult) {
      try {
        const cached = JSON.parse(cachedResult);
        if (i > 0 && allCoords.length > 0) {
          cached.geometry.shift(); // remove duplicate junction point
        }
        allCoords.push(...cached.geometry);
        totalDistance += cached.distance;
        continue;
      } catch {
        // cache invalid, fetch again
      }
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordStr}?geometries=geojson&overview=full&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates;
        const dist: number = route.distance;

        // Cache result
        sessionStorage.setItem(cacheKey, JSON.stringify({ geometry: coords, distance: dist }));

        if (i > 0 && allCoords.length > 0) {
          coords.shift();
        }
        allCoords.push(...coords);
        totalDistance += dist;
      } else {
        // NoRoute fallback
        const fallback = batch.map((w): [number, number] => [w.lng, w.lat]);
        if (i > 0 && allCoords.length > 0) fallback.shift();
        allCoords.push(...fallback);
      }
    } catch {
      // Network error fallback
      const fallback = batch.map((w): [number, number] => [w.lng, w.lat]);
      if (i > 0 && allCoords.length > 0) fallback.shift();
      allCoords.push(...fallback);
    }
  }

  // Remove consecutive duplicates
  const deduped = allCoords.filter(
    (c, i) => i === 0 || c[0] !== allCoords[i - 1][0] || c[1] !== allCoords[i - 1][1]
  );

  return { geometry: deduped, distance: totalDistance };
}

function fallbackGeometry(waypoints: Waypoint[]): { geometry: [number, number][]; distance: number } {
  let distance = 0;
  const geometry = waypoints.map((w): [number, number] => [w.lng, w.lat]);
  for (let i = 1; i < waypoints.length; i++) {
    distance += haversineDistance(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
  }
  return { geometry, distance };
}

function simpleHashStr(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// Query elevation from Mapbox terrain with fallback
export function queryElevation(
  map: mapboxgl.Map | null,
  lng: number,
  lat: number
): number {
  if (map) {
    try {
      const elev = map.queryTerrainElevation({ lng, lat } as mapboxgl.LngLat);
      if (elev !== null && elev !== undefined) return elev;
    } catch {
      // fallback
    }
  }
  // Pseudo-random fallback
  return Math.random() * 100;
}

// Subsample coordinates to a target count
function subsample(coords: [number, number][], targetCount: number): [number, number][] {
  if (coords.length <= targetCount) return coords;
  const step = (coords.length - 1) / (targetCount - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < targetCount; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  return result;
}

// Build full route points from snapped geometry
export function buildRoutePoints(
  geometry: [number, number][],
  map: mapboxgl.Map | null
): RoutePoint[] {
  const sampled = subsample(geometry, 500);
  let cumulativeDistance = 0;

  return sampled.map((coord, i) => {
    if (i > 0) {
      cumulativeDistance += haversineDistance(
        sampled[i - 1][1], sampled[i - 1][0],
        coord[1], coord[0]
      );
    }
    return {
      lng: coord[0],
      lat: coord[1],
      elevation: queryElevation(map, coord[0], coord[1]),
      distance: cumulativeDistance,
    };
  });
}

// Compute stats from route points
export function computeStats(
  points: RoutePoint[],
  paceMinPerKm: number,
  paceInconsistency: number
): RouteStats {
  if (points.length < 2) {
    return {
      totalDistance: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0,
      estimatedDuration: 0,
      averagePace: paceMinPerKm,
      paceInconsistency,
    };
  }

  let elevGain = 0;
  let elevLoss = 0;
  const totalDistance = points[points.length - 1].distance;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) elevGain += diff;
    else elevLoss += Math.abs(diff);
  }

  const durationSeconds = (totalDistance / 1000) * paceMinPerKm * 60;

  return {
    totalDistance,
    totalElevationGain: Math.round(elevGain),
    totalElevationLoss: Math.round(elevLoss),
    estimatedDuration: durationSeconds,
    averagePace: paceMinPerKm,
    paceInconsistency,
  };
}
