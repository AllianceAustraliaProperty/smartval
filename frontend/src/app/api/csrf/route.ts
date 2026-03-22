import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  try {
    // Generate a simple CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error('CSRF API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 