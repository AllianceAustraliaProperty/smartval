import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/User';
import { requireAuth } from '@/lib/route-auth';
import { createFirebaseUser } from '@/lib/firebase-admin';

// Helper to check if caller is an admin
async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error, user: null };
  if (auth.user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }
  return { error: null, user: auth.user };
}

// GET all users
export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  
  // Format to match the UI expected structure
  const formattedUsers = users.map((u: any) => ({
    id: u.firebaseUid,
    name: u.displayName,
    email: u.email,
    username: u.username,
    role: u.role,
    lastLogin: u.lastLoginAt,
    isActive: u.isActive
  }));

  return NextResponse.json(formattedUsers);
}

// POST to create a new valuer
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  try {
    const data = await req.json();
    const { email, password, username, name } = data;

    if (!email || !password || !username || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    // Check if username already exists in our MongoDB
    const existingUser = await User.findOne({ 
      $or: [{ username: cleanUsername }, { email: cleanEmail }] 
    });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already in use' }, { status: 409 });
    }

    // 1. Create user in Firebase (HARDCODED to 'valuer')
    const firebaseRecord = await createFirebaseUser(cleanEmail, password, name, 'valuer');

    // 2. Save user profile + username mapping in MongoDB
    const newUser = await User.create({
      firebaseUid: firebaseRecord.uid,
      email: cleanEmail,
      username: cleanUsername,
      displayName: name,
      role: 'valuer',
      isActive: true,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already exists in Firebase' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
