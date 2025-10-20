import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    const user = await whopSdk.users.getUser({ userId });
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      whopUserId: user.id
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 401 }
    );
  }
}

