import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Open-Elevation API.
 * Accepts POST with { locations: [{ latitude, longitude }] }
 * Returns { results: [{ elevation }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locations } = body;

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json({ error: 'Missing locations array' }, { status: 400 });
    }

    // Use Open-Elevation API (free, no key required)
    const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!res.ok) {
      // Fallback: return estimated elevations (0m) if API is down
      return NextResponse.json({
        results: locations.map(() => ({ elevation: 0 })),
        fallback: true,
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Elevation lookup failed' }, { status: 500 });
  }
}
