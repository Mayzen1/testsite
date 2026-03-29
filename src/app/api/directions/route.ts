import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Mapbox Directions API.
 * Keeps the Mapbox token server-side and handles CORS.
 */
export async function GET(req: NextRequest) {
  const coordinates = req.nextUrl.searchParams.get('coordinates');

  if (!coordinates) {
    return NextResponse.json({ error: 'Missing coordinates parameter' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&overview=full&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Mapbox API error' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}
