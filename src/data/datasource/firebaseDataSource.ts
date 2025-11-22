import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import {
 
} from "firebase/auth";

const db = getFirestore(firebaseApp);

export class FirebaseDataSource {
  private userCollection = collection(db, "users");

  async getUserById(userId: string): Promise<User | null> {
    const ref = doc(db, "users", userId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as any;
    // Construye la entidad de dominio User (no guardamos password en Firestore)
    const user = new User(data.email ?? "", data.nickname ?? "");
    return user;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const q = query(this.userCollection, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch {
      return null;
    }
  }

  // rename parameter to avoid shadowing the imported class
  async saveUser(userId: string, user: User): Promise<string> {
    const ref = doc(db, "users", userId);
    await setDoc(
      ref,
      {
        email: user.getEmail(),
        nickname: user.getNickname(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return userId;
  }

  async updateUserProfile(userId: string, tempUser: User): Promise<void> {
    const ref = doc(db, "users", userId.trim());
    const payload = {
      email: tempUser.getEmail(),
      nickname: tempUser.getNickname(),
    };
    await updateDoc(ref, payload);
  }

}