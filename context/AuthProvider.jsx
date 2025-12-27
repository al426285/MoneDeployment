import { useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useEnergyPriceBootstrap } from "../hooks/useEnergyPriceBootstrap";
import { AuthContext } from "./AuthContext";
import { UserSession } from "../src/domain/session/UserSession";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        // Guardar userId en la caché local (sin tokens sensibles)
        try {
          const session = new UserSession(u.uid, "");
          session.saveToCache();
        } catch (err) {
          // ignore
        }

        try {
          UserSession.saveProfileToCache({
            userId: u.uid,
            email: u.email,
            nickname: u.displayName,
            cachedAt: Date.now(),
          });
        } catch (err) {
          // ignore
        }
      } else {
        // usuario desconectado: limpiar la caché local
        try {
          UserSession.clear();
        } catch (err) {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEnergyPriceBootstrap(Boolean(user));

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
