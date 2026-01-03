import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../core/config/firebaseConfig";
import type { UserDefaultOptions } from "../../domain/model/UserDefaultOptions";
import type { UserDefaultOptionsRepositoryInterface } from "../../domain/repository/UserDefaultOptionsRepositoryInterface";

export class UserDefaultOptionsRepository implements UserDefaultOptionsRepositoryInterface {
    async getDefaultOptions(userId: string): Promise<Partial<UserDefaultOptions> | null> {
        const ref = doc(db, "users", userId);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return (data?.defaultOptions ?? null) as Partial<UserDefaultOptions> | null;
    }

    async saveDefaultOptions(userId: string, options: UserDefaultOptions): Promise<void> {
        const ref = doc(db, "users", userId);
        await setDoc(ref, { defaultOptions: options }, { merge: true });
    }
}
