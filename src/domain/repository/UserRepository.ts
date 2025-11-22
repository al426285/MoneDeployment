import { User } from "../../domain/model/User";

export interface UserRepository {
  getUserById(id: string): Promise<User | null>;
  deleteUser(userId: string): Promise<void> ;
  getUserByEmail(email: string): Promise<User | null>;
  saveUser(id: string, user: User): Promise<void>;
  updateUserProfile(userId: string, tempUser: User): Promise<void>;
}