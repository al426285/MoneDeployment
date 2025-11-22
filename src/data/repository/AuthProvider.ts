import { UserSession } from "../../domain/session/UserSession";
import { User } from "../../domain/model/User";
import { type ActionCodeSettings } from "firebase/auth";
export interface AuthProvider {
  sendPasswordResetLink(email: string,actionCodeSettings?: ActionCodeSettings): Promise<void>;
  changeUserPassword(currentPassword: string | null,newPassword: string,oobCode?: string): Promise<void>;
}