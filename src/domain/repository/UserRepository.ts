import { User } from "../../domain/model/User";

export interface UserRepository {
  getUserById(id: string): Promise<User | null>;

  deleteUser(email: string): Promise<{ id: string; [key: string]: any } | null>;
  getUserByEmail(email: string): Promise<User | null>;
  saveUser(id: string, user: User): Promise<void>;
  updateUserProfile(userId: string, tempUser: User): Promise<void>;
  updateUserPassword(currentPassword: string, newPassword: string): Promise<boolean>;
}