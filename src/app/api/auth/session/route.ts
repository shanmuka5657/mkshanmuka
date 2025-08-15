
import {NextRequest, NextResponse} from 'next/server';
import {initializeApp, getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}
const adminAuth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
        return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // Verify the ID token and get user data.
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Set session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const options = {
      name: '__session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };
    
    const response = NextResponse.json({ status: 'success', uid }, { status: 200 });
    response.cookies.set(options);
    
    return response;

  } catch (error: any) {
    const errorMessage = error.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
    const options = {
        name: '__session',
        value: '',
        maxAge: -1,
    };

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);

    return response;
}
