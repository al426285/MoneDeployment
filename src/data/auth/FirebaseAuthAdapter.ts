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
  

 async deleteUser(userId: string): Promise<void> {
    const ref = doc(db, "users", userId);
    try {
      await deleteDoc(ref);
    } catch (error) {
      throw new Error(error as Error);
    }
  }


  
}
  async logIn(email: string, password: string): Promise<UserSession> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const token = await userCredential.user.getIdToken();
    
      const session = new UserSession(userCredential.user.uid, token);
      session.saveToCache(); // utiliza el helper centralizado

      return session;
    } catch (Error) {
      throw handleAuthError(Error as FirebaseError);
    }
  }

  async googleSignIn(): Promise<UserSession> {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(this.auth, provider);
      const token = await userCredential.user.getIdToken();
      const session = new UserSession(userCredential.user.uid, token);
      return session;
    } catch (Error) {
            throw handleAuthError(Error as FirebaseError);
    }
  }

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
