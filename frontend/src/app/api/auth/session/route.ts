import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, createFirebaseSessionCookie } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const payload = await verifyFirebaseToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'invalid token' }, { status: 400 });
    }

    const expiresIn = 6 * 60 * 60 * 1000; // 6 hours
    const sessionCookie = await createFirebaseSessionCookie(token, expiresIn);
    if (!sessionCookie) {
      return NextResponse.json({ error: 'failed to create session cookie' }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';

    response.cookies.set('val-ai-auth', sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 6 * 60 * 60, // 6 hours in seconds
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


