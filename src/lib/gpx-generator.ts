import type { RoutePoint, RunDetails } from "./types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Seeded random (Mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gaussian-ish random from uniform (Box-Muller lite)
function gaussRng(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// Smoothed Perlin-like noise for natural wave patterns
function smoothNoise(rng: () => number, length: number, wavelength: number): number[] {
  // Generate anchor points
  const anchors: number[] = [];
  for (let i = 0; i <= Math.ceil(length / wavelength) + 1; i++) {
    anchors.push(gaussRng(rng));
  }
  // Interpolate with cosine smoothing
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    const pos = i / wavelength;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const smooth = (1 - Math.cos(frac * Math.PI)) / 2;
    const a = anchors[idx % anchors.length];
    const b = anchors[(idx + 1) % anchors.length];
    result.push(a * (1 - smooth) + b * smooth);
  }
  return result;
}

// Apply realistic timestamp distribution with humanized variations
export function humanizeTimestamps(
  points: RoutePoint[],
  details: RunDetails
): RoutePoint[] {
  if (points.length < 2) return points;

  const totalDistance = points[points.length - 1].distance;
  if (totalDistance === 0) return points;

  const isBike = details.activityType === "bike";
  const n = points.length;

  // Base pace
  const effectivePace = isBike
    ? 60 / details.avgSpeedKmh
    : details.paceMinPerKm;
  const basePaceSecPerMeter = (effectivePace * 60) / 1000;

  const seed = details.date.length * 7 + Math.round(effectivePace * 100) + Math.round(details.paceInconsistency * 13);
  const rng = mulberry32(seed);
  const inconsistency = details.paceInconsistency / 100;

  // --- Pre-compute variation layers ---

  // Layer 1: Long waves (wind/effort cycles) — period ~15-25% of route
  const longWave = smoothNoise(rng, n, Math.max(20, Math.round(n * 0.18)));
  // Layer 2: Medium waves (terrain micro-undulations, traffic) — period ~5-10%
  const medWave = smoothNoise(rng, n, Math.max(8, Math.round(n * 0.06)));
  // Layer 3: Short jitter (road surface, micro-accelerations)
  const shortJitter: number[] = [];
  for (let i = 0; i < n; i++) shortJitter.push(gaussRng(rng));

  // Layer 4 (bike): Intersection slowdowns — random positions where speed drops significantly
  const intersections: Set<number> = new Set();
  if (isBike) {
    // ~1 slowdown every 2-4 km
    const avgDistBetween = 2500 + rng() * 1500; // 2.5-4km
    const numIntersections = Math.floor(totalDistance / avgDistBetween);
    for (let j = 0; j < numIntersections; j++) {
      const pos = Math.round((0.1 + rng() * 0.8) * n); // avoid very start/end
      // Mark a zone of ~5-8 points around intersection
      const zoneSize = 3 + Math.round(rng() * 5);
      for (let k = -zoneSize; k <= zoneSize; k++) {
        const idx = pos + k;
        if (idx > 0 && idx < n) intersections.add(idx);
      }
    }
  }

  // Layer 5 (bike): Surge/attack zones — brief accelerations
  const surges: Set<number> = new Set();
  if (isBike && inconsistency > 0.15) {
    const numSurges = Math.floor(inconsistency * 6);
    for (let j = 0; j < numSurges; j++) {
      const pos = Math.round(0.15 * n + rng() * 0.7 * n);
      const len = 2 + Math.round(rng() * 4);
      for (let k = 0; k < len; k++) {
        if (pos + k < n) surges.add(pos + k);
      }
    }
  }

  // Parse start time
  const [year, month, day] = details.date.split("-").map(Number);
  const [hour, minute] = details.startTime.split(":").map(Number);
  const startDate = new Date(year, month - 1, day, hour, minute, 0);
  let currentTime = startDate.getTime();

  const result: RoutePoint[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      result.push({
        ...points[i],
        timestamp: new Date(currentTime).toISOString(),
        heartRate: details.includeHeartRate ? (isBike ? 115 : 130) + Math.round(rng() * 15) : undefined,
        cadence: isBike && details.includeCadence ? details.avgCadence + Math.round((rng() - 0.5) * 6) : undefined,
        power: isBike && details.includePower ? Math.round(details.ftp * 0.65 + (rng() - 0.5) * 20) : undefined,
      });
      continue;
    }

    const segmentDist = points[i].distance - points[i - 1].distance;
    if (segmentDist <= 0) {
      result.push({
        ...points[i],
        timestamp: new Date(currentTime).toISOString(),
        heartRate: details.includeHeartRate ? result[i - 1].heartRate : undefined,
        cadence: isBike && details.includeCadence ? result[i - 1].cadence : undefined,
        power: isBike && details.includePower ? result[i - 1].power : undefined,
      });
      continue;
    }

    const progress = i / n;

    // --- Elevation impact ---
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    const gradient = elevDiff / segmentDist;
    let elevMult = 1.0;
    if (isBike) {
      if (gradient > 0) {
        // Exponential slowdown on climbs: 5% grade → ~1.5x slower, 10% → ~2.5x
        elevMult = 1.0 + gradient * 12;
      } else {
        // Descents: speed up but aero drag limits max speed
        elevMult = Math.max(0.35, 1.0 + gradient * 5);
      }
    } else {
      if (gradient > 0) {
        elevMult = 1.0 + gradient * 3.5;
      } else {
        elevMult = Math.max(0.7, 1.0 + gradient * 1.5);
      }
    }

    // --- Fatigue ---
    let fatigueMult: number;
    if (isBike) {
      // Cycling fatigue: slight through middle, stronger in last 20%
      const lastStretch = Math.max(0, (progress - 0.8) / 0.2);
      fatigueMult = 1.0 + progress * 0.03 + lastStretch * 0.06;
    } else {
      fatigueMult = 1.0 + progress * 0.08;
    }

    // --- Variation layers combined ---
    // Long wave: ±8-15% depending on inconsistency
    const longEffect = longWave[i] * 0.04 * (1 + inconsistency * 2);
    // Medium wave: ±3-8%
    const medEffect = medWave[i] * 0.02 * (1 + inconsistency * 1.5);
    // Short jitter: ±1-4%
    const shortEffect = shortJitter[i] * 0.01 * (1 + inconsistency);

    let variationMult = 1.0 + longEffect + medEffect + shortEffect;

    // Bike-specific events
    if (isBike) {
      // Intersection slowdown (braking → near-stop → re-acceleration)
      if (intersections.has(i)) {
        const zone = [...intersections].filter(x => Math.abs(x - i) <= 4);
        const center = zone.reduce((a, b) => a + b, 0) / zone.length;
        const distFromCenter = Math.abs(i - center) / 4;
        // Parabolic slowdown: center is slowest
        const slowFactor = 1.3 + (1 - distFromCenter) * (0.8 + inconsistency * 1.5);
        variationMult *= slowFactor;
      }

      // Surge / attack (brief acceleration)
      if (surges.has(i)) {
        variationMult *= 0.75 - inconsistency * 0.1;
      }
    }

    // Drafting
    const draftMult = isBike && details.drafting ? 0.78 : 1.0;

    // --- Warmup: first 3-5% slightly slower ---
    const warmupMult = progress < 0.04 ? 1.08 - progress * 2 : 1.0;

    const segmentPace = basePaceSecPerMeter * elevMult * fatigueMult * variationMult * draftMult * warmupMult;
    const segmentTime = segmentDist * segmentPace;
    currentTime += segmentTime * 1000;

    // --- Heart rate (responds to effort with ~20s lag smoothed) ---
    let hr: number | undefined;
    if (details.includeHeartRate) {
      const baseHr = isBike ? 132 : 152;
      const effort = elevMult * fatigueMult * (1 / Math.max(variationMult, 0.5));
      const targetHr = baseHr * Math.min(effort, 1.4) + longWave[i] * 3;
      // Smooth towards target
      const prevHr = result[i - 1].heartRate || baseHr;
      hr = Math.round(prevHr * 0.85 + targetHr * 0.15 + (rng() - 0.5) * 4);
      hr = Math.max(85, Math.min(200, hr));
    }

    // --- Cadence (bike) ---
    let cadence: number | undefined;
    if (isBike && details.includeCadence) {
      const baseCad = details.avgCadence;
      let cadMod = 1.0;
      if (gradient > 0.03) {
        cadMod = Math.max(0.6, 0.9 - gradient * 3); // grinding uphill
      } else if (gradient < -0.02) {
        cadMod = 1.05 + Math.abs(gradient) * 2; // spinning downhill
      }
      // Low cadence at intersections (braking)
      if (intersections.has(i)) cadMod *= 0.5;
      // High cadence on surges
      if (surges.has(i)) cadMod *= 1.15;

      const prevCad = result[i - 1].cadence || baseCad;
      const targetCad = baseCad * cadMod + medWave[i] * 3;
      cadence = Math.round(prevCad * 0.7 + targetCad * 0.3 + (rng() - 0.5) * 4);
      cadence = Math.max(0, Math.min(130, cadence));
      // Near-zero at intersection center
      if (intersections.has(i) && variationMult > 1.8) cadence = Math.round(rng() * 20);
    }

    // --- Power (bike) ---
    let power: number | undefined;
    if (isBike && details.includePower) {
      const basePow = details.ftp * 0.7;
      let powMod = 1.0;
      if (gradient > 0) {
        powMod = 1.0 + gradient * 18;
      } else {
        powMod = Math.max(0.05, 1.0 + gradient * 6); // coasting = near zero
      }
      // Intersection: braking → ~0 power
      if (intersections.has(i) && variationMult > 1.5) powMod *= 0.1;
      // Surges: big power spike
      if (surges.has(i)) powMod *= 1.4 + inconsistency * 0.5;

      const fatiguePow = 1.0 - progress * 0.08;
      const targetPow = basePow * powMod * fatiguePow + longWave[i] * 8;
      const prevPow = result[i - 1].power || basePow;
      power = Math.round(prevPow * 0.6 + targetPow * 0.4 + (rng() - 0.5) * 10);
      power = Math.max(0, Math.min(details.ftp * 2.2, power));
    }

    result.push({
      ...points[i],
      timestamp: new Date(currentTime).toISOString(),
      heartRate: hr,
      cadence,
      power,
    });
  }

  return result;
}

