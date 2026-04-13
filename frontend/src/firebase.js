import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth;
let googleProvider;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_key") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export function isFirebaseConfigured() {
  return app !== undefined && auth !== undefined;
}

export async function signInWithGoogle() {
  if (!app || !auth || !googleProvider) {
    throw new Error("Google Sign-In is not configured. Please set up Firebase credentials.");
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      email: user.email,
      name: user.displayName,
      google_id: user.uid,
      photo_url: user.photoURL
    };
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}