import React, { createContext, useContext, useEffect, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { getMe, syncSession } from "../api/auth";
import { auth, firebaseReady, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

function extractUser(response) {
  return response?.user ?? response?.data?.user ?? null;
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const idToken = await nextUser.getIdToken();
        setToken(idToken);
        const response = await getMe();
        setUser(extractUser(response));
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const syncCurrentUser = async (profile = {}) => {
    if (!auth?.currentUser) {
      throw new Error("No Firebase session is active.");
    }
    const response = await syncSession(profile);
    const appUser = extractUser(response);
    setFirebaseUser(auth.currentUser);
    setUser(appUser);
    setToken(await auth.currentUser.getIdToken());
    setLoading(false);
    return appUser;
  };

  const ensureAppProfile = async (profile = {}) => {
    try {
      const response = await getMe();
      const appUser = extractUser(response);
      if (!appUser) {
        throw new Error("Missing Fundingwise profile");
      }
      setUser(appUser);
      setToken(await auth.currentUser.getIdToken());
      return appUser;
    } catch {
      return syncCurrentUser(profile);
    }
  };

  const login = async (email, password) => {
    if (!firebaseReady || !auth) {
      throw new Error("Firebase auth is not configured yet.");
    }
    const response = await signInWithEmailAndPassword(auth, email, password);
    try {
      setFirebaseUser(response.user);
      const appUser = await ensureAppProfile({
        name: response.user.displayName || response.user.email?.split("@")[0] || "Fundingwise User",
      });
      return { user: appUser, firebaseUser: response.user };
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  };

  const signInWithGoogle = async (profile = {}) => {
    if (!firebaseReady || !auth || !googleProvider) {
      throw new Error("Google sign-in is not configured yet.");
    }
    const response = await signInWithPopup(auth, googleProvider);
    try {
      setFirebaseUser(response.user);
      const appUser = await ensureAppProfile({
        name: response.user.displayName || response.user.email?.split("@")[0] || "Fundingwise User",
        role: profile.role || "citizen",
        organization_id: profile.organization_id || null,
      });
      return { user: appUser, firebaseUser: response.user };
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  };

  const register = async (payload) => {
    if (!firebaseReady || !auth) {
      throw new Error("Firebase auth is not configured yet.");
    }
    const response = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    await updateProfile(response.user, { displayName: payload.name });
    try {
      const appUser = await syncCurrentUser({
        name: payload.name,
        role: payload.role,
        organization_id: payload.organization_id || null,
      });
      return { user: appUser, firebaseUser: response.user };
    } catch (error) {
      await response.user.delete().catch(() => {});
      await signOut(auth);
      throw error;
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, token, loading, login, loginWithGoogle: signInWithGoogle, logout, register, syncCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
