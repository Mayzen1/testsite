import type { RoutePoint, RideDetails } from "./types";

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
  const anchors: number[] = [];
  for (let i = 0; i <= Math.ceil(length / wavelength) + 1; i++) {
    anchors.push(gaussRng(rng));
  }
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
  details: RideDetails
): RoutePoint[] {
  if (points.length < 2) return points;

  const totalDistance = points[points.length - 1].distance;
  if (totalDistance === 0) return points;

  const n = points.length;
  const basePaceSecPerMeter = (60 / details.avgSpeedKmh * 60) / 1000;

  const seed = details.date.length * 7 + Math.round(details.avgSpeedKmh * 100) + Math.round(details.speedVariability * 13);
  const rng = mulberry32(seed);
  const inconsistency = details.speedVariability / 100;

  // --- Pre-compute variation layers ---
  const longWave = smoothNoise(rng, n, Math.max(20, Math.round(n * 0.18)));
  const medWave = smoothNoise(rng, n, Math.max(8, Math.round(n * 0.06)));
  const shortJitter: number[] = [];
  for (let i = 0; i < n; i++) shortJitter.push(gaussRng(rng));

  // Intersection slowdowns
  const intersections: Set<number> = new Set();
  const avgDistBetween = 2500 + rng() * 1500;
  const numIntersections = Math.floor(totalDistance / avgDistBetween);
  for (let j = 0; j < numIntersections; j++) {
    const pos = Math.round((0.1 + rng() * 0.8) * n);
    const zoneSize = 3 + Math.round(rng() * 5);
    for (let k = -zoneSize; k <= zoneSize; k++) {
      const idx = pos + k;
      if (idx > 0 && idx < n) intersections.add(idx);
    }
  }

  // Surge/attack zones
  const surges: Set<number> = new Set();
  if (inconsistency > 0.15) {
    const numSurges = Math.floor(inconsistency * 6);
    for (let j = 0; j < numSurges; j++) {
      const pos = Math.round(0.15 * n + rng() * 0.7 * n);
      const len = 2 + Math.round(rng() * 4);
      for (let k = 0; k < len; k++) {
        if (pos + k < n) surges.add(pos + k);
      }
    }
  }

  // --- PASS 1: Compute raw variation multipliers per segment ---
  // We compute all multipliers first, then normalize so total time matches target speed.
  const segmentMultipliers: number[] = [0]; // index 0 = first point (no segment)
  const segmentDistances: number[] = [0];

  for (let i = 1; i < n; i++) {
    const segmentDist = points[i].distance - points[i - 1].distance;
    segmentDistances.push(segmentDist);

    if (segmentDist <= 0) {
      segmentMultipliers.push(1.0);
      continue;
    }

    const progress = i / n;

    // Elevation impact
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    const gradient = elevDiff / segmentDist;
    let elevMult = 1.0;
    if (gradient > 0) {
      elevMult = 1.0 + gradient * 12;
    } else {
      elevMult = Math.max(0.35, 1.0 + gradient * 5);
    }

    // Fatigue
    const lastStretch = Math.max(0, (progress - 0.8) / 0.2);
    const fatigueMult = 1.0 + progress * 0.03 + lastStretch * 0.06;

    // Variation layers
    const longEffect = longWave[i] * 0.04 * (1 + inconsistency * 2);
    const medEffect = medWave[i] * 0.02 * (1 + inconsistency * 1.5);
    const shortEffect = shortJitter[i] * 0.01 * (1 + inconsistency);
    let variationMult = 1.0 + longEffect + medEffect + shortEffect;

    // Intersection slowdown
    if (intersections.has(i)) {
      const zone = [...intersections].filter(x => Math.abs(x - i) <= 4);
      const center = zone.reduce((a, b) => a + b, 0) / zone.length;
      const distFromCenter = Math.abs(i - center) / 4;
      const slowFactor = 1.3 + (1 - distFromCenter) * (0.8 + inconsistency * 1.5);
      variationMult *= slowFactor;
    }

    // Surge / attack
    if (surges.has(i)) {
      variationMult *= 0.75 - inconsistency * 0.1;
    }

    // Warmup
    const warmupMult = progress < 0.04 ? 1.08 - progress * 2 : 1.0;

    segmentMultipliers.push(elevMult * fatigueMult * variationMult * warmupMult);
  }

  // --- Compute normalization factor ---
  // Target total time = totalDistance / avgSpeedKmh (converted to seconds)
  const targetTotalSeconds = (totalDistance / 1000 / details.avgSpeedKmh) * 3600;

  // Raw weighted time (sum of segmentDist * multiplier)
  let rawWeightedSum = 0;
  for (let i = 1; i < n; i++) {
    rawWeightedSum += segmentDistances[i] * segmentMultipliers[i];
  }

  // normalizedBasePace: if we multiply each segment by this, total time = target
  // totalTime = sum(segmentDist[i] * normalizedBasePace * multiplier[i]) = targetTotalSeconds
  // normalizedBasePace = targetTotalSeconds / rawWeightedSum
  const normalizedBasePace = rawWeightedSum > 0 ? targetTotalSeconds / rawWeightedSum : basePaceSecPerMeter;

  // Drafting reduces effort but doesn't change the average speed target
  // (drafting means same speed at less power, not faster)

  // --- PASS 2: Build timestamped points using normalized pace ---
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
        heartRate: details.includeHeartRate ? 115 + Math.round(rng() * 15) : undefined,
        cadence: details.includeCadence ? details.avgCadence + Math.round((rng() - 0.5) * 6) : undefined,
        power: details.includePower ? Math.round(details.ftp * 0.65 + (rng() - 0.5) * 20) : undefined,
      });
      continue;
    }

    const segmentDist = segmentDistances[i];
    if (segmentDist <= 0) {
      result.push({
        ...points[i],
        timestamp: new Date(currentTime).toISOString(),
        heartRate: details.includeHeartRate ? result[i - 1].heartRate : undefined,
        cadence: details.includeCadence ? result[i - 1].cadence : undefined,
        power: details.includePower ? result[i - 1].power : undefined,
      });
      continue;
    }

    const segmentTime = segmentDist * normalizedBasePace * segmentMultipliers[i];
    currentTime += segmentTime * 1000;

    const progress = i / n;
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    const gradient = elevDiff / segmentDist;

    // --- Heart rate ---
    let hr: number | undefined;
    if (details.includeHeartRate) {
      const baseHr = 132;
      const effort = segmentMultipliers[i]; // higher mult = harder effort = higher HR
      const targetHr = baseHr * Math.min(effort, 1.4) + longWave[i] * 3;
      const prevHr = result[i - 1].heartRate || baseHr;
      hr = Math.round(prevHr * 0.85 + targetHr * 0.15 + (rng() - 0.5) * 4);
      hr = Math.max(85, Math.min(200, hr));
    }

    // --- Cadence ---
    let cadence: number | undefined;
    if (details.includeCadence) {
      const baseCad = details.avgCadence;
      let cadMod = 1.0;
      if (gradient > 0.03) {
        cadMod = Math.max(0.6, 0.9 - gradient * 3);
      } else if (gradient < -0.02) {
        cadMod = 1.05 + Math.abs(gradient) * 2;
      }
      if (intersections.has(i)) cadMod *= 0.5;
      if (surges.has(i)) cadMod *= 1.15;

      const prevCad = result[i - 1].cadence || baseCad;
      const targetCad = baseCad * cadMod + medWave[i] * 3;
      cadence = Math.round(prevCad * 0.7 + targetCad * 0.3 + (rng() - 0.5) * 4);
      cadence = Math.max(0, Math.min(130, cadence));
      if (intersections.has(i) && segmentMultipliers[i] > 1.8) cadence = Math.round(rng() * 20);
    }

    // --- Power ---
    let power: number | undefined;
    if (details.includePower) {
      const basePow = details.ftp * 0.7;
      let powMod = 1.0;
      if (gradient > 0) {
        powMod = 1.0 + gradient * 18;
      } else {
        powMod = Math.max(0.05, 1.0 + gradient * 6);
      }
      if (intersections.has(i) && segmentMultipliers[i] > 1.5) powMod *= 0.1;
      if (surges.has(i)) powMod *= 1.4 + inconsistency * 0.5;

      // Drafting reduces power needed (same speed, less effort)
      const draftPow = details.drafting ? 0.78 : 1.0;

      const fatiguePow = 1.0 - progress * 0.08;
      const targetPow = basePow * powMod * fatiguePow * draftPow + longWave[i] * 8;
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
  details: RideDetails
): string {
  const timestamped = humanizeTimestamps(points, details);
  const name = details.name || "Cycling Activity";

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
    <type>cycling</type>
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
