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
    // 1. Call our API to securely clear the httpOnly session cookie
    await fetch('/api/auth/session', { method: 'DELETE' });

    // 2. Sign out from Firebase client-side state
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

// Get all users (calls our secure admin API)
export async function getAllUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const users = await res.json();
    
    // Map the string dates back to Date objects
    return users.map((u: any) => ({
      ...u,
      createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
      lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Create a new user (calls our secure admin API)
export async function createUser(email: string, password: string, name: string, username: string): Promise<User | null> {
  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, username })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create user');
    }
    
    const newUser = await res.json();
    return {
      id: newUser.firebaseUid,
      email: newUser.email,
      name: newUser.displayName,
      role: newUser.role,
    };
  } catch (error: any) {
    console.error('Create user error:', error);
    throw error;
  }
}

// Update a user (calls our secure admin API)
export async function updateUser(id: string, data: { name?: string, username?: string, password?: string, isActive?: boolean }): Promise<any> {
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update user');
    }
    
    return await res.json();
  } catch (error: any) {
    console.error('Update user error:', error);
    throw error;
  }
}