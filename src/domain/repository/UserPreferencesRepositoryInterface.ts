import type { UserPreferences } from "../model/UserPreferences";

export interface UserPreferencesRepositoryInterface {
  getPreferences(userId: string): Promise<Partial<UserPreferences> | null>;
  savePreferences(userId: string, preferences: UserPreferences): Promise<void>;
}
