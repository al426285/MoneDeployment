import type { AuthProvider } from "../../domain/repository/AuthProvider";

import { FirebaseError } from "firebase/app";
import { handleAuthError } from "../../core/utils/exceptions";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  confirmPasswordReset,
  sendPasswordResetEmail, verifyBeforeUpdateEmail,

} from "firebase/auth";

import { firebaseApp, auth, googleProvider } from "../../core/config/firebaseConfig";
import { UserSession } from "../../domain/session/UserSession";
import type { ActionCodeSettings, deleteUser as fbDeleteUser } from "firebase/auth";
import { User } from "../../domain/model/User";
import { doc, deleteDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const db = getFirestore(firebaseApp);


export class FirebaseAuthAdapter implements AuthProvider {
  private auth = auth;

  async deleteUser(userId: string): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
      throw new Error("RequiresRecentLogin");
    }

    // 1. Eliminar de Firebase Authentication
    try {
      await fbDeleteUser(currentUser);
    } catch (error) {
      throw handleAuthError(error as FirebaseError);
    }

    // 2. Eliminar perfil de Firestore
    try {
      const ref = doc(db, "users", userId);
      await deleteDoc(ref);
    } catch (error) {
      console.error("Firestore cleanup failed", error);
    }

    // 3. Limpiar sesión local
    UserSession.clear();

  }

  async logIn(email: string, password: string): Promise<UserSession> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email.trim(), password.trim());
      const token = await userCredential.user.getIdToken();
      const session = new UserSession(userCredential.user.uid, token);
      if (typeof session.saveToCache === "function") session.saveToCache();
      return session;
    } catch (err) {
      try { //console.debug("[FirebaseAuthAdapter.logIn] code:", (err as any)?.code, "message:", (err as any)?.message);
      } catch {
        // ignore
      }
      handleAuthError(err as FirebaseError);
    }
  }
  async logOut(): Promise<void> {
    const session = UserSession.loadFromCache();
    if (!session || !session.userId) {
      throw new Error("RequiresRecentLogin");
    }
    try {
      await signOut(this.auth);
      UserSession.clear();
      // console.log("logged out")
    } catch (Error) {
      throw handleAuthError(Error as FirebaseError);
    }
  }

  async googleSignIn(): Promise<UserSession> {
    try {
      const provider = googleProvider;
      const userCredential = await signInWithPopup(this.auth, provider);
      const token = await userCredential.user.getIdToken();
      const session = new UserSession(userCredential.user.uid, token);
      if (typeof session.saveToCache === "function") session.saveToCache();

      // guardar perfil en cache (opcional, ya discutido)
      try {
        const profile = { userId: session.userId, email: userCredential.user.email ?? "", nickname: userCredential.user.displayName ?? "", cachedAt: Date.now() };
        if (typeof (UserSession as any).saveProfileToCache === "function") (UserSession as any).saveProfileToCache(profile);
        else localStorage.setItem("user_profile", JSON.stringify(profile));
      } catch { /* ignore */ }

      return session;
    } catch (err) {
      handleAuthError(err as FirebaseError);
    }
  }

  async signUp(user: User, password: string): Promise<string> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, user.getEmail(), password);
      return userCredential.user.uid;
    } catch (err) {
      handleAuthError(err as FirebaseError);
    }
  }

  async updateUserEmail(
    userId: string,
    newEmail: string,
    currentPassword: string,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) throw new Error("RequiresRecentLogin");
      const credential = EmailAuthProvider.credential(currentUser.email ?? "", currentPassword ?? "");
      await reauthenticateWithCredential(currentUser, credential);
      await verifyBeforeUpdateEmail(currentUser, newEmail.trim(), actionCodeSettings);
    } catch (err) {
      handleAuthError(err as FirebaseError);
    }
  }

  async canUpdateEmail(userId: string): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) return true;
      await currentUser.reload();
      const providerIds = (currentUser.providerData ?? [])
        .map((provider) => provider?.providerId)
        .filter((id): id is string => Boolean(id));
      if (!providerIds.length) return true;
      return providerIds.includes(EmailAuthProvider.PROVIDER_ID);
    } catch {
      return true;
    }
  }



  async sendRecoveryEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      handleAuthError(error as FirebaseError);
    }
  }
}

/*
 async changeUserPassword(
    currentPassword: string | null,
    newPassword: string,
    oobCode?: string // código del enlace enviado por email
  ): Promise<void> {
    const auth = getAuth(firebaseApp);

    // Usuario vino desde el email
    if (oobCode) {
      try {
        await confirmPasswordReset(auth, oobCode, newPassword);
        return;
      } catch (Error) {
        throw handleAuthError(Error as FirebaseError);
      }
    }

    // Usuario autenticado que proporciona la contraseña actual
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    const email = user.email;
    if (!email) {
      throw new Error("Email del usuario no disponible para reautenticación");
    }

    if (!currentPassword) {
      throw new Error("Se requiere la contraseña actual para cambiarla");
    }

    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
>>>>>>> it-01
    } catch (Error) {
      throw handleAuthError(Error as FirebaseError);
    }
  }


  async sendPasswordResetLink(
    email: string,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void> {
    const auth = getAuth(firebaseApp);
    try {
      if (actionCodeSettings) {
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
      } else {
        await sendPasswordResetEmail(auth, email);
      }
    } catch (Error) {
      throw handleAuthError(Error as FirebaseError);
    }
  }
*/

