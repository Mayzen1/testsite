import type { RoutePoint, ActivityConfig } from './types';

/**
 * GPX Generation Engine
 *
 * This module handles the "humanization" of timestamps and the final GPX XML output.
 *
 * HUMANIZATION ALGORITHM:
 * -----------------------
 * Real runners don't maintain a perfectly constant pace. Our algorithm introduces
 * realistic variations using several factors:
 *
 * 1. ELEVATION IMPACT: When going uphill, pace slows proportionally to gradient.
 *    Formula: paceMultiplier = 1 + (gradient * 3.0) for uphills
 *             paceMultiplier = 1 - (|gradient| * 1.5) for downhills (capped at 0.7x)
 *
 * 2. FATIGUE MODEL: A gradual slowdown over the course of the run.
 *    Formula: fatigueMultiplier = 1 + (progressRatio * 0.08)
 *    This means at the end of the run, pace is ~8% slower than at the start.
 *
 * 3. RANDOM MICRO-VARIATIONS: Small ±5% jitter on each segment to simulate
 *    natural cadence fluctuations.
 *    Formula: jitter = 1 + (random(-0.05, 0.05))
 *
 * The final pace for each segment is:
 *    effectivePace = basePace * elevationMultiplier * fatigueMultiplier * jitter
 */

/**
 * Compute the gradient (slope) between two consecutive route points.
 * Returns a value between roughly -0.3 and 0.3 (clamped).
 */
function computeGradient(prev: RoutePoint, curr: RoutePoint): number {
  const horizontalDist = curr.distance - prev.distance;
  if (horizontalDist < 0.5) return 0; // avoid division by near-zero
  const elevDiff = curr.elevation - prev.elevation;
  const gradient = elevDiff / horizontalDist;
  return Math.max(-0.3, Math.min(0.3, gradient));
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Ensures reproducible GPX output for the same route.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Assigns realistic timestamps to each RoutePoint based on the activity config.
 * Mutates the `timestamp` field of each point in place.
 */
export function humanizeTimestamps(
  points: RoutePoint[],
  config: ActivityConfig
): RoutePoint[] {
  if (points.length === 0) return points;

  const basePaceSecPerMeter = (config.paceMinPerKm * 60) / 1000;
  const totalDistance = points[points.length - 1].distance;
  const rand = seededRandom(Math.floor(points[0].lng * 10000 + points[0].lat * 10000));

  let currentTime = config.startTime.getTime();
  points[0].timestamp = new Date(currentTime).toISOString();

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentDist = curr.distance - prev.distance;

    if (segmentDist <= 0) {
      curr.timestamp = new Date(currentTime).toISOString();
      continue;
    }

    // 1. Elevation impact on pace
    const gradient = computeGradient(prev, curr);
    let elevationMultiplier: number;
    if (gradient > 0) {
      // Uphill: significant slowdown. A 10% gradient -> 1.30x slower
      elevationMultiplier = 1 + gradient * 3.0;
    } else {
      // Downhill: moderate speedup, capped so we don't go unrealistically fast
      elevationMultiplier = Math.max(0.7, 1 + gradient * 1.5);
    }

    // 2. Fatigue model: linear increase over total distance
    //    At 0% progress -> 1.0x, at 100% progress -> 1.08x
    const progressRatio = prev.distance / Math.max(totalDistance, 1);
    const fatigueMultiplier = 1 + progressRatio * 0.08;

    // 3. Micro-jitter: ±5% random variation per segment
    const jitter = 1 + (rand() - 0.5) * 0.10;

    // Combine all multipliers
    const effectivePace = basePaceSecPerMeter * elevationMultiplier * fatigueMultiplier * jitter;

    // Time for this segment
    const segmentTime = segmentDist * effectivePace;
    currentTime += segmentTime * 1000; // convert to milliseconds

    curr.timestamp = new Date(currentTime).toISOString();
  }

  return points;
}

/**
 * Generates a valid GPX XML string from an array of RoutePoints.
 */
export function generateGPX(
  points: RoutePoint[],
  activityName: string = 'FakeMyRun Activity'
): string {
  const trackpoints = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">
        <ele>${p.elevation.toFixed(1)}</ele>
        <time>${p.timestamp}</time>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
     version="1.1"
     creator="FakeMyRun Clone">
  <metadata>
    <name>${escapeXml(activityName)}</name>
    <time>${points[0]?.timestamp ?? new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(activityName)}</name>
    <type>running</type>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
