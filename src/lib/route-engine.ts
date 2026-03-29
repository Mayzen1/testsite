import type { Waypoint, RoutePoint, RouteStats } from './types';

/**
 * Route Engine: orchestrates snap-to-road (OSRM), elevation enrichment, and stats computation.
 */

/**
 * Snap waypoints to real roads using OSRM API (via our proxy).
 * Sends waypoints in batches and returns the full route geometry as [lng, lat][] coordinates.
 */
export async function snapToRoads(
  waypoints: Waypoint[]
): Promise<{ geometry: [number, number][]; totalDistance: number }> {
  if (waypoints.length < 2) {
    return { geometry: [], totalDistance: 0 };
  }

  const allCoords: [number, number][] = [];
  let totalDistance = 0;

  // Mapbox Directions API allows max 25 waypoints per request
  const batchSize = 25;
  for (let i = 0; i < waypoints.length - 1; i += batchSize - 1) {
    const batch = waypoints.slice(i, Math.min(i + batchSize, waypoints.length));
    if (batch.length < 2) break;

    const coordinates = batch.map((w) => `${w.lng},${w.lat}`).join(';');
    const url = `/api/directions?coordinates=${encodeURIComponent(coordinates)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Directions API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between waypoints');
    }

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates;
    totalDistance += route.distance;

    // Avoid duplicating the junction point between batches
    if (allCoords.length > 0 && coords.length > 0) {
      coords.shift();
    }
    allCoords.push(...coords);
  }

  return { geometry: allCoords, totalDistance };
}

/**
 * Fetch elevation data for an array of [lng, lat] coordinates.
 * Uses our proxy API which queries Open-Elevation or Mapbox Terrain.
 * Batches requests to avoid oversized payloads.
 */
export async function fetchElevations(
  coordinates: [number, number][]
): Promise<number[]> {
  const batchSize = 200;
  const elevations: number[] = [];

  for (let i = 0; i < coordinates.length; i += batchSize) {
    const batch = coordinates.slice(i, i + batchSize);
    const res = await fetch('/api/elevation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: batch.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      }),
    });

    if (!res.ok) {
      // Fallback: return 0 elevation for all points
      elevations.push(...batch.map(() => 0));
      continue;
    }

    const data = await res.json();
    elevations.push(...data.results.map((r: { elevation: number }) => r.elevation));
  }

  return elevations;
}

/**
 * Build the full array of RoutePoints with cumulative distance and elevation.
 * This is the main pipeline: snap -> elevate -> compute distances.
 */
export async function buildRoutePoints(
  waypoints: Waypoint[]
): Promise<RoutePoint[]> {
  // Step 1: Snap to roads
  const { geometry } = await snapToRoads(waypoints);
  if (geometry.length === 0) return [];

  // Step 2: Subsample if too many points (keep ~500 for performance)
  const sampled = subsample(geometry, 500);

  // Step 3: Fetch elevations
  const elevations = await fetchElevations(sampled);

  // Step 4: Build RoutePoints with cumulative distance
  const points: RoutePoint[] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < sampled.length; i++) {
    if (i > 0) {
      cumulativeDistance += haversineDistance(
        sampled[i - 1][1], sampled[i - 1][0],
        sampled[i][1], sampled[i][0]
      );
    }

    points.push({
      lng: sampled[i][0],
      lat: sampled[i][1],
      elevation: elevations[i] ?? 0,
      distance: cumulativeDistance,
      timestamp: '', // will be filled by humanizeTimestamps
    });
  }

  return points;
}

/**
 * Compute route statistics from RoutePoints.
 */
export function computeStats(points: RoutePoint[], paceMinPerKm: number): RouteStats {
  let elevGain = 0;
  let elevLoss = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) elevGain += diff;
    else elevLoss += Math.abs(diff);
  }

  const totalDistance = points.length > 0 ? points[points.length - 1].distance : 0;
  const estimatedDuration = (totalDistance / 1000) * paceMinPerKm * 60;

  return {
    totalDistance,
    totalElevationGain: elevGain,
    totalElevationLoss: elevLoss,
    estimatedDuration,
  };
}

/**
 * Haversine distance between two lat/lng points in meters.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Subsample an array of coordinates to at most `maxPoints` points,
 * keeping the first and last point.
 */
function subsample(coords: [number, number][], maxPoints: number): [number, number][] {
  if (coords.length <= maxPoints) return coords;

  const step = (coords.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), coords.length - 1);
    result.push(coords[idx]);
  }

  return result;
}
