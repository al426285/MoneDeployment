import { User } from "../../domain/model/User";
export interface UserRepository {
  
  updateUserProfile(userId: string, tempUser: User): Promise<void>;
  
}