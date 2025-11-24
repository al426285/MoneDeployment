import type { UserRepository } from "../../domain/repository/UserRepository";
import { FirebaseDataSource } from "../datasource/firebaseDataSource";
import { User } from "../../domain/model/User";

export class UserRepositoryFirebase implements UserRepository {
  private dataSource = new FirebaseDataSource();
  
  async deleteUser(userId: string): Promise<void> {
    await this.dataSource.deleteUser(userId);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.dataSource.getUserById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.dataSource.getUserByEmail(email);
  }

  async saveUser(userId: string, tempUser: User): Promise<void> {
    await this.dataSource.saveUser(userId, tempUser);
  }

  async updateUserProfile(userId: string, tempUser: User): Promise<void> {
    await this.dataSource.updateUserProfile(userId, tempUser);
  }
}