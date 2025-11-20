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
  sendPasswordResetEmail,
  type ActionCodeSettings,
} from "firebase/auth";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import { UserSession } from "../../domain/session/UserSession";

export class FirebaseAuthAdapter implements AuthProvider {
  private auth = getAuth(firebaseApp);
  async signUp(user: User, password: string): Promise<string> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        user.getEmail(),
        password
      );
      const fbUserId = userCredential.user.uid;
      return fbUserId;
    } catch (Error) {
        throw handleAuthError(Error as FirebaseError);
    }
  }
}