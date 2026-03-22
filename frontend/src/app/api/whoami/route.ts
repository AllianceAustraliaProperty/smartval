import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function extractClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const xReal = req.headers.get('x-real-ip');
  if (xReal) return xReal;
  const anyReq = req as any;
  return anyReq?.ip || null;
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = extractClientIp(request);

    // Query a public geolocation service from the server (no CORS issues)
    let geo: any = null;
    try {
      const ipForLookup = clientIp || '';
      const url = `http://ip-api.com/json/${encodeURIComponent(ipForLookup)}?fields=status,message,country,regionName,city,query,timezone,lat,lon`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) {
        geo = await resp.json();
      }
    } catch (_) {
      // ignore failures; we'll return minimal info
    }

    const result = {
      ip: clientIp || geo?.query || null,
      city: geo?.city || null,
      region: geo?.regionName || null,
      country: geo?.country || null,
      timezone: geo?.timezone || null,
      lat: typeof geo?.lat === 'number' ? geo.lat : null,
      lon: typeof geo?.lon === 'number' ? geo.lon : null,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ip: null }, { status: 200 });
  }
}


