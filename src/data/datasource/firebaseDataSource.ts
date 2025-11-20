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

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(this.userCollection, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as any;
    const user = new User(data.email ?? "", data.nickname ?? "");
    return user;
  }

  async saveUser(userId: string, User: User): Promise<string> {
    const ref = doc(db, "users", userId);
    await setDoc(
      ref,
      {
        email: User.getEmail(),
        nickname: User.getNickname(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return userId;
  }
}