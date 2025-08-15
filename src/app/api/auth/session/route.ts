
import {NextRequest, NextResponse} from 'next/server';
import {initializeApp, getApps, App} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

// --- Robust Singleton Pattern for Firebase Admin Initialization ---
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0];
}
const adminAuth = getAuth(adminApp);


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
        return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    // This route now correctly expects a real ID Token from the client.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const options = {
      name: '__session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    
    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);
    
    return response;

  } catch (error: any) {
    console.error("Session creation error:", error);
    const errorMessage = error.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : 'An unknown error occurred while creating the session.';
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
    const options = {
        name: '__session',
        value: '',
        maxAge: -1,
        path: '/',
    };

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);

    return response;
}
