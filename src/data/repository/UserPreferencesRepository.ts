import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../core/config/firebaseConfig";
import type { UserPreferences } from "../../domain/model/UserPreferences";
import type { UserPreferencesRepositoryInterface } from "../../domain/repository/UserPreferencesRepositoryInterface";

export class UserPreferencesRepository implements UserPreferencesRepositoryInterface {
  async getPreferences(userId: string): Promise<Partial<UserPreferences> | null> {
    const ref = doc(db, "users", userId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return (data?.preferences ?? null) as Partial<UserPreferences> | null;
  }

  async savePreferences(userId: string, preferences: UserPreferences): Promise<void> {
    await setDoc(doc(db, "users", userId), { preferences }, { merge: true });
  }
}
