import type { UserRepository } from "../../domain/repository/UserRepository";
import { FirebaseDataSource } from "../datasource/FirebaseDataSource";
import { User } from "../../domain/model/User";

export class UserRepositoryFirebase implements UserRepository {
  private dataSource = new FirebaseDataSource();

  async updateUserProfile(userId: string, tempUser: User): Promise<void> {
    await this.dataSource.updateUserProfile(userId, tempUser);
  }

}