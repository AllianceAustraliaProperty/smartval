import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/User';
import { requireAuth } from '@/lib/route-auth';
import { updateFirebaseUser } from '@/lib/firebase-admin';

// Helper to check if caller is an admin
async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error, user: null };
  if (auth.user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }
  return { error: null, user: auth.user };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    const firebaseUid = id;
    
    const data = await req.json();
    const { name, username, password, isActive } = data;

    await connectDB();
    
    // Find existing user in MongoDB
    const existingUser = await User.findOne({ firebaseUid });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If username changed, ensure it's not taken
    let cleanUsername = existingUser.username;
    if (username && username.toLowerCase().trim() !== existingUser.username) {
      cleanUsername = username.toLowerCase().trim();
      const usernameTaken = await User.findOne({ username: cleanUsername });
      if (usernameTaken) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
    }

    // 1. Update Firebase Auth (password, name, active status)
    const firebaseUpdateData: any = {};
    if (name) firebaseUpdateData.displayName = name;
    if (password) firebaseUpdateData.password = password;
    if (isActive !== undefined) firebaseUpdateData.disabled = !isActive; // disabled in Firebase is opposite of isActive
    
    if (Object.keys(firebaseUpdateData).length > 0) {
      await updateFirebaseUser(firebaseUid, firebaseUpdateData);
    }

    // 2. Update MongoDB
    existingUser.displayName = name || existingUser.displayName;
    existingUser.username = cleanUsername;
    if (isActive !== undefined) existingUser.isActive = isActive;
    
    await existingUser.save();

    return NextResponse.json({
      id: existingUser.firebaseUid,
      name: existingUser.displayName,
      email: existingUser.email,
      username: existingUser.username,
      role: existingUser.role,
      isActive: existingUser.isActive
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
