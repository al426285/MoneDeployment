import type { UserRepository } from "../../domain/repository/UserRepository";
import { FirebaseDataSource } from "../datasource/FirebaseDataSource";
import { User } from "../../domain/model/User";

export class UserRepositoryFirebase implements UserRepository {
  private dataSource = new FirebaseDataSource();

  async getUserById(userId: string): Promise<User | null> {
    return await this.dataSource.getUserById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.dataSource.getUserByEmail(email);
  }

  async saveUser(userId: string, tempUser: User): Promise<void> {
    await this.dataSource.saveUser(userId, tempUser);
  }
  
}