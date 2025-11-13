import type { UserRepository } from "../../domain/repository/UserRepository";
import { FirebaseDataSource } from "../datasource/firebaseDataSource";
import { User } from "../../domain/model/User";

export class UserRepositoryFirebase implements UserRepository {
  private dataSource = new FirebaseDataSource();

  async getUserById(id: string): Promise<User | null> {
    return await this.dataSource.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.dataSource.getUserByEmail(email);
  }

  async saveUser(id: string, user: User): Promise<void> {
    await this.dataSource.saveUser(id, user);
  }

  async updateUserProfile(email: string, tempUser: User): Promise<void> {
    await this.dataSource.updateUser(email, tempUser);
  }

  async deleteUser(id: string): Promise<void> {
    await this.dataSource.deleteUser(id);
  }
  async getRegisteredUsers(): Promise<Array<User>>{
    return await this.dataSource.getRegisteredUsers();
  }
}