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

// Generate a random loop route that starts and ends at center
// with approximately the target distance in km
export function generateLoop(
  center: [number, number],
  targetDistanceKm: number,
  seed?: number
): Waypoint[] {
  // Seeded RNG for reproducibility
  let s = seed ?? Math.floor(Math.random() * 100000);
  const rng = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Approximate radius so perimeter ≈ targetDistanceKm
  // For a deformed polygon with N points, perimeter ≈ 2 * pi * avgRadius
  const avgRadiusKm = targetDistanceKm / (2 * Math.PI);

  // Generate 6-10 waypoints around the loop with random radial variation
  const numPoints = 6 + Math.floor(rng() * 5); // 6-10
  const angleStep = (2 * Math.PI) / numPoints;

  // Random starting angle offset so loops aren't always north-first
  const angleOffset = rng() * 2 * Math.PI;

  const latDeg = 1 / 111.32; // 1 km in degrees latitude
  const lngDeg = 1 / (111.32 * Math.cos((center[1] * Math.PI) / 180)); // 1 km in degrees longitude

  const waypoints: Waypoint[] = [];

  // Start point
  waypoints.push({ lng: center[0], lat: center[1] });

  for (let i = 0; i < numPoints; i++) {
    const angle = angleOffset + i * angleStep;
    // Vary radius between 60% and 140% for organic shape
    const radiusVariation = 0.6 + rng() * 0.8;
    const radius = avgRadiusKm * radiusVariation;

    // Add slight angular jitter for realism
    const angleJitter = (rng() - 0.5) * angleStep * 0.3;
    const finalAngle = angle + angleJitter;

    const lng = center[0] + Math.cos(finalAngle) * radius * lngDeg;
    const lat = center[1] + Math.sin(finalAngle) * radius * latDeg;

    waypoints.push({ lng, lat });
  }

  // Close the loop: return to start
  waypoints.push({ lng: center[0], lat: center[1] });

  return waypoints;
}
