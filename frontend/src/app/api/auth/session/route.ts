import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function decodePayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const payload = decodePayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'invalid token' }, { status: 400 });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === 'number' ? payload.exp : nowSeconds + 3600;
    const secondsUntilExpiry = Math.max(0, exp - nowSeconds - 60); // buffer 60s

    const maxAge = Math.min(secondsUntilExpiry, 7 * 24 * 60 * 60); // cap at 7 days

    const response = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';

    response.cookies.set('val-ai-auth', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: Math.max(0, maxAge),
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('val-ai-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}


