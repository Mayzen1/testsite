import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for OSRM (Open Source Routing Machine) API.
 * Free, no API key required. Uses the public demo server.
 * Profile: foot (walking/running).
 */
export async function GET(req: NextRequest) {
  const coordinates = req.nextUrl.searchParams.get('coordinates');

  if (!coordinates) {
    return NextResponse.json({ error: 'Missing coordinates parameter' }, { status: 400 });
  }

  // OSRM expects coordinates as lng,lat;lng,lat;...
  const url = `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.code !== 'Ok') {
      return NextResponse.json(
        { error: data.message || 'OSRM routing error' },
        { status: res.ok ? 400 : res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}
