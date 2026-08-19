import 'server-only';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function initAdmin() {
    if (!getApps().length) {
        if (!process.env.FIREBASE_PROJECT_ID) {
            console.warn('Firebase Admin env vars missing. Skipping init (normal during build).');
            return null;
        }
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
    return getAuth();
}

export async function verifyFirebaseToken(token: string) {
    try {
        const auth = initAdmin();
        if (!auth) return null;
        const decoded = await auth.verifyIdToken(token, true);
        return decoded;
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return null;
    }
}

export async function createFirebaseUser(email: string, password: string, displayName: string, role: string) {
    const auth = initAdmin();
    if (!auth) throw new Error("Firebase Admin not initialized");
    
    // Create the user in Firebase Auth
    const userRecord = await auth.createUser({
        email,
        password,
        displayName,
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role });
    
    return userRecord;
}

export async function updateFirebaseUser(uid: string, data: { displayName?: string, password?: string, disabled?: boolean }) {
    const auth = initAdmin();
    if (!auth) throw new Error("Firebase Admin not initialized");
    
    return await auth.updateUser(uid, data);
}