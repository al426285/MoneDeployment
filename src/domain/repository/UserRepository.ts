import { User } from "../../domain/model/User";
export interface UserRepository {
  getUserById(id: string): Promise<User | null> ;

  getUserByEmail(email: string): Promise<User | null>;

  saveUser(id: string, user: User): Promise<void>;
  
  updateUserProfile(email: string, tempUser: User): Promise<void>;

  deleteUser(id: string): Promise<void> ;
  
  getRegisteredUsers(): Promise<Array<User>>;
}