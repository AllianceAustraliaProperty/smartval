import 'server-only';
import { cookies } from 'next/headers';
import { verifyFirebaseToken } from './firebase-admin';
import { NextResponse } from 'next/server';

export async function requireAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('val-ai-auth')?.value;

    if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };                                                   
    }

    const user = await verifyFirebaseToken(token);
    if (!user) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }), user: null };                                                  
    }

    return { error: null, user };
}