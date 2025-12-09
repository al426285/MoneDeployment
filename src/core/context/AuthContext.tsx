import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { UserSession } from "../../domain/session/UserSession";

interface AuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: UserSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toAuthUser = (firebaseUser: FirebaseUser | null): AuthUser | null => {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
};

const sessionFromFirebaseUser = async (firebaseUser: FirebaseUser | null): Promise<UserSession | null> => {
  if (!firebaseUser) return null;
  const token = await firebaseUser.getIdToken();
  return new UserSession(firebaseUser.uid, token);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = UserSession.loadFromCache();
    if (!cached?.userId) return null;
    return { uid: cached.userId, email: undefined, displayName: undefined };
  });
  const [session, setSession] = useState<UserSession | null>(() => UserSession.loadFromCache());
  const [loading, setLoading] = useState(true);

  const syncState = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const nextSession = await sessionFromFirebaseUser(firebaseUser);
      if (nextSession) {
        if (typeof nextSession.saveToCache === "function") {
          nextSession.saveToCache();
        }
        setSession(nextSession);
        setUser(toAuthUser(firebaseUser));
        return;
      }
    }
    UserSession.clear();
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await syncState(firebaseUser);
      setLoading(false);
    });
    return () => {
      unsubscribe();
    };
  }, [syncState]);

  const refreshSession = useCallback(async () => {
    await syncState(auth.currentUser);
  }, [syncState]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isAuthenticated: Boolean(session?.userId),
    refreshSession,
  }), [user, session, loading, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
