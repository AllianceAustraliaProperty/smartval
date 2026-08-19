import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { loginId } = await req.json();

    if (!loginId || typeof loginId !== 'string') {
      return NextResponse.json({ error: 'Login ID is required' }, { status: 400 });
    }

    // If it's already an email (contains @), just return it back to the client immediately
    if (loginId.includes('@')) {
      return NextResponse.json({ email: loginId.toLowerCase().trim() });
    }

    // Otherwise, treat it as a username and look it up in MongoDB
    await connectDB();
    const username = loginId.toLowerCase().trim();
    
    // We only select the email field to prevent exposing other data to unauthenticated users
    const user = await User.findOne({ username, isActive: true }).select('email').lean();

    if (!user || !user.email) {
      // If no username exists, return a 404
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ email: user.email });

  } catch (error) {
    console.error('Username lookup error:', error);
    // Generic error to prevent info leakage
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
