import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, GoogleAuthProvider, getAuth, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
};

const hasFirebaseConfig =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId);

export const firebaseApp = hasFirebaseConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = auth ? new GoogleAuthProvider() : null;
export const firebaseReady = Boolean(auth);

if (auth) {
  googleProvider?.setCustomParameters?.({ prompt: "select_account" });
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // The SDK will still manage auth state without local persistence if needed.
  });
}
