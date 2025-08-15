
import {NextRequest, NextResponse} from 'next/server';
import {initializeApp, getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {auth} from '@/lib/firebase'; // Client-side auth
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}
const adminAuth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    let idToken;
    let user;

    if (type === 'google') {
        idToken = body.idToken;
        user = (await adminAuth.verifyIdToken(idToken)).uid;
    } else {
        const { email, password } = body;
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }
        
        let userCredential;
        if (type === 'login') {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else if (type === 'signup') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
            return NextResponse.json({ error: 'Invalid authentication type.' }, { status: 400 });
        }
        
        user = userCredential.user;
        idToken = await userCredential.user.getIdToken();
    }

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
    
    const response = NextResponse.json({ status: 'success', user }, { status: 200 });
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
