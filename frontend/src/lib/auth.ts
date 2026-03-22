import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'valuer' | 'client';
  lastLogin?: Date;
  createdAt?: Date;
  disabled?: boolean;
  emailVerified?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

// Sign in with Firebase
export async function signIn(email: string, password: string): Promise<User | null> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get custom claims or user role from Firestore/Realtime Database
    const idTokenResult = await firebaseUser.getIdTokenResult();
    const role = (idTokenResult.claims.role as 'admin' | 'valuer' | 'client') || 'valuer';

    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || email.split('@')[0],
      role: role,
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : undefined,
      lastLogin: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
    };

    return user;
  } catch (error: any) {
    console.error('Firebase sign in error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled.');
    }

    throw new Error('Login failed. Please try again.');
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    // Clear the authentication cookie
    // Only set secure flag on HTTPS or production
    const isSecure = typeof window !== 'undefined' && (window.location.protocol === 'https:' || process.env.NODE_ENV === 'production');
    const cookieSecureFlag = isSecure ? '; secure' : '';
    document.cookie = `val-ai-auth=; path=/; max-age=0; samesite=strict${cookieSecureFlag}`;

    // Sign out from Firebase
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribe();

      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const role = (idTokenResult.claims.role as 'admin' | 'valuer' | 'client') || 'valuer';

        resolve({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          role: role,
          emailVerified: firebaseUser.emailVerified,
          createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : undefined,
          lastLogin: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
        });
      } else {
        resolve(null);
      }
    });
  });
}

// Get Firebase ID token for the current user
export async function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribe();

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          resolve(token);
        } catch (error) {
          console.error('Error getting ID token:', error);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// Verify Firebase ID token (for server-side use)
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // In a client-side Next.js app, we can't verify tokens server-side without Firebase Admin SDK
    // This function should be called from API routes or server components
    // For now, we'll decode the token payload (NOT SECURE - use Firebase Admin SDK in production)

    // Parse JWT token (basic parsing, NOT verification)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      userId: payload.user_id || payload.sub,
      email: payload.email,
      role: payload.role || 'valuer',
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Authenticate user (alias for signIn for backward compatibility)
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  return signIn(email, password);
}

// Change current user's password (requires re-authentication)
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

// Get all users (requires Firebase Admin SDK in production)
// This is a placeholder - implement with Firebase Admin SDK or Firestore query
export async function getAllUsers(): Promise<User[]> {
  try {
    // In production, this should call a Cloud Function or API route that uses Firebase Admin SDK
    // For now, we'll return an empty array as a placeholder
    console.warn('getAllUsers: This function requires Firebase Admin SDK implementation');

    // You can implement this by:
    // 1. Creating a Cloud Function that uses admin.auth().listUsers()
    // 2. Creating a Firestore collection to store user data
    // 3. Creating an API route that uses Firebase Admin SDK

    return [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Create a new user
export async function createUser(email: string, password: string, name: string, role: 'admin' | 'valuer' | 'client' = 'valuer'): Promise<User | null> {
  try {
    // Create user with Firebase Authentication
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update user profile with display name
    await updateProfile(firebaseUser, {
      displayName: name,
    });

    // Note: Setting custom claims (role) requires Firebase Admin SDK
    // In production, you should call a Cloud Function to set the role
    // For now, we'll return the user with default role
    console.warn('createUser: Custom claims (role) require Firebase Admin SDK. User created with default role.');

    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: name,
      role: role, // Note: This won't be set in Firebase until you use Admin SDK
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : undefined,
      lastLogin: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
    };

    return user;
  } catch (error: any) {
    console.error('Firebase create user error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email address is already in use');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }

    throw new Error('Failed to create user. Please try again.');
  }
}