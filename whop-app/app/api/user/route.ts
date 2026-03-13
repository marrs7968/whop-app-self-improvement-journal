import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const userId = tokenPayload.userId;

    const tokenName =
      (tokenPayload as any).name ??
      (tokenPayload as any).displayName ??
      (tokenPayload as any).fullName ??
      (tokenPayload as any).username ??
      null;
    const tokenUsername =
      (tokenPayload as any).username ??
      (tokenPayload as any).userName ??
      null;

    try {
      const user = await whopSdk.users.getUser({ userId });

      return NextResponse.json({
        id: user.id,
        name: user.name || tokenName || tokenUsername || 'User',
        username: user.username || tokenUsername || null,
        whopUserId: user.id
      });
    } catch (sdkError) {
      console.error('Error fetching user via users.getUser, falling back to token payload:', sdkError);
      return NextResponse.json({
        id: userId,
        name: tokenName || tokenUsername || 'User',
        username: tokenUsername || null,
        whopUserId: userId
      });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 401 }
    );
  }
}

