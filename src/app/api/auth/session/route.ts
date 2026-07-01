import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token || 'mock.jwt.token';
    const email = body.email || 'mock@example.com';
    const name = body.name || 'Mock User';

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Set to SameSite=None; Secure; Domain=.dhkinnovations.com in production if configured
    });

    return NextResponse.json({
      token,
      user: {
        id: 'mock-user-id',
        name,
        email,
        workspaceId: 'mock-ws-id',
      },
      workspace: {
        id: 'mock-ws-id',
        name: 'Mock Workspace',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process session' }, { status: 500 });
  }
}
