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

// Apply realistic timestamp distribution with pace variations
function humanizeTimestamps(
  points: RoutePoint[],
  details: RunDetails
): RoutePoint[] {
  if (points.length < 2) return points;

  const totalDistance = points[points.length - 1].distance;
  if (totalDistance === 0) return points;

  const isBike = details.activityType === "bike";

  // For bike mode, convert speed to pace
  const effectivePace = isBike
    ? 60 / details.avgSpeedKmh  // min/km from km/h
    : details.paceMinPerKm;

  const basePaceSecPerMeter = (effectivePace * 60) / 1000;
  const seed = details.date.length + effectivePace * 100;
  const rng = mulberry32(seed);
  const inconsistency = details.paceInconsistency / 100;

  // Parse start time
  const [year, month, day] = details.date.split("-").map(Number);
  const [hour, minute] = details.startTime.split(":").map(Number);
  const startDate = new Date(year, month - 1, day, hour, minute, 0);
  let currentTime = startDate.getTime();

  const result: RoutePoint[] = [];

  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      result.push({
        ...points[i],
        timestamp: new Date(currentTime).toISOString(),
        heartRate: details.includeHeartRate ? (isBike ? 120 : 130) + Math.round(rng() * 20) : undefined,
        cadence: isBike && details.includeCadence ? details.avgCadence + Math.round((rng() - 0.5) * 10) : undefined,
        power: isBike && details.includePower ? Math.round(details.ftp * 0.7 + (rng() - 0.5) * 30) : undefined,
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

    // Elevation impact on pace (different for bike vs run)
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    const gradient = segmentDist > 0 ? elevDiff / segmentDist : 0;
    let elevationMultiplier = 1.0;
    if (isBike) {
      // Bikes are more affected by hills (gearing, gravity)
      if (gradient > 0) {
        elevationMultiplier = 1.0 + gradient * 8.0; // steep climbs massively slow down
      } else {
        elevationMultiplier = Math.max(0.4, 1.0 + gradient * 4.0); // downhills much faster
      }
    } else {
      if (gradient > 0) {
        elevationMultiplier = 1.0 + gradient * 3.0;
      } else {
        elevationMultiplier = Math.max(0.7, 1.0 + gradient * 1.5);
      }
    }

    // Fatigue model
    const progress = i / points.length;
    const fatigueMultiplier = isBike
      ? 1.0 + progress * 0.05  // cyclists fatigue less (more efficient)
      : 1.0 + progress * 0.08;

    // Micro-jitter
    const jitter = 1.0 + (rng() - 0.5) * 0.1 + (rng() - 0.5) * inconsistency * 0.5;

    // Drafting effect for bike: ~30% less effort (faster)
    const draftingFactor = isBike && details.drafting ? 0.75 : 1.0;

    const segmentPace = basePaceSecPerMeter * elevationMultiplier * fatigueMultiplier * jitter * draftingFactor;
    const segmentTime = segmentDist * segmentPace;

    currentTime += segmentTime * 1000;

    // Heart rate simulation
    let hr: number | undefined;
    if (details.includeHeartRate) {
      const baseHr = isBike ? 135 : 155;
      const effortFactor = elevationMultiplier * fatigueMultiplier;
      hr = Math.round(baseHr * effortFactor + (rng() - 0.5) * 10);
      hr = Math.max(90, Math.min(200, hr));
    }

    // Cadence simulation (bike only)
    let cadence: number | undefined;
    if (isBike && details.includeCadence) {
      const baseCadence = details.avgCadence;
      // Lower cadence on climbs, higher on flats/downhills
      let cadenceModifier = 1.0;
      if (gradient > 0.03) {
        cadenceModifier = 0.85 - gradient * 2; // steep = lower cadence (grinding)
      } else if (gradient < -0.03) {
        cadenceModifier = 1.1; // descents = coasting / higher cadence
      }
      cadence = Math.round(baseCadence * cadenceModifier + (rng() - 0.5) * 8);
      cadence = Math.max(40, Math.min(130, cadence));
    }

    // Power simulation (bike only)
    let power: number | undefined;
    if (isBike && details.includePower) {
      const basePower = details.ftp * 0.7;
      // More power on climbs, less on descents
      let powerModifier = 1.0;
      if (gradient > 0) {
        powerModifier = 1.0 + gradient * 15; // steep climb = massive power
      } else {
        powerModifier = Math.max(0.2, 1.0 + gradient * 5); // descents = low power (coasting)
      }
      const fatiguePower = 1.0 - progress * 0.1; // power drops with fatigue
      power = Math.round(basePower * powerModifier * fatiguePower + (rng() - 0.5) * 20);
      power = Math.max(0, Math.min(details.ftp * 2, power));
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

  const activityName = details.activityType === "run" ? "Running" : "Biking";
  const name = details.name || `${activityName} Activity`;

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="FakeMyRun" version="1.1"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(details.description || "")}</desc>
    <time>${timestamped[0]?.timestamp || new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>${details.activityType === "run" ? "9" : "1"}</type>
    <trkseg>
`;

  for (const pt of timestamped) {
    gpx += `      <trkpt lat="${pt.lat.toFixed(7)}" lon="${pt.lng.toFixed(7)}">
        <ele>${pt.elevation.toFixed(1)}</ele>
${pt.timestamp ? `        <time>${pt.timestamp}</time>\n` : ""}`;

    if (pt.heartRate || pt.cadence !== undefined || pt.power !== undefined) {
      gpx += `        <extensions>
          <gpxtpx:TrackPointExtension>
`;
      if (pt.heartRate) gpx += `            <gpxtpx:hr>${pt.heartRate}</gpxtpx:hr>\n`;
      if (pt.cadence !== undefined) gpx += `            <gpxtpx:cad>${pt.cadence}</gpxtpx:cad>\n`;
      if (pt.power !== undefined) gpx += `            <gpxtpx:power>${pt.power}</gpxtpx:power>\n`;
      gpx += `          </gpxtpx:TrackPointExtension>
        </extensions>
`;
    }
    gpx += `      </trkpt>\n`;
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}
