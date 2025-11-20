import { User } from "../../domain/model/User";
export interface UserRepository {
  getUserById(id: string): Promise<User | null> ;

  getUserByEmail(email: string): Promise<User | null>;

  saveUser(id: string, user: User): Promise<void>;
}