export function generateGPX(
  points: RoutePoint[],
  details: RunDetails
): string {
  const timestamped = humanizeTimestamps(points, details);

  const activityName = details.activityType === "run" ? "Running" : "Cycling";
  const name = details.name || `${activityName} Activity`;

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" version="1.1"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"
  xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v2"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v2 http://www.garmin.com/xmlschemas/TrackPointExtensionv2.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(details.description || "")}</desc>
    <time>${timestamped[0]?.timestamp || new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>${details.activityType === "run" ? "running" : "cycling"}</type>
    <trkseg>
`;

  for (const pt of timestamped) {
    gpx += `      <trkpt lat="${pt.lat.toFixed(7)}" lon="${pt.lng.toFixed(7)}">
        <ele>${pt.elevation.toFixed(1)}</ele>
${pt.timestamp ? `        <time>${pt.timestamp}</time>\n` : ""}`;

    const hasTPX = pt.heartRate || pt.cadence !== undefined;
    const hasPower = pt.power !== undefined;
    if (hasTPX || hasPower) {
      gpx += `        <extensions>\n`;
      if (hasTPX) {
        gpx += `          <gpxtpx:TrackPointExtension>\n`;
        if (pt.heartRate) gpx += `            <gpxtpx:hr>${pt.heartRate}</gpxtpx:hr>\n`;
        if (pt.cadence !== undefined) gpx += `            <gpxtpx:cad>${pt.cadence}</gpxtpx:cad>\n`;
        gpx += `          </gpxtpx:TrackPointExtension>\n`;
      }
      if (hasPower) {
        gpx += `          <power>${pt.power}</power>\n`;
      }
      gpx += `        </extensions>\n`;
    }
    gpx += `      </trkpt>\n`;
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}
