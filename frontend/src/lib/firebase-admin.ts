import 'server-only';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(token: string) {
    try {
        const decoded = await adminAuth.verifyIdToken(token, true);
        return decoded;
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return null;
    }
}