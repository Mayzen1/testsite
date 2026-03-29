import * as turf from '@turf/turf';

/**
 * Generate shape coordinates centered on a given point.
 * All shapes return [lng, lat][] arrays.
 */

// Heart shape using parametric equations:
// x(t) = 16 * sin³(t)
// y(t) = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
// Normalized to fit within a bounding box of `sizeKm` kilometers.
export function generateHeart(center: [number, number], sizeKm: number = 2): [number, number][] {
  const points: [number, number][] = [];
  const steps = 100;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    // Normalize: max extent is ~17 for x, ~30 for y
    const nx = x / 17;
    const ny = y / 30;
    points.push([nx, ny]);
  }

  return projectShape(points, center, sizeKm);
}

// Circle: simple parametric circle
export function generateCircle(center: [number, number], sizeKm: number = 2): [number, number][] {
  const points: [number, number][] = [];
  const steps = 72;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    points.push([Math.cos(t), Math.sin(t)]);
  }

  return projectShape(points, center, sizeKm);
}

// Cat silhouette (simplified)
export function generateCat(center: [number, number], sizeKm: number = 2): [number, number][] {
  const raw: [number, number][] = [
    // Body bottom
    [-0.3, -0.5], [-0.5, -0.3], [-0.6, 0], [-0.5, 0.2],
    // Left ear
    [-0.4, 0.3], [-0.5, 0.7], [-0.3, 0.5],
    // Head top
    [-0.1, 0.6], [0, 0.55], [0.1, 0.6],
    // Right ear
    [0.3, 0.5], [0.5, 0.7], [0.4, 0.3],
    // Body right
    [0.5, 0.2], [0.6, 0], [0.5, -0.3],
    // Tail
    [0.3, -0.5], [0.5, -0.7], [0.7, -0.6], [0.8, -0.4],
    // Back to start
    [0.3, -0.5], [-0.3, -0.5],
  ];

  return projectShape(raw, center, sizeKm);
}

// Dog silhouette (simplified)
export function generateDog(center: [number, number], sizeKm: number = 2): [number, number][] {
  const raw: [number, number][] = [
    // Body bottom
    [-0.5, -0.4], [-0.6, -0.1], [-0.5, 0.1],
    // Head
    [-0.5, 0.2], [-0.6, 0.4], [-0.5, 0.55], [-0.3, 0.6],
    // Ear
    [-0.35, 0.65], [-0.4, 0.8], [-0.25, 0.7],
    // Snout
    [-0.1, 0.5], [0, 0.45],
    // Back
    [0.1, 0.4], [0.3, 0.35], [0.5, 0.3],
    // Tail (upward curve)
    [0.6, 0.2], [0.7, 0.4], [0.75, 0.6],
    // Rear leg back
    [0.6, 0.1], [0.5, -0.2], [0.55, -0.5],
    [0.45, -0.5], [0.4, -0.2],
    // Belly
    [0.2, -0.3], [0, -0.35],
    // Front leg
    [-0.2, -0.35], [-0.25, -0.5],
    [-0.35, -0.5], [-0.3, -0.3],
    [-0.5, -0.4],
  ];

  return projectShape(raw, center, sizeKm);
}

/**
 * Projects normalized [-1,1] shape coordinates onto geographic coordinates.
 * Uses Turf.js to calculate destination points from center with bearing/distance.
 */
function projectShape(
  normalized: [number, number][],
  center: [number, number],
  sizeKm: number
): [number, number][] {
  const halfSize = sizeKm / 2;

  return normalized.map(([nx, ny]) => {
    // Calculate offset in km
    const offsetEastKm = nx * halfSize;
    const offsetNorthKm = ny * halfSize;

    // Convert to bearing and distance
    const distance = Math.sqrt(offsetEastKm ** 2 + offsetNorthKm ** 2);
    const bearing = (Math.atan2(offsetEastKm, offsetNorthKm) * 180) / Math.PI;

    const destination = turf.destination(
      turf.point(center),
      distance,
      bearing,
      { units: 'kilometers' }
    );

    return destination.geometry.coordinates as [number, number];
  });
}
