import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession();
    return NextResponse.json({
      isAuthenticated: !!session,
      session
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      isAuthenticated: false,
      error: 'Failed to check authentication status'
    }, { status: 500 });
  }
}
