import { UserSession } from "../../domain/session/UserSession";
import { User } from "../../domain/model/User";
import type { ActionCodeSettings } from "firebase/auth";
export interface AuthProvider {
  signUp(user: User, password: string): Promise<string>;
  logIn(email: string, password: string): Promise<UserSession>;
  googleSignIn(): Promise<UserSession>;
  updateUserEmail(
    userId: string,
    newEmail: string,
    currentPassword: string,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void>;
  canUpdateEmail(userId: string): Promise<boolean>;
  sendRecoveryEmail(email: string): Promise<void>;
  logOut(): Promise<void>;
}
