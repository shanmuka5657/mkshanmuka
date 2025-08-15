
import {NextRequest, NextResponse} from 'next/server';
import {initializeApp, getApps, App} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import { auth } from '@/lib/firebase'; // Client SDK
import { signInWithCustomToken } from 'firebase/auth';

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

    // For server-side flow, the token is a custom token, not an ID token.
    // We need to sign in with it on the client to get an ID token.
    // The logic is getting convoluted because of the network issue.
    // Let's assume the token from the server action IS an ID token for now,
    // which is incorrect but required to proceed with session cookie creation.
    // The correct flow is: client signs in -> gets ID Token -> sends to this route.
    // But since client sign-in fails, we try server-action -> custom token -> client sign in with token -> get id token -> this route.

    // Let's simplify. Let's assume the token IS an ID token for cookie creation.
    // This is what would happen if the client-side login worked.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    // The token from our server action is a custom token, not an ID token.
    // `createSessionCookie` requires an ID token.
    // This means the client MUST use `signInWithCustomToken` with the token from the server action,
    // THEN get the `idToken` from the result, and POST it here.
    // The login page must be updated to do this.

    // Let's adjust the login page to perform this flow.
    // And this route will now correctly expect a real ID Token.
    
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
    // Provide a more specific error message if available
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
