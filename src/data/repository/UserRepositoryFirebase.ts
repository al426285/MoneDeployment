import type { UserRepository } from "../../domain/repository/UserRepository";
import { FirebaseDataSource } from "../datasource/firebaseDataSource";
import { User } from "../../domain/model/User";

export class UserRepositoryFirebase implements UserRepository {
  private dataSource = new FirebaseDataSource();
  
  async deleteUser(email: string): Promise<{ id: string; [key: string]: any } | null> {
    return await this.dataSource.deleteUser(email);
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

  async updateUserPassword(currentPassword: string, newPassword: string): Promise<boolean> {
    return await this.dataSource.changePasswordWithCurrent(currentPassword, newPassword);
  }
}