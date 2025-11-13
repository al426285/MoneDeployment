import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import type { UserRepository } from "../../domain/repository/UserRepository";

const db = getFirestore(firebaseApp);

export class FirebaseDataSource {
  private userCollection = collection(db, "users");

  async getUserById(id: string): Promise<User | null> {
    const ref = doc(db, "users", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as any;
    // Construye la entidad de dominio User (no guardamos password en Firestore)
    const user = new User(data.email ?? "", data.nickname ?? "", "");
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(this.userCollection, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as any;
    const user = new User(data.email ?? "", data.nickname ?? "", "");
    return user;
  }

  // Ahora recibimos el id (uid) por separado y la entidad de dominio User
  async saveUser(id: string, user: User): Promise<void> {
    const ref = doc(db, "users", id);
    await setDoc(
      ref,
      {
        email: user.getEmail(),
        nickname: user.getNickname(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async updateUser(id: string, user: User): Promise<void> {
    const ref = doc(db, "users", id);
    const payload = {
      email: user.getEmail(),
      nickname: user.getNickname()
    };
    await updateDoc(ref, payload);
  }

  async deleteUser(id: string): Promise<void> {
    const ref = doc(db, "users", id);
    await deleteDoc(ref);
  }
  async getRegisteredUsers(): Promise<Array<User>> {
    const db = getFirestore(firebaseApp);
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    const users: User[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as any;
      return new User(data.email ?? "", data.nickname ?? "", "");
    });
    return users;
  }
}
