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

  const basePaceSecPerMeter = (details.paceMinPerKm * 60) / 1000;
  const seed = details.date.length + details.paceMinPerKm * 100;
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
        heartRate: details.includeHeartRate ? 130 + Math.round(rng() * 20) : undefined,
      });
      continue;
    }

    const segmentDist = points[i].distance - points[i - 1].distance;
    if (segmentDist <= 0) {
      result.push({
        ...points[i],
        timestamp: new Date(currentTime).toISOString(),
        heartRate: details.includeHeartRate ? result[i - 1].heartRate : undefined,
      });
      continue;
    }

    // Elevation impact on pace
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    const gradient = segmentDist > 0 ? elevDiff / segmentDist : 0;
    let elevationMultiplier = 1.0;
    if (gradient > 0) {
      elevationMultiplier = 1.0 + gradient * 3.0; // uphills slow down
    } else {
      elevationMultiplier = Math.max(0.7, 1.0 + gradient * 1.5); // downhills speed up
    }

    // Fatigue model: +8% slowdown by end
    const progress = i / points.length;
    const fatigueMultiplier = 1.0 + progress * 0.08;

    // Micro-jitter: ±5% per segment + pace inconsistency
    const jitter = 1.0 + (rng() - 0.5) * 0.1 + (rng() - 0.5) * inconsistency * 0.5;

    const segmentPace = basePaceSecPerMeter * elevationMultiplier * fatigueMultiplier * jitter;
    const segmentTime = segmentDist * segmentPace;

    currentTime += segmentTime * 1000;

    // Heart rate simulation
    let hr: number | undefined;
    if (details.includeHeartRate) {
      const baseHr = details.activityType === "run" ? 155 : 140;
      const effortFactor = elevationMultiplier * fatigueMultiplier;
      hr = Math.round(baseHr * effortFactor + (rng() - 0.5) * 10);
      hr = Math.max(100, Math.min(200, hr));
    }

    result.push({
      ...points[i],
      timestamp: new Date(currentTime).toISOString(),
      heartRate: hr,
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

    if (pt.heartRate) {
      gpx += `        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${pt.heartRate}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
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
